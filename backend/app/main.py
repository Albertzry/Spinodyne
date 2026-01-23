import os
import uuid
import shutil
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
    allow_origins=["*"],  # 在生产环境中应限制域名
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
    
    if task.status == "success" and task.result_json:
        response["result"] = task.result_json
        
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to Spinodyne API"}
