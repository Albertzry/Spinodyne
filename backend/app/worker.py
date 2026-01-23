import os
import subprocess
import json
import logging
from datetime import datetime
from celery import Celery
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.task import Task

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 Celery
celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# 数据库连接
engine = create_engine(settings.DATABASE_URL)

@celery_app.task(name="predict_spine", bind=True)
def predict_spine(self, task_uid: str):
    """
    执行脊柱分割和分析任务
    Step A: Inference (totalspineseg)
    Step B: Calculation (calculate.py)
    Step C: Post-Processing (Update DB)
    """
    logger.info(f"🚀 Starting task: {task_uid}")
    
    with Session(engine) as session:
        # 1. 获取任务记录
        statement = select(Task).where(Task.uid == task_uid)
        task = session.exec(statement).first()
        
        if not task:
            logger.error(f"Task {task_uid} not found in DB")
            return "Task not found"
            
        # 更新状态为 processing
        task.status = "processing"
        session.add(task)
        session.commit()
        session.refresh(task)

        try:
            # 准备路径
            # /root/Spinodyne/data/uploads/{task_uid}/
            task_dir = os.path.dirname(task.input_file_path)
            # /root/Spinodyne/data/uploads/{task_uid}/infer_output
            infer_output_dir = os.path.join(task_dir, "infer_output")
            # /root/Spinodyne/data/uploads/{task_uid}/result
            result_dir = os.path.join(task_dir, "result")
            
            os.makedirs(infer_output_dir, exist_ok=True)
            os.makedirs(result_dir, exist_ok=True)
            
            # ==========================================
            # Step A: Inference (TotalSpineSeg)
            # ==========================================
            # cmd: conda run -n tss totalspineseg --input-dir {task_dir} --output-dir {infer_output_dir} --device cuda
            
            cmd_inference = f"{settings.CONDA_CMD_PREFIX} totalspineseg --input-dir {task_dir} --output-dir {infer_output_dir} --device cuda"
            logger.info(f"Running Inference: {cmd_inference}")
            
            result_inf = subprocess.run(
                cmd_inference, 
                shell=True, 
                capture_output=True, 
                text=True
            )
            
            if result_inf.returncode != 0:
                raise Exception(f"Inference failed: {result_inf.stderr}")
                
            logger.info("✅ Inference completed.")

            # ==========================================
            # Step B: Calculation (calculate.py)
            # ==========================================
            # cmd: conda run -n tss python /root/TotalSpineSeg-v2/calculate.py --input-dir {task_dir} --output-dir {result_dir}
            
            calc_script = os.path.join(settings.MODEL_ROOT_DIR, "calculate.py")
            cmd_calc = f"{settings.CONDA_CMD_PREFIX} python {calc_script} --input-dir {task_dir} --output-dir {result_dir}"
            logger.info(f"Running Calculation: {cmd_calc}")
            
            result_calc = subprocess.run(
                cmd_calc, 
                shell=True, 
                capture_output=True, 
                text=True
            )
            
            if result_calc.returncode != 0:
                raise Exception(f"Calculation failed: {result_calc.stderr}")

            logger.info("✅ Calculation completed.")

            # ==========================================
            # Step C: Post-Processing
            # ==========================================
            report_path = os.path.join(result_dir, "report.json")
            
            if not os.path.exists(report_path):
                raise Exception("report.json not found in result directory")
                
            with open(report_path, "r") as f:
                report_data = json.load(f)
            
            # 更新数据库
            task.status = "success"
            task.finished_at = datetime.utcnow()
            task.result_json = report_data
            task.output_dir_path = result_dir
            
            session.add(task)
            session.commit()
            
            logger.info(f"🎉 Task {task_uid} finished successfully.")
            return {"status": "success", "uid": task_uid}

        except Exception as e:
            logger.error(f"❌ Task failed: {str(e)}")
            task.status = "failed"
            task.finished_at = datetime.utcnow()
            session.add(task)
            session.commit()
            return {"status": "failed", "error": str(e)}
