import os
import uuid
import glob
import shutil
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
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
    """Helper to find all images in a directory"""
    if not os.path.exists(base_dir):
        return []
    
    images = []
    # Match common image formats
    for ext in ['*.png', '*.jpg', '*.jpeg']:
        files = glob.glob(os.path.join(base_dir, ext))
        for f in files:
            rel_path = os.path.relpath(f, settings.BASE_UPLOAD_DIR)
            images.append(f"{url_prefix}/{rel_path}")
    return sorted(images)

@app.get("/api/status/{task_uid}")
async def get_task_status(task_uid: str, session: Session = Depends(get_session)):
    """
    查询任务状态和结果
    """
    statement = select(Task).where(Task.uid == task_uid)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    response = {
        "uid": task.uid,
        "status": task.status,
        "created_at": task.created_at,
        "finished_at": task.finished_at,
    }
    
    # 如果任务成功，构建完整的结果 JSON 结构
    if task.status == "success":
        task_dir = os.path.dirname(task.input_file_path)
        url_prefix = "/static/uploads"
        
        # 1. 3D Visualization Files
        vis_3d = {
            "base": f"{url_prefix}/{task_uid}/raw.nii.gz",
            "mask_structure": find_file_url(os.path.join(task_dir, "infer_output/step2_output"), "*.nii.gz", url_prefix),
            "mask_ldh": find_file_url(os.path.join(task_dir, "infer_output/ldh_output"), "*.nii.gz", url_prefix)
        }
        
        # 2. 2D Fallback Previews
        vis_2d_fallback = {
            "step2": find_file_url(os.path.join(task_dir, "infer_output/preview/step2"), "*.jpg", url_prefix),
            "ldh": find_file_url(os.path.join(task_dir, "infer_output/preview/ldh"), "*.jpg", url_prefix)
        }
        
        # 3. Analysis Images
        result_preview_dir = os.path.join(task_dir, "result/raw/preview")
        analysis_images = {
            "angles": find_images_urls(os.path.join(result_preview_dir, "angles"), url_prefix),
            "geometry": find_images_urls(os.path.join(result_preview_dir, "geometry"), url_prefix),
            "herniation": find_images_urls(os.path.join(result_preview_dir, "herniation"), url_prefix),
            "intensity": find_images_urls(os.path.join(result_preview_dir, "intensity"), url_prefix)
        }
        
        response["result"] = {
            "status": "success",
            "vis_3d": vis_3d,
            "vis_2d_fallback": vis_2d_fallback,
            "analysis_images": analysis_images,
            "report_data": task.result_json  # 数据库中已存储的 clinical_report.json 内容
        }
        
    elif task.status == "failed":
        response["result"] = {"status": "failed", "error": "Task processing failed"}
        
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to Spinodyne API"}
