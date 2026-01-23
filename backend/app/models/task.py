from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    uid: str = Field(index=True, unique=True)
    status: str = Field(default="pending")  # pending, processing, success, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    
    input_file_path: str
    output_dir_path: str
    
    # 存储 report.json 的内容
    result_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
