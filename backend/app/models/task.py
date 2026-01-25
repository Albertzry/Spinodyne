from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional, Any, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

if TYPE_CHECKING:
    from .patient import Patient


class Task(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patient_id: uuid.UUID = Field(foreign_key="patient.id")
    status: str = Field(default="pending")  # pending, processing, success, failed
    study_date: date = Field(default_factory=date.today)
    raw_scan_key: str
    
    # Store list of file keys/paths
    result_files: Any = Field(default=[], sa_column=Column(JSONB))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    patient: "Patient" = Relationship(back_populates="tasks")
    
    vertebra_results: List["VertebraResult"] = Relationship(back_populates="task")
    disc_results: List["DiscResult"] = Relationship(back_populates="task")
    global_metrics: List["GlobalMetric"] = Relationship(back_populates="task")


class VertebraResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    level: str
    vh_anterior: Optional[float] = None
    vh_posterior: Optional[float] = None
    ap_diameter: Optional[float] = None
    status: Optional[str] = None

    task: Task = Relationship(back_populates="vertebra_results")


class DiscResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    level: str
    dh: Optional[float] = None
    dhi: Optional[float] = None
    hdr: Optional[float] = None
    dia: Optional[float] = None
    agl: Optional[float] = None
    status: Optional[str] = None

    task: Task = Relationship(back_populates="disc_results")


class GlobalMetric(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    ll: Optional[float] = None
    ss: Optional[float] = None
    lsa: Optional[float] = None

    task: Task = Relationship(back_populates="global_metrics")
