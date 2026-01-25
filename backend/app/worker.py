import os
import subprocess
import json
import logging
import shutil
import glob
from datetime import datetime
from pathlib import Path
from celery import Celery
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.task import Task
from app.core.storage import (
    download_to_local_sync,
    upload_file_sync,
    list_objects
)

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


def collect_and_upload_files(task_id: str, local_task_dir: str) -> dict:
    """
    收集所有输出文件并上传到 MinIO
    
    返回 result_files 字典，包含所有 MinIO 对象键
    """
    result_files = {
        "structure_mask": None,
        "ldh_mask": None,
        "preview_images": {},
        "analysis_images": {
            "angles": [],
            "geometry": [],
            "herniation": [],
            "intensity": []
        }
    }
    
    # 1. 上传 NIfTI 分割结果
    # Structure mask (step2_output)
    structure_mask_path = os.path.join(local_task_dir, "infer_output/step2_output/raw.nii.gz")
    if os.path.exists(structure_mask_path):
        structure_key = f"tasks/{task_id}/infer_output/step2_output/raw.nii.gz"
        upload_file_sync(structure_mask_path, structure_key, "application/gzip")
        result_files["structure_mask"] = structure_key
        logger.info(f"✅ 上传结构分割: {structure_key}")
    
    # LDH mask (ldh_output)
    ldh_mask_path = os.path.join(local_task_dir, "infer_output/ldh_output/raw.nii.gz")
    if os.path.exists(ldh_mask_path):
        ldh_key = f"tasks/{task_id}/infer_output/ldh_output/raw.nii.gz"
        upload_file_sync(ldh_mask_path, ldh_key, "application/gzip")
        result_files["ldh_mask"] = ldh_key
        logger.info(f"✅ 上传 LDH 分割: {ldh_key}")
    
    # 2. 上传预览图片 (2D fallback)
    # Step2 preview
    step2_preview_files = glob.glob(os.path.join(local_task_dir, "infer_output/preview/step2/*.jpg"))
    if step2_preview_files:
        preview_path = step2_preview_files[0]
        preview_key = f"tasks/{task_id}/infer_output/preview/step2/{os.path.basename(preview_path)}"
        upload_file_sync(preview_path, preview_key, "image/jpeg")
        result_files["preview_images"]["step2"] = preview_key
        logger.info(f"✅ 上传 step2 预览: {preview_key}")
    
    # LDH preview
    ldh_preview_files = glob.glob(os.path.join(local_task_dir, "infer_output/preview/ldh/*.jpg"))
    if ldh_preview_files:
        preview_path = ldh_preview_files[0]
        preview_key = f"tasks/{task_id}/infer_output/preview/ldh/{os.path.basename(preview_path)}"
        upload_file_sync(preview_path, preview_key, "image/jpeg")
        result_files["preview_images"]["ldh"] = preview_key
        logger.info(f"✅ 上传 LDH 预览: {preview_key}")
    
    # 3. 上传分析图片
    result_preview_dir = os.path.join(local_task_dir, "result/raw/preview")
    
    # 遍历所有分析图片类别
    for category in ["angles", "geometry", "herniation", "intensity"]:
        category_dir = os.path.join(result_preview_dir, category)
        if not os.path.exists(category_dir):
            continue
        
        # 递归查找所有 PNG 图片
        image_files = glob.glob(os.path.join(category_dir, "**/*.png"), recursive=True)
        
        for image_path in image_files:
            # 构建相对路径
            rel_path = os.path.relpath(image_path, local_task_dir)
            minio_key = f"tasks/{task_id}/{rel_path}"
            
            # 上传
            upload_file_sync(image_path, minio_key, "image/png")
            result_files["analysis_images"][category].append(minio_key)
        
        logger.info(f"✅ 上传 {category} 图片: {len(result_files['analysis_images'][category])} 张")
    
    return result_files


@celery_app.task(name="predict_spine", bind=True)
def predict_spine(self, task_id: str):
    """
    执行脊柱分割和分析任务
    
    工作流:
    1. 从数据库获取任务记录
    2. 从 MinIO 下载原始 NIfTI 文件到临时目录
    3. 运行 totalspineseg 推理
    4. 运行 calculate.py 计算
    5. 上传所有结果文件到 MinIO
    6. 解析 clinical_report.json 并更新数据库
    7. 清理临时文件
    """
    logger.info(f"🚀 开始任务: {task_id}")
    
    # 创建临时工作目录
    temp_base = "/tmp/spinodyne_tasks"
    os.makedirs(temp_base, exist_ok=True)
    local_task_dir = os.path.join(temp_base, task_id)
    
    with Session(engine) as session:
        try:
            # 1. 获取任务记录
            statement = select(Task).where(Task.id == task_id)
            task = session.exec(statement).first()
            
            if not task:
                logger.error(f"❌ 任务 {task_id} 不存在")
                return {"status": "failed", "error": "Task not found"}
            
            # 更新状态为 processing
            task.status = "processing"
            session.add(task)
            session.commit()
            logger.info(f"📝 任务状态更新为 processing")
            
            # 2. 从 MinIO 下载原始文件
            logger.info(f"⬇️  从 MinIO 下载原始文件...")
            os.makedirs(local_task_dir, exist_ok=True)
            local_raw_path = os.path.join(local_task_dir, "raw.nii.gz")
            
            download_to_local_sync(task.raw_file_key, local_raw_path)
            logger.info(f"✅ 文件下载完成: {local_raw_path}")
            
            # 3. 准备输出目录
            infer_output_dir = os.path.join(local_task_dir, "infer_output")
            result_dir = os.path.join(local_task_dir, "result")
            os.makedirs(infer_output_dir, exist_ok=True)
            os.makedirs(result_dir, exist_ok=True)
            
            # ==========================================
            # Step A: Inference (totalspineseg)
            # ==========================================
            logger.info("🔬 开始推理...")
            infer_script = os.path.join(settings.MODEL_ROOT_DIR, "scripts/infer_ldh.py")
            data_dir = "/opt/data/private/data_sum/"
            
            cmd_inference = (
                f"{settings.CONDA_CMD_PREFIX} python {infer_script} "
                f"--input-dir {local_task_dir} "
                f"--output-dir {infer_output_dir} "
                f"--data-dir {data_dir} "
                f"--overwrite --device cuda"
            )
            
            logger.info(f"执行命令: {cmd_inference}")
            result_inf = subprocess.run(
                cmd_inference,
                shell=True,
                capture_output=True,
                text=True,
                timeout=600  # 10 分钟超时
            )
            
            if result_inf.returncode != 0:
                logger.error(f"❌ 推理失败: {result_inf.stderr}")
                raise Exception(f"Inference failed: {result_inf.stderr}")
            
            logger.info("✅ 推理完成")
            
            # ==========================================
            # Step B: Calculation (calculate.py)
            # ==========================================
            logger.info("📊 开始计算...")
            calc_script = os.path.join(settings.MODEL_ROOT_DIR, "calculate.py")
            
            cmd_calc = (
                f"{settings.CONDA_CMD_PREFIX} python {calc_script} "
                f"--input-dir {local_task_dir} "
                f"--output-dir {result_dir}"
            )
            
            logger.info(f"执行命令: {cmd_calc}")
            result_calc = subprocess.run(
                cmd_calc,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 分钟超时
            )
            
            if result_calc.returncode != 0:
                logger.error(f"❌ 计算失败: {result_calc.stderr}")
                raise Exception(f"Calculation failed: {result_calc.stderr}")
            
            logger.info("✅ 计算完成")
            
            # ==========================================
            # Step C: 解析临床报告
            # ==========================================
            report_path = os.path.join(result_dir, "raw", "clinical_report.json")
            
            if not os.path.exists(report_path):
                raise Exception("clinical_report.json 未生成")
            
            with open(report_path, "r", encoding="utf-8") as f:
                report_data = json.load(f)
            
            logger.info("✅ 临床报告解析完成")
            
            # ==========================================
            # Step D: 上传所有结果文件到 MinIO
            # ==========================================
            logger.info("⬆️  上传结果文件到 MinIO...")
            result_files = collect_and_upload_files(task_id, local_task_dir)
            
            logger.info("✅ 所有文件上传完成")
            
            # ==========================================
            # Step E: 更新数据库
            # ==========================================
            task.status = "success"
            task.finished_at = datetime.utcnow()
            task.report_data = report_data
            task.result_files = result_files
            
            session.add(task)
            session.commit()
            
            logger.info(f"🎉 任务 {task_id} 成功完成")
            
            # ==========================================
            # Step F: 清理临时文件
            # ==========================================
            try:
                shutil.rmtree(local_task_dir)
                logger.info(f"🗑️  临时文件已清理: {local_task_dir}")
            except Exception as e:
                logger.warning(f"⚠️  清理临时文件失败: {e}")
            
            return {
                "status": "success",
                "task_id": task_id,
                "report_summary": {
                    "total_images": sum(len(v) for v in result_files["analysis_images"].values()),
                    "has_structure_mask": result_files["structure_mask"] is not None,
                    "has_ldh_mask": result_files["ldh_mask"] is not None
                }
            }
        
        except subprocess.TimeoutExpired as e:
            logger.error(f"❌ 任务超时: {e}")
            task.status = "failed"
            task.finished_at = datetime.utcnow()
            session.add(task)
            session.commit()
            
            # 清理
            try:
                shutil.rmtree(local_task_dir, ignore_errors=True)
            except:
                pass
            
            return {"status": "failed", "error": "Task timeout"}
        
        except Exception as e:
            logger.error(f"❌ 任务失败: {str(e)}")
            import traceback
            traceback.print_exc()
            
            task.status = "failed"
            task.finished_at = datetime.utcnow()
            session.add(task)
            session.commit()
            
            # 清理
            try:
                shutil.rmtree(local_task_dir, ignore_errors=True)
            except:
                pass
            
            return {"status": "failed", "error": str(e)}
