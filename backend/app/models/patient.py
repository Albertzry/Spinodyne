from __future__ import annotations

import uuid
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .task import Task


class Patient(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    external_id: str = Field(unique=True, index=True)
    name: str = Field(index=True)

    tasks: List["Task"] = Relationship(back_populates="patient")
