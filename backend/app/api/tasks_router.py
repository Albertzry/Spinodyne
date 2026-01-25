from typing import Optional, List, Dict, Any
import uuid
from datetime import date
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.patient import Patient
from app.models.task import Task, VertebraResult, DiscResult, GlobalMetric
from app.core import storage

router = APIRouter()

# --- Response Models ---

class MetricSet(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    ll: Optional[float] = None
    ss: Optional[float] = None
    lsa: Optional[float] = None

class EnhancedVertebra(BaseModel):
    id: uuid.UUID
    level: str
    vh_anterior: Optional[float] = None
    vh_posterior: Optional[float] = None
    ap_diameter: Optional[float] = None
    status: Optional[str] = None
    image_urls: Dict[str, str] = {}

class EnhancedDisc(BaseModel):
    id: uuid.UUID
    level: str
    dh: Optional[float] = None
    dhi: Optional[float] = None
    hdr: Optional[float] = None
    dia: Optional[float] = None
    agl: Optional[float] = None
    status: Optional[str] = None
    image_urls: Dict[str, str] = {}

class FileUrls(BaseModel):
    raw: Optional[str] = None
    structure_mask: Optional[str] = None
    ldh_mask: Optional[str] = None

class TaskResultResponse(BaseModel):
    id: uuid.UUID
    status: str
    study_date: Optional[date]
    patient_id: uuid.UUID
    
    global_metrics: Optional[MetricSet] = None
    vertebrae: List[EnhancedVertebra] = []
    discs: List[EnhancedDisc] = []
    
    urls: FileUrls
    
    # Also return all previews just in case mapping misses
    all_previews: Dict[str, str] = {}

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_task(
    *,
    session: Session = Depends(get_session),
    file: UploadFile = File(...),
    patient_name: str = Form(...),
    patient_id_external: str = Form(...),
    study_date: Optional[date] = Form(None),
):
    # Validation
    if not file.filename or not file.filename.endswith(".nii.gz"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .nii.gz files are accepted."
        )

    # Check file size (500MB limit)
    MAX_FILE_SIZE = 500 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 500MB."
        )

    # Step 1: Patient Management
    statement = select(Patient).where(Patient.external_id == patient_id_external)
    patient = session.exec(statement).first()

    if not patient:
        patient = Patient(external_id=patient_id_external, name=patient_name)
        session.add(patient)
        session.commit()
        session.refresh(patient)
    
    # Step 2: Task Initiation
    new_task_id = uuid.uuid4()
    # We need to set raw_scan_key initially to something or update it later.
    # The requirement says "Store the MinIO object key in the Task.raw_scan_key column."
    # We can calculate the key first.
    object_key = f"tasks/{new_task_id}/raw.nii.gz"
    
    task_data = {
        "id": new_task_id,
        "patient_id": patient.id,
        "status": "pending",
        "raw_scan_key": object_key
    }
    if study_date:
        task_data["study_date"] = study_date

    task = Task(**task_data)
    session.add(task)
    
    # Step 3: Storage
    try:
        # We can pass the UploadFile directly to storage.upload_file 
        # as it handles it via _normalize_file_data (checking .file attribute)
        storage.upload_file(file, object_key)
    except Exception as e:
        # If upload fails, we probably shouldn't commit the task?
        # Or we should rollback. But we haven't committed the task yet.
        # But we committed the patient. That's probably fine.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

    # Step 4: DB Update (Commit the task)
    session.commit()
    session.refresh(task)

    return task


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(
    task_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Generate Presigned URLs
    result_files = task.result_files or {}
    
    file_urls = FileUrls()
    if "raw" in result_files:
        try:
            file_urls.raw = storage.get_presigned_url(result_files["raw"])
        except Exception:
            pass
    if "structure_mask" in result_files:
        try:
            file_urls.structure_mask = storage.get_presigned_url(result_files["structure_mask"])
        except Exception:
            pass
    if "ldh_mask" in result_files:
        try:
            file_urls.ldh_mask = storage.get_presigned_url(result_files["ldh_mask"])
        except Exception:
            pass

    # Process Previews
    all_previews_urls = {}
    previews_map = result_files.get("previews", {})
    if isinstance(previews_map, dict):
        for name, key in previews_map.items():
            try:
                url = storage.get_presigned_url(key)
                all_previews_urls[name] = url
            except Exception:
                pass

    # Build Enhanced Results with Smart Mapping
    enhanced_vertebrae = []
    for v in task.vertebra_results:
        # Simple string matching
        matched_images = {
            name: url for name, url in all_previews_urls.items()
            if v.level in name
        }
        
        enhanced_vertebrae.append(EnhancedVertebra(
            id=v.id,
            level=v.level,
            vh_anterior=v.vh_anterior,
            vh_posterior=v.vh_posterior,
            ap_diameter=v.ap_diameter,
            status=v.status,
            image_urls=matched_images
        ))

    enhanced_discs = []
    for d in task.disc_results:
        matched_images = {
            name: url for name, url in all_previews_urls.items()
            if d.level in name
        }
        
        enhanced_discs.append(EnhancedDisc(
            id=d.id,
            level=d.level,
            dh=d.dh,
            dhi=d.dhi,
            hdr=d.hdr,
            dia=d.dia,
            agl=d.agl,
            status=d.status,
            image_urls=matched_images
        ))
        
    global_metrics_data = None
    if task.global_metrics:
        # Assuming one global metric record
        gm = task.global_metrics[0]
        global_metrics_data = MetricSet(
            id=gm.id,
            task_id=gm.task_id,
            ll=gm.ll,
            ss=gm.ss,
            lsa=gm.lsa
        )

    return TaskResultResponse(
        id=task.id,
        status=task.status,
        study_date=task.study_date,
        patient_id=task.patient_id,
        global_metrics=global_metrics_data,
        vertebrae=enhanced_vertebrae,
        discs=enhanced_discs,
        urls=file_urls,
        all_previews=all_previews_urls
    )
