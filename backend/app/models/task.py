from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
import uuid as uuid_pkg


class Task(SQLModel, table=True):
    """
    任务模型 - 存储患者影像分析任务的完整信息
    
    支持患者元数据、MinIO 对象存储引用和完整临床报告
    """
    # 主键 - 使用 UUID 作为主键
    id: str = Field(
        default_factory=lambda: str(uuid_pkg.uuid4()),
        primary_key=True,
        index=True,
        description="任务唯一标识符 (UUID)"
    )
    
    # 患者信息 (必填)
    patient_name: str = Field(
        description="患者姓名",
        index=False
    )
    
    patient_id: str = Field(
        description="患者 ID (医院系统)",
        index=True  # 索引以支持按患者查询
    )
    
    study_date: date = Field(
        default_factory=date.today,
        description="检查日期",
        index=True  # 索引以支持按日期查询和排序
    )
    
    # 任务状态
    status: str = Field(
        default="pending",
        description="任务状态: pending, processing, success, failed"
    )
    
    # 时间戳
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="任务创建时间"
    )
    
    finished_at: Optional[datetime] = Field(
        default=None,
        description="任务完成时间"
    )
    
    # MinIO 对象存储引用
    raw_file_key: str = Field(
        description="MinIO 中原始 NIfTI 文件的对象键 (例如: tasks/{id}/raw.nii.gz)"
    )
    
    result_files: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="MinIO 中结果文件的对象键映射 (structure_mask, ldh_mask, preview_images 等)"
    )
    
    # 临床报告数据 (JSONB)
    report_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="完整的临床报告数据 (clinical_report.json 内容)"
    )
    
    # 向后兼容字段 (可选，用于过渡期)
    input_file_path: Optional[str] = Field(
        default=None,
        description="[已废弃] 本地文件路径，保留用于向后兼容"
    )
    
    output_dir_path: Optional[str] = Field(
        default=None,
        description="[已废弃] 本地输出目录，保留用于向后兼容"
    )
    
    # 向后兼容: 保留 uid 字段作为 id 的别名
    @property
    def uid(self) -> str:
        """向后兼容属性: uid 是 id 的别名"""
        return self.id
    
    # 向后兼容: 保留 result_json 作为 report_data 的别名
    @property
    def result_json(self) -> Optional[Dict[str, Any]]:
        """向后兼容属性: result_json 是 report_data 的别名"""
        return self.report_data
    
    @result_json.setter
    def result_json(self, value: Optional[Dict[str, Any]]):
        """向后兼容属性 setter"""
        self.report_data = value
