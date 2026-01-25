"""
API 请求和响应的 Pydantic 模型
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ========== 请求模型 ==========

class TaskCreateRequest(BaseModel):
    """创建任务的请求模型"""
    patient_name: str = Field(..., description="患者姓名", min_length=1)
    patient_id: str = Field(..., description="患者 ID", min_length=1)
    study_date: Optional[date] = Field(default=None, description="检查日期 (默认今天)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "patient_name": "张三",
                "patient_id": "P20260125001",
                "study_date": "2026-01-25"
            }
        }


# ========== 响应模型 ==========

class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态")
    created_at: datetime = Field(..., description="创建时间")
    finished_at: Optional[datetime] = Field(None, description="完成时间")
    patient_name: str = Field(..., description="患者姓名")
    patient_id: str = Field(..., description="患者 ID")
    study_date: date = Field(..., description="检查日期")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123-def456-...",
                "status": "success",
                "created_at": "2026-01-25T10:30:00",
                "finished_at": "2026-01-25T10:35:00",
                "patient_name": "张三",
                "patient_id": "P20260125001",
                "study_date": "2026-01-25"
            }
        }


class TaskCreateResponse(BaseModel):
    """创建任务的响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态")
    message: str = Field(..., description="响应消息")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456-...",
                "status": "pending",
                "message": "任务已创建，正在处理中"
            }
        }


class NiftiUrlsResponse(BaseModel):
    """NIfTI 文件 URL 响应"""
    base: str = Field(..., description="原始 NIfTI 文件 URL")
    mask_structure: Optional[str] = Field(None, description="结构分割 mask URL")
    mask_ldh: Optional[str] = Field(None, description="LDH mask URL")


class ImageUrlsResponse(BaseModel):
    """图片 URL 响应"""
    vis_2d_fallback: Dict[str, Optional[str]] = Field(..., description="2D 可视化图片")
    analysis_images: Dict[str, List[str]] = Field(..., description="分析图片")


class TaskFullResultResponse(BaseModel):
    """完整任务结果响应"""
    task_info: TaskStatusResponse = Field(..., description="任务基本信息")
    nifti_urls: NiftiUrlsResponse = Field(..., description="NIfTI 文件 URLs")
    report_data: Dict[str, Any] = Field(..., description="临床报告数据")
    image_urls: ImageUrlsResponse = Field(..., description="图片 URLs")


# ========== 向后兼容的响应模型 ==========

class LegacyTaskResponse(BaseModel):
    """向后兼容的任务响应 (使用 uid)"""
    task_uid: str = Field(..., description="任务 UID (向后兼容)")
    status: str = Field(..., description="任务状态")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_uid": "abc123-def456-...",
                "status": "pending"
            }
        }


# ========== 患者查询模型 ==========

class PatientTasksResponse(BaseModel):
    """患者所有任务响应"""
    patient_id: str = Field(..., description="患者 ID")
    patient_name: str = Field(..., description="患者姓名")
    tasks: List[TaskStatusResponse] = Field(..., description="任务列表")
    total_count: int = Field(..., description="任务总数")
