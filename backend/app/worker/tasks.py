import subprocess
import logging
from pathlib import Path
from sqlmodel import Session, select
from app.db.session import engine
from app.models.task import Task
from app.core import storage
from app.core.celery_app import celery_app
from app.services.ingestion import process_and_ingest_results

logger = logging.getLogger(__name__)

@celery_app.task
def run_full_inference(task_id: str):
    """
    Celery task to run the full inference pipeline for a given task.
    """
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        # Update status to processing
        task.status = "processing"
        session.add(task)
        session.commit()
        session.refresh(task)

        try:
            # 1. Local Setup
            work_dir = Path(f"/tmp/spinodyne/{task_id}")
            # Ensure the directory exists (storage.download_file creates parent, but explicit is fine)
            work_dir.mkdir(parents=True, exist_ok=True)
            
            raw_nii_path = work_dir / "raw.nii.gz"
            logger.info(f"Downloading {task.raw_scan_key} to {raw_nii_path}")
            storage.download_file(task.raw_scan_key, raw_nii_path)

            # 2. Execution Sequence
            # a. Run infer_ldh.py
            logger.info("Running infer_ldh.py")
            cmd_infer = [
                "conda", "run", "-n", "tss", "python",
                "/root/TotalSpineSeg-v2/scripts/infer_ldh.py",
                str(work_dir)
            ]
            subprocess.run(cmd_infer, check=True, capture_output=True, text=True)

            # b. Run calculate.py
            logger.info("Running calculate.py")
            cmd_calc = [
                "conda", "run", "-n", "tss", "python",
                "/root/TotalSpineSeg-v2/calculate.py",
                str(work_dir)
            ]
            subprocess.run(cmd_calc, check=True, capture_output=True, text=True)
            
            # Verify outputs
            infer_output = work_dir / "infer_output"
            result_output = work_dir / "result"
            
            if not infer_output.exists() or not result_output.exists():
                raise RuntimeError("Expected output directories (infer_output, result) were not generated.")

            logger.info(f"Inference successful for task {task_id}")
            
            # 4. Next Step Trigger
            process_and_ingest_results(task_id)

        except subprocess.CalledProcessError as e:
            logger.error(f"Subprocess failed for task {task_id}. Command: {e.cmd}. Stderr: {e.stderr}")
            task.status = "failed"
            session.add(task)
            session.commit()
            # We don't re-raise to avoid Celery retrying immediately if logic assumes fatal error
        except Exception as e:
            logger.error(f"Unexpected error in task {task_id}: {str(e)}")
            task.status = "failed"
            session.add(task)
            session.commit()
