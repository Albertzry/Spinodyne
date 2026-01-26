import os
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from ..core import storage
from ..db.session import get_session
from ..models.patient import Patient
from ..models.task import DiscResult, GlobalMetric, Task, VertebraResult

router = APIRouter(prefix="/tasks", tags=["tasks"])

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB


@router.get("/{task_id}/result")
def get_task_result(task_id: uuid.UUID, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "success":
        return {
            "task_id": str(task.id),
            "status": task.status,
            "message": "Task is not completed yet",
        }

    # Generate presigned URLs for 3D files
    # We use deterministic paths as defined in ingestion.py
    raw_url = storage.get_presigned_url(task.raw_scan_key)
    struct_mask_key = f"tasks/{task_id}/3d/structure_mask.nii.gz"
    ldh_mask_key = f"tasks/{task_id}/3d/ldh_mask.nii.gz"
    
    struct_mask_url = storage.get_presigned_url(struct_mask_key)
    ldh_mask_url = storage.get_presigned_url(ldh_mask_key)

    # Generate presigned URLs for all preview images
    previews = {}
    for key in task.result_files:
        # key format: tasks/{task_id}/previews/{filename}
        filename = os.path.basename(key)
        url = storage.get_presigned_url(key)
        previews[filename] = url

    # Map results and attach URLs
    vertebrae = []
    for v in task.vertebra_results:
        v_data = v.model_dump()
        # Find matching preview if any (e.g., L1_preview.png)
        # Assuming the AI naming convention matches the level
        v_data["preview_url"] = previews.get(f"{v.level}.png") or previews.get(f"{v.level}_preview.png")
        vertebrae.append(v_data)

    discs = []
    for d in task.disc_results:
        d_data = d.model_dump()
        # Find matching preview if any (e.g., L1-L2_preview.png)
        d_data["preview_url"] = previews.get(f"{d.level}.png") or previews.get(f"{d.level}_preview.png")
        discs.append(d_data)

    global_metrics = [g.model_dump() for g in task.global_metrics]

    return {
        "task_id": str(task.id),
        "status": task.status,
        "patient_id": str(task.patient_id),
        "study_date": task.study_date,
        "three_d": {
            "raw_url": raw_url,
            "structure_mask_url": struct_mask_url,
            "ldh_mask_url": ldh_mask_url,
        },
        "vertebrae": vertebrae,
        "discs": discs,
        "global_metrics": global_metrics[0] if global_metrics else None,
        "all_previews": previews
    }


@router.post("/upload")
def upload_task(
    file: UploadFile = File(...),
    patient_name: str = Form(...),
    patient_id_external: str = Form(...),
    study_date: date | None = Form(None),
    session: Session = Depends(get_session),
):
    if not file.filename or not file.filename.endswith(".nii.gz"):
        raise HTTPException(status_code=400, detail="Only .nii.gz files are allowed.")

    try:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to determine file size.")

    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 500MB limit.")

    patient = session.exec(
        select(Patient).where(Patient.external_id == patient_id_external)
    ).first()

    if not patient:
        patient = Patient(external_id=patient_id_external, name=patient_name)
        session.add(patient)
        session.commit()
        session.refresh(patient)

    task_id = uuid.uuid4()
    object_name = f"tasks/{task_id}/raw.nii.gz"

    storage.upload_file(
        file.file,
        object_name,
        content_type=file.content_type or "application/octet-stream",
    )

    task = Task(
        id=task_id,
        patient_id=patient.id,
        status="pending",
        study_date=study_date or date.today(),
        raw_scan_key=object_name,
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    return {
        "task_id": str(task.id),
        "patient_id": str(patient.id),
        "raw_scan_key": task.raw_scan_key,
        "status": task.status,
    }
