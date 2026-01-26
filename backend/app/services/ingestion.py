import json
import os
import uuid
from typing import List
from sqlmodel import Session, select
from ..db.session import engine
from ..models.task import Task, VertebraResult, DiscResult, GlobalMetric
from ..core import storage
from ..core.config import settings

def process_and_ingest_results(task_id: str, local_task_dir: str):
    """
    Ingest AI inference results into database and MinIO.
    
    :param task_id: UUID string of the task
    :param local_task_dir: Local path where the inference output is stored
    """
    task_uuid = uuid.UUID(task_id)
    
    with Session(engine) as session:
        task = session.get(Task, task_uuid)
        if not task:
            raise ValueError(f"Task {task_id} not found in database.")

        try:
            # 1. Parse result/report.json
            report_path = os.path.join(local_task_dir, "result", "report.json")
            if os.path.exists(report_path):
                with open(report_path, 'r') as f:
                    report_data = json.load(f)
                
                # Ingest Vertebrae Results
                for vert in report_data.get("vertebrae", []):
                    v_res = VertebraResult(
                        task_id=task_uuid,
                        level=vert.get("level"),
                        vh_anterior=vert.get("vh_anterior", 0.0),
                        vh_posterior=vert.get("vh_posterior", 0.0),
                        ap_diameter=vert.get("ap_diameter", 0.0),
                        status="success"
                    )
                    session.add(v_res)

                # Ingest Disc Results
                for disc in report_data.get("discs", []):
                    d_res = DiscResult(
                        task_id=task_uuid,
                        level=disc.get("level"),
                        dh=disc.get("dh", 0.0),
                        dhi=disc.get("dhi", 0.0),
                        hdr=disc.get("hdr", 0.0),
                        dia=disc.get("dia", 0.0),
                        agl=disc.get("agl", 0.0),
                        status="success"
                    )
                    session.add(d_res)

                # Ingest Global Metrics
                global_data = report_data.get("global", {})
                if global_data:
                    g_metric = GlobalMetric(
                        task_id=task_uuid,
                        ll=global_data.get("ll", 0.0),
                        ss=global_data.get("ss", 0.0),
                        lsa=global_data.get("lsa", 0.0)
                    )
                    session.add(g_metric)

            # 2. Upload 3D Files to MinIO
            # Paths mapping: (local_path_pattern, minio_key)
            three_d_files = []
            
            # Helper to find file by pattern or prefix
            def find_file(directory, pattern):
                if not os.path.exists(directory):
                    return None
                for f in os.listdir(directory):
                    if f.endswith(".nii.gz"):
                        return os.path.join(directory, f)
                return None

            # a) Raw scan (already there but we might want to move it to 3d folder as requested)
            raw_local = os.path.join(local_task_dir, "raw.nii.gz")
            if os.path.exists(raw_local):
                raw_key = f"tasks/{task_id}/3d/raw.nii.gz"
                with open(raw_local, "rb") as f:
                    storage.upload_file(f, raw_key)
                task.raw_scan_key = raw_key

            # b) Structure mask
            struct_mask_dir = os.path.join(local_task_dir, "infer_output", "step2_output")
            struct_mask_local = find_file(struct_mask_dir, ".nii.gz")
            if struct_mask_local:
                mask_key = f"tasks/{task_id}/3d/structure_mask.nii.gz"
                with open(struct_mask_local, "rb") as f:
                    storage.upload_file(f, mask_key)
                three_d_files.append(mask_key)

            # c) LDH mask
            ldh_mask_dir = os.path.join(local_task_dir, "infer_output", "ldh_output")
            ldh_mask_local = find_file(ldh_mask_dir, ".nii.gz")
            if ldh_mask_local:
                ldh_key = f"tasks/{task_id}/3d/ldh_mask.nii.gz"
                with open(ldh_mask_local, "rb") as f:
                    storage.upload_file(f, ldh_key)
                three_d_files.append(ldh_key)

            # 3. Upload Preview Images
            preview_dir = os.path.join(local_task_dir, "result", "previews")
            result_files_keys = []
            if os.path.exists(preview_dir):
                for root, _, files in os.walk(preview_dir):
                    for filename in files:
                        local_path = os.path.join(root, filename)
                        relative_path = os.path.relpath(local_path, preview_dir)
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
            session.add(task)
            session.commit()
            print(f"Error during ingestion for task {task_id}: {e}")
            raise e
