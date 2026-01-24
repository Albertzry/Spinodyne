import os
import uuid
import glob
import shutil
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel, Session, create_engine, select

from app.core.config import settings
from app.models.task import Task
from app.worker import predict_spine

# 初始化 FastAPI
app = FastAPI(title=settings.PROJECT_NAME)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,  # 使用配置中的 Origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据库连接
engine = create_engine(settings.DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# 挂载静态文件目录 (用于前端访问生成的图片/JSON)
# 访问 URL: http://localhost:8000/static/uploads/{task_uid}/...
app.mount("/static", StaticFiles(directory="/root/Spinodyne/data"), name="static")

def get_session():
    with Session(engine) as session:
        yield session

@app.post("/api/predict")
async def create_prediction_task(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    上传医学影像文件并启动推理任务
    """
    # 1. 生成唯一任务 ID
    task_uid = str(uuid.uuid4())
    
    # 2. 创建任务目录
    task_dir = os.path.join(settings.BASE_UPLOAD_DIR, task_uid)
    os.makedirs(task_dir, exist_ok=True)
    
    # 3. 保存上传的文件
    # 假设文件扩展名为 .nii.gz 或 .nii
    filename = file.filename
    if not filename.endswith((".nii.gz", ".nii")):
        # 简单校验，实际项目中应更严格
        pass 
        
    save_path = os.path.join(task_dir, "raw.nii.gz") # 统一重命名为 raw.nii.gz 以方便处理
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 4. 创建数据库记录
    new_task = Task(
        uid=task_uid,
        status="pending",
        input_file_path=save_path,
        output_dir_path="" # 稍后更新
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    
    # 5. 触发 Celery 任务 (异步)
    predict_spine.delay(task_uid)
    
    return {"task_uid": task_uid, "status": "pending"}

def find_file_url(base_dir: str, pattern: str, url_prefix: str) -> Optional[str]:
    """Helper to find a file matching pattern and return its static URL"""
    files = glob.glob(os.path.join(base_dir, pattern))
    if files:
        # Get relative path from base upload dir to construct URL
        # file path: /root/Spinodyne/data/uploads/{task_uid}/...
        # relative: {task_uid}/...
        rel_path = os.path.relpath(files[0], settings.BASE_UPLOAD_DIR)
        return f"{url_prefix}/{rel_path}"
    return None

def find_images_urls(base_dir: str, url_prefix: str) -> List[str]:
    """Helper to find all images in a directory (recursively)"""
    if not os.path.exists(base_dir):
        return []
    
    images = []
    # Match common image formats recursively
    for ext in ['**/*.png', '**/*.jpg', '**/*.jpeg']:
        files = glob.glob(os.path.join(base_dir, ext), recursive=True)
        for f in files:
            rel_path = os.path.relpath(f, settings.BASE_UPLOAD_DIR)
            images.append(f"{url_prefix}/{rel_path}")
    return sorted(images)

@app.get("/api/status/{task_uid}")
async def get_task_status(task_uid: str, session: Session = Depends(get_session)):
    """
    查询任务状态 (仅状态)
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {
        "uid": task.uid,
        "status": task.status,
        "created_at": task.created_at,
        "finished_at": task.finished_at,
    }

@app.get("/api/result/3d/{task_uid}")
async def get_task_3d_volumes(task_uid: str, session: Session = Depends(get_session)):
    """
    获取 3D 可视化文件 (NIfTI)
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="Task not found or not completed")

    task_dir = os.path.dirname(task.input_file_path)
    url_prefix = "/static/uploads"
    
    # 返回 URL 列表，前端 Niivue 会去请求这些 URL
    return {
        "base": f"{url_prefix}/{task_uid}/raw.nii.gz",
        "mask_structure": find_file_url(os.path.join(task_dir, "infer_output/step2_output"), "raw.nii.gz", url_prefix),
        "mask_ldh": find_file_url(os.path.join(task_dir, "infer_output/ldh_output"), "raw.nii.gz", url_prefix)
    }

@app.get("/api/result/nifti/{task_uid}/{type}")
@app.get("/api/result/nifti/{task_uid}/{type}.nii.gz")
async def get_nifti_file(task_uid: str, type: str, session: Session = Depends(get_session)):
    """
    直接返回 NIfTI 文件流
    type: base, structure, ldh
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="Task not found")

    task_dir = os.path.dirname(task.input_file_path)
    # task.input_file_path 是 /root/Spinodyne/data/uploads/{uid}/raw.nii.gz
    # task_dir 是 /root/Spinodyne/data/uploads/{uid}
    
    file_path = None
    if type == "base":
        file_path = os.path.join(task_dir, "raw.nii.gz")
    elif type == "structure":
        file_path = os.path.join(task_dir, "infer_output", "step2_output", "raw.nii.gz")
    elif type == "ldh":
        file_path = os.path.join(task_dir, "infer_output", "ldh_output", "raw.nii.gz")
        
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="NIfTI file not found")
        
    return FileResponse(
        file_path, 
        media_type="application/gzip",
        filename=os.path.basename(file_path)
    )

@app.get("/api/result/report/{task_uid}")
async def get_task_report(task_uid: str, session: Session = Depends(get_session)):
    """
    获取临床报告数据 (JSON)
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="Task not found or not completed")
        
    return task.result_json

@app.get("/api/result/images/{task_uid}")
async def get_task_images(task_uid: str, session: Session = Depends(get_session)):
    """
    获取分析图片路径
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="Task not found or not completed")

    task_dir = os.path.dirname(task.input_file_path)
    url_prefix = "/static/uploads"
    result_preview_dir = os.path.join(task_dir, "result/raw/preview")
    
    return {
        "vis_2d_fallback": {
            "step2": find_file_url(os.path.join(task_dir, "infer_output/preview/step2"), "*.jpg", url_prefix),
            "ldh": find_file_url(os.path.join(task_dir, "infer_output/preview/ldh"), "*.jpg", url_prefix)
        },
        "analysis_images": {
            "angles": find_images_urls(os.path.join(result_preview_dir, "angles"), url_prefix),
            "geometry": find_images_urls(os.path.join(result_preview_dir, "geometry"), url_prefix),
            "herniation": find_images_urls(os.path.join(result_preview_dir, "herniation"), url_prefix),
            "intensity": find_images_urls(os.path.join(result_preview_dir, "intensity"), url_prefix)
        }
    }

@app.get("/api/result/image/{task_uid}")
async def get_task_image(
    task_uid: str, 
    category: str, 
    subcategory: Optional[str] = None, 
    item_id: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    按需获取特定的分析图片
    category: angles, geometry, herniation, intensity
    subcategory: cobb, disc_inclination, disc_metrics, vertebral_ap_diameter, vertebral_height (optional)
    item_id: L1, L1-L2, LL, etc. (optional)
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="Task not found or not completed")

    task_dir = os.path.dirname(task.input_file_path)
    preview_dir = os.path.join(task_dir, "result/raw/preview")
    
    # Construct file path based on parameters
    file_path = None
    
    if category == "herniation":
        file_path = os.path.join(preview_dir, "herniation", "ldh_PD_PA_PAR_PLR.png")
        
    elif category == "intensity":
        file_path = os.path.join(preview_dir, "intensity", "agl_discs.png")
        
    elif category == "angles":
        if subcategory == "cobb":
            if not item_id: raise HTTPException(status_code=400, detail="item_id required for cobb angles")
            file_path = os.path.join(preview_dir, "angles", "cobb", f"angle_{item_id}.png")
        elif subcategory == "disc_inclination":
            if not item_id: raise HTTPException(status_code=400, detail="item_id required for disc_inclination")
            file_path = os.path.join(preview_dir, "angles", "disc_inclination", f"dia_{item_id}.png")
            
    elif category == "geometry":
        if not item_id: raise HTTPException(status_code=400, detail="item_id required for geometry metrics")
        
        if subcategory == "disc_metrics":
            file_path = os.path.join(preview_dir, "geometry", "disc_metrics", f"disc_metrics_{item_id}.png")
        elif subcategory == "vertebral_ap_diameter":
            file_path = os.path.join(preview_dir, "geometry", "vertebral_ap_diameter", f"vertebra_ap_{item_id}.png")
        elif subcategory == "vertebral_height":
            file_path = os.path.join(preview_dir, "geometry", "vertebral_height", f"vh_{item_id}.png")
            
    if not file_path or not os.path.exists(file_path):
        # Return a placeholder or 404. For now 404.
        # Frontend should handle 404 gracefully (e.g. show "No Image")
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(file_path)

@app.get("/")
def read_root():
    return {"message": "Welcome to Spinodyne API"}
