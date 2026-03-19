from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import date

class VertebraResultResponse(BaseModel):
    level: str
    vh_anterior: float
    vh_posterior: float
    ap_diameter: float
    status: str
    preview_url_vh: Optional[str] = None
    preview_url_ap: Optional[str] = None

class DiscResultResponse(BaseModel):
    level: str
    dh: float
    dhi: float
    hdr: float
    dia: float
    status: str
    scan_height_a: Optional[float] = None
    scan_height_m: Optional[float] = None
    scan_height_p: Optional[float] = None
    preview_url_dm: Optional[str] = None
    preview_url_dia: Optional[str] = None

class GlobalMetricResponse(BaseModel):
    ll: float
    ss: float
    lsa: float
    pd: Optional[float] = None
    pa: Optional[float] = None
    par: Optional[float] = None
    plr: Optional[float] = None
    preview_url_ll: Optional[str] = None
    preview_url_ss: Optional[str] = None
    preview_url_lsa: Optional[str] = None
    preview_url_herniation: Optional[str] = None

class ThreeDFilesResponse(BaseModel):
    raw_url: str
    structure_mask_url: str
    ldh_mask_url: str

class TaskInfoResponse(BaseModel):
    id: uuid.UUID
    patient_name: str
    patient_id_external: str
    study_date: date

class TaskResultResponse(BaseModel):
    task_id: uuid.UUID # Keeping for backward compatibility
    status: str
    task_info: TaskInfoResponse
    three_d: ThreeDFilesResponse
    vertebrae: List[VertebraResultResponse]
    discs: List[DiscResultResponse]
    global_metrics: Optional[GlobalMetricResponse] = None
    all_previews: Optional[dict] = None
