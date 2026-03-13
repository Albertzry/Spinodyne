import glob
import os
import shutil
import subprocess
import tempfile
import uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select, delete

from ..core import storage
from ..db.session import get_session
from ..models.patient import Patient
from ..models.task import DiscResult, GlobalMetric, Task, VertebraResult
from ..worker.tasks import run_inference
from .schemas import TaskResultResponse, VertebraResultResponse, DiscResultResponse, GlobalMetricResponse, ThreeDFilesResponse, TaskInfoResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB


@router.get("")
def list_tasks(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task)).all()
    return [
        {
            "id": str(task.id),
            "status": task.status,
            "patient_id": task.patient.external_id if task.patient else str(task.patient_id),
            "patient_name": task.patient.name if task.patient else None,
            "study_date": task.study_date,
            "created_at": task.created_at,
        }
        for task in tasks
    ]


@router.get("/{task_id}")
def get_task(task_id: uuid.UUID, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": str(task.id),
        "status": task.status,
        "patient_id": task.patient.external_id if task.patient else str(task.patient_id),
        "patient_name": task.patient.name if task.patient else None,
        "study_date": task.study_date,
        "created_at": task.created_at,
    }


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(task_id: uuid.UUID, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "success":
        raise HTTPException(status_code=400, detail=f"Task is in {task.status} state")

    # Helper to get presigned URL only if file exists in result_files
    def get_url_if_exists(key: str) -> Optional[str]:
        if key in task.result_files:
            return storage.get_presigned_url(key)
        return None

    # Generate presigned URLs for 3D files
    raw_url = storage.get_presigned_url(task.raw_scan_key)
    struct_key = f"tasks/{task_id}/3d/structure.nii.gz"
    ldh_key = f"tasks/{task_id}/3d/ldh.nii.gz"
    
    struct_url = storage.get_presigned_url(struct_key)
    ldh_url = storage.get_presigned_url(ldh_key)

    # 1. Map Vertebrae
    vertebrae = []
    for v in task.vertebra_results:
        key_vh = f"tasks/{task_id}/previews/vertebrae/vert_{v.level}_vh.png"
        key_ap = f"tasks/{task_id}/previews/vertebrae/vert_{v.level}_ap.png"
        
        vertebrae.append(VertebraResultResponse(
            level=v.level,
            vh_anterior=v.vh_anterior,
            vh_posterior=v.vh_posterior,
            ap_diameter=v.ap_diameter,
            status=v.status,
            preview_url_vh=get_url_if_exists(key_vh),
            preview_url_ap=get_url_if_exists(key_ap)
        ))

    # 2. Map Discs with new scan height fields
    discs = []
    for d in task.disc_results:
        key_dm = f"tasks/{task_id}/previews/discs/disc_{d.level}_dm.png"
        key_dia = f"tasks/{task_id}/previews/discs/disc_{d.level}_dia.png"
        
        discs.append(DiscResultResponse(
            level=d.level,
            dh=d.dh,
            dhi=d.dhi,
            hdr=d.hdr,
            dia=d.dia,
            status=d.status,
            scan_height_a=d.scan_height_a,
            scan_height_m=d.scan_height_m,
            scan_height_p=d.scan_height_p,
            preview_url_dm=get_url_if_exists(key_dm),
            preview_url_dia=get_url_if_exists(key_dia)
        ))

    # 3. Map Global Metrics
    global_res = None
    if task.global_metrics:
        g = task.global_metrics[0]
        key_ll = f"tasks/{task_id}/previews/global/global_cobb_ll.png"
        key_ss = f"tasks/{task_id}/previews/global/global_cobb_ss.png"
        key_lsa = f"tasks/{task_id}/previews/global/global_cobb_lsa.png"
        key_herniation = f"tasks/{task_id}/previews/global/global_herniation_summary.png"
        
        global_res = GlobalMetricResponse(
            ll=g.ll,
            ss=g.ss,
            lsa=g.lsa,
            pd=g.pd,
            pa=g.pa,
            par=g.par,
            plr=g.plr,
            preview_url_ll=get_url_if_exists(key_ll),
            preview_url_ss=get_url_if_exists(key_ss),
            preview_url_lsa=get_url_if_exists(key_lsa),
            preview_url_herniation=get_url_if_exists(key_herniation)
        )

    # For backward compatibility
    all_previews = {}
    for key in task.result_files:
        if "previews/" in key:
            all_previews[os.path.basename(key)] = storage.get_presigned_url(key)

    # Construct Task Info
    task_info = TaskInfoResponse(
        id=task.id,
        patient_name=task.patient.name if task.patient else "Unknown",
        patient_id_external=task.patient.external_id if task.patient else str(task.patient_id),
        study_date=task.study_date
    )

    return TaskResultResponse(
        task_id=task.id,
        status=task.status,
        task_info=task_info,
        three_d=ThreeDFilesResponse(
            raw_url=raw_url,
            structure_mask_url=struct_url,
            ldh_mask_url=ldh_url
        ),
        vertebrae=vertebrae,
        discs=discs,
        global_metrics=global_res,
        all_previews=all_previews
    )


@router.post("/upload")
def upload_task(
    file: Optional[UploadFile] = File(None),
    upload: Optional[UploadFile] = File(None),
    patient_name: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    patient_id_external: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    study_date: Optional[date] = Form(None),
    session: Session = Depends(get_session),
):
    file = file or upload
    patient_name = patient_name or name
    patient_id_external = patient_id_external or patient_id

    if not file:
        raise HTTPException(status_code=400, detail="Missing file upload.")
    if not patient_name or not patient_id_external:
        raise HTTPException(status_code=400, detail="Missing patient_name or patient_id_external.")

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

    run_inference.delay(str(task.id))

    return {
        "task_id": str(task.id),
        "patient_id": str(patient.id),
        "raw_scan_key": task.raw_scan_key,
        "status": task.status,
    }


@router.post("/upload-dicom")
def upload_dicom_task(
    files: List[UploadFile] = File(...),
    patient_name: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    patient_id_external: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    study_date: Optional[date] = Form(None),
    session: Session = Depends(get_session),
):
    """
    Accept a batch of DICOM (.dcm) files, convert them to NIfTI (.nii.gz)
    using dcm2niix, then proceed with the standard inference pipeline.
    """
    patient_name = patient_name or name
    patient_id_external = patient_id_external or patient_id

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No DICOM files uploaded.")
    if not patient_name or not patient_id_external:
        raise HTTPException(status_code=400, detail="Missing patient_name or patient_id_external.")

    # Create a temp directory for DICOM files
    dcm_dir = tempfile.mkdtemp(prefix="spinodyne_dcm_")
    nifti_dir = tempfile.mkdtemp(prefix="spinodyne_nifti_")

    try:
        # Save all uploaded DICOM files to the temp directory
        total_size = 0
        for f in files:
            # Use the original filename, but ensure it's safe
            fname = os.path.basename(f.filename) if f.filename else f"dicom_{uuid.uuid4().hex[:8]}"
            fpath = os.path.join(dcm_dir, fname)
            content = f.file.read()
            total_size += len(content)
            if total_size > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=413, detail="Total upload exceeds 500MB limit.")
            with open(fpath, "wb") as out:
                out.write(content)

        # Run dcm2niix to convert DICOM -> NIfTI
        cmd = [
            "dcm2niix",
            "-z", "y",       # gzip compress
            "-f", "raw",     # output filename pattern
            "-o", nifti_dir, # output directory
            dcm_dir,         # input directory
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"DICOM to NIfTI conversion failed: {result.stderr}"
            )

        # Find the generated .nii.gz file
        nifti_files = glob.glob(os.path.join(nifti_dir, "*.nii.gz"))
        if not nifti_files:
            # Try uncompressed .nii as fallback
            nifti_files = glob.glob(os.path.join(nifti_dir, "*.nii"))
        if not nifti_files:
            raise HTTPException(
                status_code=500,
                detail="Conversion produced no NIfTI output. Please verify the DICOM files."
            )

        # Use the first (or only) generated file
        nifti_path = nifti_files[0]

        # Create patient record
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

        # Upload the converted NIfTI file to MinIO
        with open(nifti_path, "rb") as nf:
            storage.upload_file(
                nf,
                object_name,
                content_type="application/gzip",
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

        run_inference.delay(str(task.id))

        return {
            "task_id": str(task.id),
            "patient_id": str(patient.id),
            "raw_scan_key": task.raw_scan_key,
            "status": task.status,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DICOM processing error: {str(e)}")
    finally:
        # Clean up temp directories
        shutil.rmtree(dcm_dir, ignore_errors=True)
        shutil.rmtree(nifti_dir, ignore_errors=True)


def _delete_task(task_id: uuid.UUID, session: Session):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    session.exec(delete(VertebraResult).where(VertebraResult.task_id == task_id))
    session.exec(delete(DiscResult).where(DiscResult.task_id == task_id))
    session.exec(delete(GlobalMetric).where(GlobalMetric.task_id == task_id))
    session.delete(task)
    session.commit()

    return {"status": "deleted", "task_id": str(task_id)}


@router.delete("/{task_id}")
def delete_task(task_id: uuid.UUID, session: Session = Depends(get_session)):
    return _delete_task(task_id, session)


@router.post("/{task_id}/delete")
def delete_task_via_post(task_id: uuid.UUID, session: Session = Depends(get_session)):
    return _delete_task(task_id, session)
