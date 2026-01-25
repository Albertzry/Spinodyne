import json
import logging
from pathlib import Path
from typing import Dict, Any

from sqlmodel import Session, select
from app.db.session import engine
from app.models.task import Task, VertebraResult, DiscResult, GlobalMetric
from app.core import storage

logger = logging.getLogger(__name__)

def process_and_ingest_results(task_id: str):
    work_dir = Path(f"/tmp/spinodyne/{task_id}")
    report_path = work_dir / "result" / "report.json"
    
    # Verify report exists
    if not report_path.exists():
        logger.error(f"Report file not found for task {task_id} at {report_path}")
        _mark_task_failed(task_id, "Report file missing")
        return

    try:
        with open(report_path, "r") as f:
            data = json.load(f)
            
        with Session(engine) as session:
            task = session.exec(select(Task).where(Task.id == task_id)).first()
            if not task:
                logger.error(f"Task {task_id} not found during ingestion")
                return

            # 1. JSON Ingestion
            
            # Global Metrics
            # Look for values in 'global_metrics' key or fallback to root/specific keys
            global_data = data.get("global_metrics", data)
            
            gm = GlobalMetric(
                task_id=task.id,
                ll=global_data.get("ll"),
                ss=global_data.get("ss"),
                lsa=global_data.get("lsa")
            )
            session.add(gm)
            
            # Vertebrae
            vertebrae_list = data.get("vertebrae", [])
            for v_data in vertebrae_list:
                # Mapping logic: look for explicit keys, fallback to abbreviated ones
                vh_ant = v_data.get("vh_anterior") or v_data.get("vh")
                # vh_posterior is specific; if not present, remains None
                vh_post = v_data.get("vh_posterior")
                
                ap = v_data.get("ap_diameter") or v_data.get("ap")

                vr = VertebraResult(
                    task_id=task.id,
                    level=v_data.get("level", "Unknown"),
                    vh_anterior=vh_ant,
                    vh_posterior=vh_post,
                    ap_diameter=ap,
                    status=v_data.get("status")
                )
                session.add(vr)

            # Discs
            discs_list = data.get("discs", [])
            for d_data in discs_list:
                dr = DiscResult(
                    task_id=task.id,
                    level=d_data.get("level", "Unknown"),
                    dh=d_data.get("dh"),
                    dhi=d_data.get("dhi"),
                    hdr=d_data.get("hdr"),
                    dia=d_data.get("dia"),
                    agl=d_data.get("agl"),
                    status=d_data.get("status")
                )
                session.add(dr)

            # 2. 3D Files Migration
            result_files_map = {}
            
            # raw.nii.gz -> tasks/{task_id}/3d/raw.nii.gz
            raw_local = work_dir / "raw.nii.gz"
            if raw_local.exists():
                key = f"tasks/{task_id}/3d/raw.nii.gz"
                with open(raw_local, "rb") as f_up:
                    storage.upload_file(f_up, key)
                result_files_map["raw"] = key
            
            # infer_output/step2_output/*.nii.gz -> structure_mask
            step2_dir = work_dir / "infer_output" / "step2_output"
            if step2_dir.exists():
                masks = list(step2_dir.glob("*.nii.gz"))
                if masks:
                    # Sort to ensure consistent selection if multiple
                    masks.sort()
                    mask_path = masks[0]
                    key = f"tasks/{task_id}/3d/structure_mask.nii.gz"
                    with open(mask_path, "rb") as f_up:
                        storage.upload_file(f_up, key)
                    result_files_map["structure_mask"] = key
            
            # infer_output/ldh_output/*.nii.gz -> ldh_mask
            ldh_dir = work_dir / "infer_output" / "ldh_output"
            if ldh_dir.exists():
                masks = list(ldh_dir.glob("*.nii.gz"))
                if masks:
                    masks.sort()
                    mask_path = masks[0]
                    key = f"tasks/{task_id}/3d/ldh_mask.nii.gz"
                    with open(mask_path, "rb") as f_up:
                        storage.upload_file(f_up, key)
                    result_files_map["ldh_mask"] = key

            # 3. Preview Images Migration
            previews_dir = work_dir / "result" / "previews"
            if previews_dir.exists():
                previews_map = {}
                for img_path in previews_dir.rglob("*"):
                    if img_path.is_file():
                        rel_path = img_path.relative_to(previews_dir)
                        # Normalize path separators for S3 keys
                        key = f"tasks/{task_id}/previews/{rel_path}".replace("\\", "/")
                        with open(img_path, "rb") as f_up:
                            storage.upload_file(f_up, key)
                        previews_map[str(rel_path)] = key
                result_files_map["previews"] = previews_map
            
            # Update Task
            task.result_files = result_files_map
            task.status = "success"
            session.add(task)
            session.commit()
            
            logger.info(f"Ingestion completed successfully for task {task_id}")

    except Exception as e:
        logger.exception(f"Ingestion failed for task {task_id}")
        _mark_task_failed(task_id, str(e))

def _mark_task_failed(task_id: str, error_msg: str):
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if task:
            task.status = "failed"
            # Could add error logging details to a field if it existed
            session.add(task)
            session.commit()
