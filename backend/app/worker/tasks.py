import os
import shutil
import subprocess
import uuid
from celery.utils.log import get_task_logger
from .celery_app import celery_app
from ..core import storage
from ..models.task import Task
from ..db.session import Session, engine

logger = get_task_logger(__name__)

def ingest_task_results(task_id: str):
    """
    Placeholder for ingesting results.
    This will be implemented in the next step.
    """
    logger.info(f"Ingesting results for task {task_id}")
    # Implementation details to follow
    pass

from ..services.ingestion import process_and_ingest_results

@celery_app.task(name="app.worker.tasks.run_inference", bind=True)
def run_inference(self, task_id: str):
    """
    Main inference task for AI processing.
    """
    # Create a dedicated temp directory for this task
    base_temp_dir = "/root/Spinodyne/backend/data/uploads"
    task_temp_dir = os.path.join(base_temp_dir, str(task_id))
    os.makedirs(task_temp_dir, exist_ok=True)
    
    raw_file_path = os.path.join(task_temp_dir, "raw.nii.gz")
    
    try:
        # Step 0: Get task info from DB to find raw_scan_key
        with Session(engine) as session:
            task = session.get(Task, uuid.UUID(task_id))
            if not task:
                raise ValueError(f"Task {task_id} not found")
            raw_scan_key = task.raw_scan_key
            
            # Update status to processing
            task.status = "processing"
            session.add(task)
            session.commit()

        # Step 1: Download from MinIO
        logger.info(f"Downloading {raw_scan_key} for task {task_id}")
        storage.download_to_temp(raw_scan_key, custom_path=raw_file_path)

        # Step 2: Execute AI inference commands
        logger.info(f"Starting AI inference for task {task_id}")
        
        # [Placeholder for real subprocess calls]
        # In actual deployment, these will generate:
        # {task_temp_dir}/result/report.json
        # {task_temp_dir}/infer_output/step2_output/*.nii.gz
        # {task_temp_dir}/infer_output/ldh_output/*.nii.gz
        # {task_temp_dir}/result/previews/*
        
        subprocess.run(["echo", "Running AI Pipeline..."], check=True)

        # Step 3: Ingest results
        process_and_ingest_results(task_id, task_temp_dir)

    except Exception as e:
        logger.error(f"Task {task_id} failed: {e}")
        # Update task status to failed in DB
        with Session(engine) as session:
            task = session.get(Task, uuid.UUID(task_id))
            if task:
                task.status = "failed"
                session.add(task)
                session.commit()
        raise e
    finally:
        # Clean up temporary directory
        if os.path.exists(task_temp_dir):
            logger.info(f"Cleaning up temp dir: {task_temp_dir}")
            shutil.rmtree(task_temp_dir)
