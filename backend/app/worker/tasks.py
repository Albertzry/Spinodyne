import os
import shutil
import subprocess
import uuid
from pathlib import Path
from celery.utils.log import get_task_logger
from .celery_app import celery_app
from ..core import storage
from ..models.task import Task
from ..db.session import Session, engine

logger = get_task_logger(__name__)

from ..services.ingestion import process_and_ingest_results

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_MODEL_DIR = _PROJECT_ROOT / "model"
_WEIGHTS_DIR = _MODEL_DIR / "weights"
_TSS_PYTHON = "/opt/conda/envs/tss/bin/python"
_STEP_TIMEOUT_SECONDS = 60 * 60  # 1 hour
_TSS_MAX_WORKERS = int(os.getenv("TSS_MAX_WORKERS", "2"))
_TSS_MAX_WORKERS_NNUNET = int(os.getenv("TSS_MAX_WORKERS_NNUNET", "1"))

def _run_conda_command(cmd: list, task_id: str, step_name: str, env: dict):
    logger.info(f"[{task_id}] RUN {step_name}: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            env=env,
            timeout=_STEP_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as e:
        logger.error(f"[{task_id}] {step_name} TIMEOUT after {_STEP_TIMEOUT_SECONDS}s")
        raise RuntimeError(f"{step_name} timeout")

    if result.returncode != 0:
        logger.error(f"[{task_id}] {step_name} FAILED (code {result.returncode})")
        raise RuntimeError(f"{step_name} failed (code {result.returncode})")
    logger.info(f"[{task_id}] {step_name} SUCCESS")

def run_inference_pipeline(task_id: str, task_temp_dir: str):
    """
    Execute the two-stage AI inference pipeline inside the tss conda environment.
    """
    env = os.environ.copy()
    env["TOTALSPINESEG_DATA"] = str(_WEIGHTS_DIR)

    cmd_infer = [
        _TSS_PYTHON,
        str(_MODEL_DIR / "scripts" / "infer_ldh.py"),
        task_temp_dir,
        "--max-workers",
        str(_TSS_MAX_WORKERS),
        "--max-workers-nnunet",
        str(_TSS_MAX_WORKERS_NNUNET),
    ]
    _run_conda_command(cmd_infer, task_id, "infer_ldh", env)

    cmd_calc = [_TSS_PYTHON, str(_MODEL_DIR / "calculate.py"), task_temp_dir]
    _run_conda_command(cmd_calc, task_id, "calculate", env)

@celery_app.task(name="app.worker.tasks.run_inference", bind=True)
def run_inference(self, task_id: str):
    """
    Main inference task for AI processing.
    """
    # Create a dedicated temp directory for this task
    base_temp_dir = str(_PROJECT_ROOT / "backend" / "data" / "uploads")
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
        logger.debug(f"Downloading {raw_scan_key} for task {task_id}")
        storage.download_to_temp(raw_scan_key, custom_path=raw_file_path)

        # Step 2: Execute AI inference commands
        logger.debug(f"Starting AI inference for task {task_id}")
        run_inference_pipeline(task_id, task_temp_dir)

        # Step 3: Ingest results and upload assets
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
            logger.debug(f"Cleaning up temp dir: {task_temp_dir}")
            shutil.rmtree(task_temp_dir)
