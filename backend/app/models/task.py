import uuid
from datetime import date, datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

# Use TYPE_CHECKING to avoid circular imports at runtime
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .patient import Patient

# Ensure Patient model is registered with SQLAlchemy mapper
from .patient import Patient  # noqa: F401

class Task(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patient_id: uuid.UUID = Field(foreign_key="patient.id")
    status: str = Field(default="pending", description="Task status: pending, processing, success, failed")
    study_date: date = Field(default_factory=date.today)
    raw_scan_key: str = Field(description="MinIO object key for the .nii.gz file")
    
    # Store list of file keys/paths for masks, previews, etc.
    result_files: List[str] = Field(default=[], sa_column=Column(JSONB))
    
    created_at: datetime = Field(default_factory=datetime.now)

    # Relationships
    patient: Optional["Patient"] = Relationship(back_populates="tasks")
    
    vertebra_results: List["VertebraResult"] = Relationship(back_populates="task")
    disc_results: List["DiscResult"] = Relationship(back_populates="task")
    global_metrics: List["GlobalMetric"] = Relationship(back_populates="task")

class VertebraResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    level: str = Field(description="Vertebral level, e.g., L1")
    vh_anterior: float = Field(description="Vertebral Height Anterior")
    vh_posterior: float = Field(description="Vertebral Height Posterior")
    ap_diameter: float = Field(description="Anteroposterior Diameter")
    status: str = Field(description="Analysis status for this vertebra")

    task: Optional[Task] = Relationship(back_populates="vertebra_results")

class DiscResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    level: str = Field(description="Disc level, e.g., L1-L2")
    dh: float = Field(description="Disc Height")
    dhi: float = Field(description="Disc Height Index")
    hdr: float = Field(description="Height-Depth Ratio")
    dia: float = Field(description="Disc Inclusion Angle")
    agl: float = Field(description="Angular parameters")
    status: str = Field(description="Analysis status for this disc")

    # Detailed height metrics
    scan_height_a: Optional[float] = Field(default=None, description="Anterior Scan Height")
    scan_height_m: Optional[float] = Field(default=None, description="Middle Scan Height")
    scan_height_p: Optional[float] = Field(default=None, description="Posterior Scan Height")

    task: Optional[Task] = Relationship(back_populates="disc_results")

class GlobalMetric(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="task.id")
    ll: float = Field(description="Lumbar Lordosis")
    ss: float = Field(description="Sacral Slope")
    lsa: float = Field(description="Lumbar Sacral Angle")

    task: Optional[Task] = Relationship(back_populates="global_metrics")
