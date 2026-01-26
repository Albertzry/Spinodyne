import uuid
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class Patient(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    external_id: str = Field(unique=True, index=True, description="External Patient ID from hospital system")
    name: str

    tasks: List["Task"] = Relationship(back_populates="patient")
