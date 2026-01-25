import os
import logging
from datetime import date, timedelta
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select

from app.core.config import settings
from app.models.task import Task
from app.worker import predict_spine
from app.core.storage import ensure_bucket_exists, upload_file, get_presigned_url
from app.schemas import (
    TaskCreateResponse,
    TaskStatusResponse,
    NiftiUrlsResponse,
    ImageUrlsResponse
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    # 初始化 MinIO bucket
    try:
        ensure_bucket_exists()
    except Exception as e:
        import logging
        logging.error(f"Failed to initialize MinIO bucket: {e}")
        # 不阻塞应用启动，但记录错误

def get_session():
    with Session(engine) as session:
        yield session
@app.post("/api/predict", response_model=TaskCreateResponse)
async def create_prediction_task(
    file: UploadFile = File(..., description="NIfTI 文件 (.nii.gz 或 .nii)"),
    patient_name: str = Form(..., description="患者姓名"),
    patient_id: str = Form(..., description="患者 ID"),
    study_date: Optional[str] = Form(None, description="检查日期 (YYYY-MM-DD)"),
    session: Session = Depends(get_session)
):
    """
    上传医学影像文件并启动推理任务
    
    接收患者信息和 NIfTI 文件，上传到 MinIO，创建数据库记录，触发 Celery 任务
    """
    try:
        # 1. 验证文件格式
        filename = file.filename or ""
        if not filename.endswith((".nii.gz", ".nii")):
            raise HTTPException(
                status_code=400,
                detail="无效的文件格式。仅支持 .nii.gz 或 .nii 文件"
            )
        
        # 2. 解析检查日期
        parsed_study_date = date.today()
        if study_date:
            try:
                from datetime import datetime
                parsed_study_date = datetime.strptime(study_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="无效的日期格式。请使用 YYYY-MM-DD 格式"
                )
        
        # 3. 创建数据库记录 (自动生成 UUID)
        new_task = Task(
            patient_name=patient_name,
            patient_id=patient_id,
            study_date=parsed_study_date,
            status="pending",
            raw_file_key=f"tasks/temp/raw.nii.gz"  # 临时值，稍后更新
        )
        session.add(new_task)
        session.commit()
        session.refresh(new_task)
        
        task_id = new_task.id
        logger.info(f"📝 创建任务记录: {task_id} - {patient_name} ({patient_id})")
        
        # 4. 构建 MinIO 对象键
        raw_file_key = f"tasks/{task_id}/raw.nii.gz"
        
        # 5. 上传文件到 MinIO
        logger.info(f"⬆️  上传文件到 MinIO: {raw_file_key}")
        try:
            await upload_file(
                file_obj=file.file,
                object_name=raw_file_key,
                content_type="application/gzip"
            )
        except Exception as e:
            # 上传失败，删除数据库记录
            logger.error(f"❌ MinIO 上传失败: {e}")
            session.delete(new_task)
            session.commit()
            raise HTTPException(
                status_code=500,
                detail=f"文件上传失败: {str(e)}"
            )
        
        # 6. 更新数据库记录的 raw_file_key
        new_task.raw_file_key = raw_file_key
        session.add(new_task)
        session.commit()
        
        # 7. 触发 Celery 任务 (异步处理)
        logger.info(f"🚀 触发 Celery 任务: {task_id}")
        predict_spine.delay(task_id)
        
        return TaskCreateResponse(
            task_id=task_id,
            status="pending",
            message="任务已创建，正在处理中"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 创建任务失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"创建任务失败: {str(e)}"
        )

@app.get("/api/tasks")
async def get_all_tasks(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """
    获取所有任务列表
    
    参数:
    - status: 按状态筛选 (success, pending, processing, failed)
    - limit: 返回记录数量
    - offset: 偏移量
    """
    try:
        statement = select(Task).order_by(Task.created_at.desc())
        
        if status:
            statement = statement.where(Task.status == status)
        
        statement = statement.offset(offset).limit(limit)
        
        tasks = session.exec(statement).all()
        
        # 转换为响应格式
        results = []
        for task in tasks:
            results.append({
                "id": task.id,
                "patient_name": task.patient_name,
                "patient_id": task.patient_id,
                "study_date": task.study_date.isoformat(),
                "status": task.status,
                "created_at": task.created_at.isoformat(),
                "finished_at": task.finished_at.isoformat() if task.finished_at else None
            })
        
        return results
    
    except Exception as e:
        logger.error(f"❌ 获取任务列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取任务列表失败: {str(e)}")


@app.get("/api/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, session: Session = Depends(get_session)):
    """
    查询任务状态和基本信息
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return TaskStatusResponse(
        id=task.id,
        status=task.status,
        created_at=task.created_at,
        finished_at=task.finished_at,
        patient_name=task.patient_name,
        patient_id=task.patient_id,
        study_date=task.study_date
    )

@app.get("/api/result/3d/{task_id}", response_model=NiftiUrlsResponse)
async def get_task_3d_volumes(task_id: str, session: Session = Depends(get_session)):
    """
    获取 3D 可视化文件 (NIfTI) 的预签名 URL
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="任务不存在或未完成")
    
    if not task.result_files:
        raise HTTPException(status_code=404, detail="结果文件不存在")
    
    try:
        # 生成预签名 URL (1 小时有效期)
        base_url = await get_presigned_url(
            task.raw_file_key,
            expires=timedelta(hours=1)
        )
        
        # 获取分割结果的 MinIO 键
        structure_key = task.result_files.get("structure_mask")
        ldh_key = task.result_files.get("ldh_mask")
        
        structure_url = None
        ldh_url = None
        
        if structure_key:
            structure_url = await get_presigned_url(structure_key, expires=timedelta(hours=1))
        
        if ldh_key:
            ldh_url = await get_presigned_url(ldh_key, expires=timedelta(hours=1))
        
        return NiftiUrlsResponse(
            base=base_url,
            mask_structure=structure_url,
            mask_ldh=ldh_url
        )
    
    except Exception as e:
        logger.error(f"❌ 生成预签名 URL 失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取文件 URL 失败: {str(e)}")

@app.get("/api/result/report/{task_id}")
async def get_task_report(task_id: str, session: Session = Depends(get_session)):
    """
    获取临床报告数据 (JSON)
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="任务不存在或未完成")
    
    if not task.report_data:
        raise HTTPException(status_code=404, detail="报告数据不存在")
    
    return task.report_data

@app.get("/api/result/images/{task_id}", response_model=ImageUrlsResponse)
async def get_task_images(task_id: str, session: Session = Depends(get_session)):
    """
    获取分析图片的预签名 URL
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="任务不存在或未完成")
    
    if not task.result_files:
        raise HTTPException(status_code=404, detail="结果文件不存在")
    
    try:
        # 生成预签名 URL
        vis_2d_fallback = {}
        preview_images = task.result_files.get("preview_images", {})
        
        if preview_images.get("step2"):
            vis_2d_fallback["step2"] = await get_presigned_url(
                preview_images["step2"],
                expires=timedelta(hours=1)
            )
        else:
            vis_2d_fallback["step2"] = None
        
        if preview_images.get("ldh"):
            vis_2d_fallback["ldh"] = await get_presigned_url(
                preview_images["ldh"],
                expires=timedelta(hours=1)
            )
        else:
            vis_2d_fallback["ldh"] = None
        
        # 分析图片
        analysis_images = {}
        analysis_files = task.result_files.get("analysis_images", {})
        
        for category in ["angles", "geometry", "herniation", "intensity"]:
            image_keys = analysis_files.get(category, [])
            urls = []
            for key in image_keys:
                try:
                    url = await get_presigned_url(key, expires=timedelta(hours=1))
                    urls.append(url)
                except Exception as e:
                    logger.warning(f"⚠️  无法生成 URL: {key} - {e}")
            analysis_images[category] = urls
        
        return ImageUrlsResponse(
            vis_2d_fallback=vis_2d_fallback,
            analysis_images=analysis_images
        )
    
    except Exception as e:
        logger.error(f"❌ 生成图片 URL 失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取图片 URL 失败: {str(e)}")

@app.get("/api/result/full/{task_id}")
async def get_task_full_results(task_id: str, session: Session = Depends(get_session)):
    """
    获取完整的任务结果，包括：
    - 任务信息
    - 3D 文件 URL
    - 临床报告
    - 图片 URLs
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task or task.status != "success":
        raise HTTPException(status_code=404, detail="任务不存在或未完成")
    
    try:
        # 获取各部分数据
        task_info = TaskStatusResponse(
            id=task.id,
            status=task.status,
            created_at=task.created_at,
            finished_at=task.finished_at,
            patient_name=task.patient_name,
            patient_id=task.patient_id,
            study_date=task.study_date
        )
        
        # 获取 NIfTI URLs
        nifti_response = await get_task_3d_volumes(task_id, session)
        
        # 获取图片 URLs
        image_response = await get_task_images(task_id, session)
        
        return {
            "task_info": {
                "task_uid": task.id,
                "status": task.status,
                "patient_name": task.patient_name,
                "patient_id": task.patient_id,
                "study_date": task.study_date.isoformat() if task.study_date else None
            },
            "files_3d": {
                "base_url": nifti_response.base,
                "structure_mask_url": nifti_response.mask_structure,
                "ldh_mask_url": nifti_response.mask_ldh
            },
            "report_metadata": task.report_data.get("report_metadata", {}) if task.report_data else {},
            "structured_results": task.report_data.get("structured_results", {}) if task.report_data else {},
            "image_urls": image_response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取完整结果失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取结果失败: {str(e)}")


# ========== 向后兼容的端点 ==========

@app.get("/api/status/{task_uid}", include_in_schema=False)
async def get_task_status_legacy(task_uid: str, session: Session = Depends(get_session)):
    """向后兼容：使用 task_uid 查询状态"""
    return await get_task_status(task_uid, session)


@app.get("/api/result/3d/{task_uid}", include_in_schema=False)
async def get_task_3d_volumes_legacy(task_uid: str, session: Session = Depends(get_session)):
    """向后兼容：使用 task_uid 获取 3D volumes"""
    return await get_task_3d_volumes(task_uid, session)


@app.get("/api/result/report/{task_uid}", include_in_schema=False)
async def get_task_report_legacy(task_uid: str, session: Session = Depends(get_session)):
    """向后兼容：使用 task_uid 获取报告"""
    return await get_task_report(task_uid, session)


@app.get("/api/result/images/{task_uid}", include_in_schema=False)
async def get_task_images_legacy(task_uid: str, session: Session = Depends(get_session)):
    """向后兼容：使用 task_uid 获取图片"""
    return await get_task_images(task_uid, session)


@app.get("/api/result/full/{task_uid}", include_in_schema=False)
async def get_task_full_results_legacy(task_uid: str, session: Session = Depends(get_session)):
    """向后兼容：使用 task_uid 获取完整结果"""
    return await get_task_full_results(task_uid, session)

@app.get("/")
def read_root():
    return {"message": "Welcome to Spinodyne API"}
