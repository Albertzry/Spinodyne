# Spinodyne

Spinodyne is a full-stack platform for **intelligent spinal imaging analysis**. After uploading a `.nii.gz` scan, the system runs an asynchronous AI pipeline for segmentation and quantitative analysis, then presents 3D images plus vertebral/disc/global metrics in the frontend, with support for patient records and result comparison.

---

## 1. Project Purpose and Positioning

The project aims to productize spinal imaging analysis into a traceable, reviewable, and comparable workflow:

- **Integrated preprocessing and quantitative analysis**: an end-to-end loop from upload to structured output.
- **Asynchronous task execution**: long-running AI inference is handled by Celery while the UI tracks status.
- **Result visualization**: both 3D image viewing and structured numerical metrics.
- **Patient record management**: one patient can be linked to multiple studies for longitudinal follow-up.

---

## 2. Core Capabilities

- Upload `.nii.gz` medical images and create tasks (including patient metadata and study date)
- Two-stage AI inference (`infer_ldh.py` + `calculate.py`) in the `tss` conda environment
- Automatically parse `clinical_report.json` / `report.json` into the database
- Automatically upload structured outputs (3D masks and preview images) to MinIO
- Frontend views:
  - task list and status (`pending / processing / success / failed`)
  - single-task dashboard (3D + metrics)
  - historical comparison dashboard
- Multi-language (Chinese/English) and dark/light theme support

---

## 3. Technical Architecture Overview

### Backend (`backend/`)

- **FastAPI**: external REST API
- **SQLModel + PostgreSQL**: persistence for tasks and structured metrics
- **Celery + Redis**: asynchronous task queue
- **MinIO**: object storage for scans, masks, and preview assets

### Frontend (`frontend/`)

- **React + TypeScript + Vite**
- **Ant Design** UI
- **NiiVue** for medical image visualization

### AI Inference Flow

1. Upload raw image to MinIO and create a task (`pending`)
2. Celery worker picks up the task (`processing`)
3. Execute in `tss` conda environment:
   - inference script: `infer_ldh.py`
   - calculation script: `calculate.py`
4. Parse output into the database and upload derived files to MinIO
5. Mark task as `success` (or `failed` on error)

---

## 4. Directory Structure (Simplified)

```text
Spinodyne/
├── config.json                # Unified global config (ports/DB/Redis/MinIO)
├── start_services.sh          # Start PostgreSQL / Redis / MinIO
├── backend/
│   ├── init_db.py             # Initialize DB tables + MinIO bucket
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI entry
│       ├── api/tasks_router.py
│       ├── worker/tasks.py    # Celery inference tasks
│       ├── services/ingestion.py
│       ├── models/            # Task/Patient/Result models
│       └── core/config.py     # Load config.json + env overrides
└── frontend/
    ├── package.json
    ├── vite.config.ts         # dev server / API proxy
    └── src/
        ├── pages/             # inference / records / result / compare
        └── components/        # NiiVue and data display components
```

---

## 5. Prerequisites

Make sure your environment has the following:

- Python 3.x (backend)
- Node.js + npm (frontend)
- PostgreSQL
- Redis
- MinIO
- Conda (for the `tss` inference environment)
- An installed and accessible TotalSpineSeg-v2 project (not included in this repository)

> Note: The TotalSpineSeg-v2 path is determined by backend worker configuration. If your deployment path differs, update the inference script paths in `/home/runner/work/Spinodyne/Spinodyne/backend/app/worker/tasks.py` (or refactor to env/config-based path management).

---

## 6. Configuration (Read This First)

The project uses a **single source of configuration**: root `config.json`.  
Both backend and frontend read from it, and backend also supports `.env` overrides.

Key configuration entries:

- `backend.host / backend.port`
- `frontend.host / frontend.port`
- `postgres.{host,port,user,password,database}`
- `redis.{host,port,db}`
- `minio.{endpoint,access_key,secret_key,bucket,secure}`

Backend overrides can be set in `/home/runner/work/Spinodyne/Spinodyne/backend/.env` (see `/home/runner/work/Spinodyne/Spinodyne/backend/.env.example`).

---

## 7. Local Startup (Recommended Order)

### 7.1 Start Infrastructure Services

```bash
# Enter repository root (auto-resolve inside a Git repository)
cd "$(git rev-parse --show-toplevel)"
bash start_services.sh
```

This script reads Redis/MinIO ports from `config.json` and starts:

- PostgreSQL
- Redis
- MinIO (default script log path is `/var/log/minio.log`; adjust for your deployment permissions if needed)

### 7.2 Initialize Database

```bash
cd backend
python init_db.py
```

### 7.3 Start Backend API

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 25285 --reload
```

### 7.4 Start Celery Worker

```bash
cd backend
celery -A app.worker.celery_app worker --loglevel=info
```

### 7.5 Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 8. Main API (`/api/tasks`)

The backend mounts `tasks_router` in `app/main.py` with prefix `/api`.

### 8.1 Create Task and Upload Image

- `POST /api/tasks/upload`
- Form fields (alias-compatible):
  - `file` or `upload`: `.nii.gz` file (max 500MB)
  - `patient_name` or `name`
  - `patient_id_external` or `patient_id`
  - `study_date` (optional)

### 8.2 List Tasks

- `GET /api/tasks`

### 8.3 Get Single Task

- `GET /api/tasks/{task_id}`

### 8.4 Get Task Result (After Success)

- `GET /api/tasks/{task_id}/result`
- Response includes:
  - 3D file URLs (raw image, structure mask, LDH mask)
  - vertebral metric list
  - disc metric list
  - global metrics
  - preview URL map

### 8.5 Delete Task

- `DELETE /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/delete` (compatibility endpoint)

---

## 9. Data Models (Key Fields)

- **Patient**: `external_id`, `name`
- **Task**: `status`, `study_date`, `raw_scan_key`, `result_files`, `error_message`
- **VertebraResult**: `level`, `vh_anterior`, `vh_posterior`, `ap_diameter`
- **DiscResult**: `level`, `dh`, `dhi`, `hdr`, `dia`, `scan_height_a/m/p`
- **GlobalMetric**: `ll`, `ss`, `lsa`, `pd`, `pa`, `par`, `plr`

---

## 10. Frontend Pages

- `/inference`: upload and task processing entry
- `/records`: patient/task record list
- `/result/:id`: single-task result dashboard
- `/compare/:oldId/:newId`: two-task comparison dashboard

---

## 11. Development and Validation

Available commands in this repository:

- Frontend dev: `npm run dev`
- Frontend build: `npm run build`
- Frontend preview: `npm run preview`

For automated test and static-check entry points, refer to the current `package.json`, backend tool configuration, and CI workflows.

---

## 12. Troubleshooting

1. **Task does not progress after upload**
   - Check whether Celery worker is running
   - Check whether Redis is running on the port from `config.json`

2. **Task immediately fails (`failed`)**
   - Verify that the `tss` conda environment exists
   - Verify TotalSpineSeg-v2 script path configuration and executable availability
   - Check subprocess errors in worker logs

3. **No result images shown in frontend**
   - Check MinIO service and bucket status
   - Check if objects were uploaded under `tasks/{task_id}/...`

4. **Frontend cannot reach backend**
   - Check frontend/backend ports in `config.json`
   - Check Vite proxy config (`/home/runner/work/Spinodyne/Spinodyne/frontend/vite.config.ts`)

---

## 13. License

This repository includes a `LICENSE` file (CC BY-NC 4.0).
