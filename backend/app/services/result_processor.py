import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_relative_url(file_path: Path) -> str:
    """
    Converts a file path to a static URL based on BASE_UPLOAD_DIR.
    """
    try:
        relative_path = file_path.relative_to(settings.BASE_UPLOAD_DIR)
        return f"/static/uploads/{relative_path}"
    except ValueError:
        logger.warning(f"File {file_path} is not inside BASE_UPLOAD_DIR {settings.BASE_UPLOAD_DIR}")
        return ""

def extract_level_id(filename_stem: str) -> str:
    """
    Extracts the level ID from the filename.
    Examples:
    - vh_L1 -> L1
    - angle_L1-L2 -> L1-L2
    - L1 -> L1
    """
    parts = filename_stem.split('_')
    # Check if the last part looks like a level (e.g. starts with C, T, L, S)
    # This is a simple heuristic.
    candidate = parts[-1]
    # If the candidate is strictly alphabetic (like 'metrics'), it might not be an ID.
    # But vertebral levels usually have numbers.
    return candidate

def build_image_map(preview_dir: Path) -> Dict[str, Dict[str, Dict[str, str]]]:
    """
    Scans the preview directory and constructs the image map.
    Structure: image_map[category][sub_category][level_id] = URL
    """
    image_map: Dict[str, Dict[str, Dict[str, str]]] = {}
    
    if not preview_dir.exists():
        return image_map

    # Iterate over categories
    for category_path in preview_dir.iterdir():
        if not category_path.is_dir():
            continue
        
        category = category_path.name
        image_map[category] = {}

        # Check for sub-directories (sub-categories)
        for sub_item in category_path.iterdir():
            if sub_item.is_dir():
                sub_category = sub_item.name
                image_map[category][sub_category] = {}
                
                for img_file in sub_item.glob("*.png"):
                    level_id = extract_level_id(img_file.stem)
                    image_map[category][sub_category][level_id] = get_relative_url(img_file)
            
            # Also handle images directly in category folder (if any, e.g. overview plots)
            elif sub_item.is_file() and sub_item.suffix == '.png':
                # Use "general" or similar as sub_category, or filename as ID
                # For compatibility with the requested structure, we might put them in a 'general' subkey
                # or just ignore if strict structure is required. 
                # The prompt asks for nested structure. 
                # Let's add them to a 'general' sub-category or use filename as key.
                if 'general' not in image_map[category]:
                    image_map[category]['general'] = {}
                image_map[category]['general'][sub_item.stem] = get_relative_url(sub_item)

    return image_map

def filter_report_data(report_data: Any) -> Dict[str, Any]:
    """
    Filters clinical report data for status='ok' and groups by hierarchy.
    """
    filtered_data = {
        "geometry": {
            "vertebral_height": {},
            "vertebral_ap_diameter": {},
            "disc_metrics": {}
        },
        "angles": {
            "disc_inclination_angle_DIA": {},
            # Add others if present in report, e.g. cobb
        },
        "herniation": {} # If present in report
    }
    
    # Check if report_data is a list (common for these tools) or dict
    items = []
    if isinstance(report_data, list):
        items = report_data
    elif isinstance(report_data, dict):
        # Maybe it has a 'sub_results' key or similar
        items = report_data.get('sub_results', [])
        # Also could be direct dict
    
    for item in items:
        if not isinstance(item, dict):
            continue
            
        if item.get("status") != "ok":
            continue
            
        # Extract Identifiers
        # Items usually refer to a vertebra (e.g. L1) or a disc (e.g. L1-L2)
        vertebra_idx = item.get("vertebra_idx") # e.g. L1
        disc_idx = item.get("disc_idx")         # e.g. L1-L2
        
        # Geometry: Vertebral Height & AP Diameter
        if vertebra_idx:
            if "vertebral_height" in item:
                filtered_data["geometry"]["vertebral_height"][vertebra_idx] = item["vertebral_height"]
            if "vertebral_ap_diameter" in item:
                 filtered_data["geometry"]["vertebral_ap_diameter"][vertebra_idx] = item["vertebral_ap_diameter"]
                 
        # Geometry: Disc Metrics
        if disc_idx:
            if "disc_metrics" in item:
                filtered_data["geometry"]["disc_metrics"][disc_idx] = item["disc_metrics"]
                
        # Angles
        if disc_idx and "disc_inclination_angle_DIA" in item:
             filtered_data["angles"]["disc_inclination_angle_DIA"][disc_idx] = item["disc_inclination_angle_DIA"]
             
        # Herniation (if present per level)
        # Assuming herniation data might be keyed by disc_idx
        if disc_idx and "herniation" in item:
             filtered_data["herniation"][disc_idx] = item["herniation"]

    return filtered_data

def process_task_results(task: Any, task_dir: str) -> Dict[str, Any]:
    """
    Main function to process and structure the task results.
    """
    path_task_dir = Path(task_dir)
    result_preview_dir = path_task_dir / "result" / "raw" / "preview"
    
    # 1. Build Image Map
    image_map = build_image_map(result_preview_dir)
    
    # 2. Process Report Data
    raw_report = task.result_json or {}
    filtered_report = filter_report_data(raw_report)
    
    # 3. Extract Global Metadata (if any)
    # Some reports have global angles at the root
    report_metadata = {
        "global_angles": raw_report.get("global_angles", {}),
        "notes": raw_report.get("notes", "")
    }

    # 4. Construct Structured Results
    # Combine data and images into the requested schema
    
    structured_results = {
        "geometry": {
            "data": filtered_report.get("geometry", {}),
            "images": image_map.get("geometry", {})
        },
        "angles": {
            "data": filtered_report.get("angles", {}),
            "images": image_map.get("angles", {})
        },
        "herniation": {
            "data": filtered_report.get("herniation", {}),
            "images": image_map.get("herniation", {})
        }
    }
    
    # 5. Base URLs for 3D files
    url_prefix = "/static/uploads"
    # Helper to find relative url
    def find_url(subpath: str) -> str:
        p = path_task_dir / subpath
        if p.exists():
            return get_relative_url(p)
        return ""

    files_3d = {
        "base_url": find_url("raw.nii.gz"),
        "structure_mask_url": find_url("infer_output/step2_output/raw.nii.gz"),
        "ldh_mask_url": find_url("infer_output/ldh_output/raw.nii.gz")
    }

    return {
        "task_info": {
            "task_uid": task.uid,
            "status": task.status
        },
        "files_3d": files_3d,
        "report_metadata": report_metadata,
        "structured_results": structured_results
    }
