import json
import os
import uuid
from glob import glob
from typing import Optional
from pathlib import Path
from sqlmodel import Session
from ..db.session import engine
from ..models.task import Task, VertebraResult, DiscResult, GlobalMetric
from ..core import storage

def _find_first_nii(directory: str) -> Optional[str]:
    if not os.path.exists(directory):
        return None
    matches = sorted(glob(os.path.join(directory, "*.nii.gz")))
    return matches[0] if matches else None

def process_and_ingest_results(task_id: str, local_task_dir: str):
    """
    Main entry point for task result ingestion, ensuring compatibility with the worker.
    """
    return ingest_task_results(task_id, Path(local_task_dir))

def ingest_task_results(task_id: str, result_dir: Path):
    """
    Ingest AI inference results into database and MinIO based on the finalized clinical_report.json schema.
    """
    task_uuid = uuid.UUID(task_id)

    with Session(engine) as session:
        task = session.get(Task, task_uuid)
        if not task:
            raise ValueError(f"Task {task_id} not found in database.")

        try:
            # 1. Parse clinical_report.json
            # The file is expected to be in {result_dir}/result/clinical_report.json
            report_path = result_dir / "result" / "clinical_report.json"
            if not report_path.exists():
                # Fallback to report.json if clinical_report.json is missing
                report_path = result_dir / "result" / "report.json"
            
            if not report_path.exists():
                raise FileNotFoundError(f"Report JSON not found at {report_path}")

            with open(report_path, "r") as f:
                report_data = json.load(f)

            # Ingest Global Metrics
            gm = report_data.get("global_metrics", {})
            if gm and gm.get("status") == "ok":
                ll = gm.get("ll_deg")
                ss = gm.get("ss_deg")
                lsa = gm.get("lsa_deg")
                
                # Check if this task already has global metrics to avoid duplicates
                g_metric = GlobalMetric(
                    task_id=task_uuid,
                    ll=ll if ll is not None else 0.0,
                    ss=ss if ss is not None else 0.0,
                    lsa=lsa if lsa is not None else 0.0,
                )
                session.add(g_metric)

            # Ingest Vertebrae Results
            for vert in report_data.get("vertebrae", []):
                vh = vert.get("vh", {})
                ap = vert.get("ap", {})
                
                # Check status inside vh as per new schema
                if vh.get("status") != "ok":
                    continue
                    
                v_res = VertebraResult(
                    task_id=task_uuid,
                    level=vert.get("level"),
                    vh_anterior=vh.get("anterior_mm", 0.0),
                    vh_posterior=vh.get("posterior_mm", 0.0),
                    ap_diameter=ap.get("ap_diameter_mm", 0.0),
                    status="success",
                )
                session.add(v_res)

            # Ingest Disc Results
            for disc in report_data.get("discs", []):
                dm = disc.get("dm", {})
                dia = disc.get("dia", {})
                
                # Check status inside dm as per new schema
                if dm.get("status") != "ok":
                    continue
                
                # Extract detailed scan line heights
                scan_heights = dm.get("scan_line_heights_mm", {})
                    
                d_res = DiscResult(
                    task_id=task_uuid,
                    level=disc.get("level"),
                    dh=dm.get("dh_mm", 0.0),
                    dhi=dm.get("dhi", 0.0),
                    hdr=dm.get("hdr", 0.0),
                    dia=dia.get("dia_deg", 0.0),
                    agl=0.0, # AGL might be moved or removed in new schema, defaulting to 0
                    status="success",
                    scan_height_a=scan_heights.get("A"),
                    scan_height_m=scan_heights.get("M"),
                    scan_height_p=scan_heights.get("P"),
                )
                session.add(d_res)

            # 2. Upload 3D Files to MinIO (NIfTI files)
            raw_local = result_dir / "raw.nii.gz"
            if raw_local.exists():
                raw_key = f"tasks/{task_id}/3d/raw.nii.gz"
                with open(raw_local, "rb") as f:
                    storage.upload_file(f, raw_key)
                task.raw_scan_key = raw_key

            struct_mask_dir = result_dir / "infer_output" / "step2_output"
            struct_mask_local = _find_first_nii(str(struct_mask_dir))
            if struct_mask_local:
                struct_key = f"tasks/{task_id}/3d/structure.nii.gz"
                with open(struct_mask_local, "rb") as f:
                    storage.upload_file(f, struct_key)

            ldh_mask_dir = result_dir / "infer_output" / "ldh_output"
            ldh_mask_local = _find_first_nii(str(ldh_mask_dir))
            if ldh_mask_local:
                ldh_key = f"tasks/{task_id}/3d/ldh.nii.gz"
                with open(ldh_mask_local, "rb") as f:
                    storage.upload_file(f, ldh_key)

            # 3. Upload Preview Images (Thumbnails)
            preview_dir = result_dir / "result" / "previews"
            result_files_keys = []
            if preview_dir.exists():
                for root, _, files in os.walk(preview_dir):
                    for filename in files:
                        local_path = Path(root) / filename
                        relative_path = local_path.relative_to(preview_dir)
                        minio_key = f"tasks/{task_id}/previews/{relative_path}"

                        with open(local_path, "rb") as f:
                            storage.upload_file(f, minio_key)
                        result_files_keys.append(minio_key)

            # Update Task metadata
            task.result_files = result_files_keys
            task.status = "success"

            session.add(task)
            session.commit()

        except Exception as e:
            session.rollback()
            task.status = "failed"
            task.error_message = str(e)
            session.add(task)
            session.commit()
            raise e
