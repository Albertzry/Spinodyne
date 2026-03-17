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
- Two-stage AI inference (`model/scripts/infer_ldh.py` + `model/calculate.py`) in the `tss` conda environment
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
   - inference script: `model/scripts/infer_ldh.py`
   - calculation script: `model/calculate.py`
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
├── model/                     # Inference code (vendored)
│   ├── scripts/infer_ldh.py    # Two-stage LDH inference entry
│   ├── calculate.py            # Clinical parameter computation
│   ├── totalspineseg/          # Core inference package
│   └── weights/                # Large weights (NOT in git; provided via Release)
└── frontend/
    ├── package.json
    ├── vite.config.ts         # dev server / API proxy
    └── src/
        ├── pages/             # inference / records / result / compare
        └── components/        # NiiVue and data display components
```

---

## 5. Model Attribution (Inference Only)

The model inference code in `model/` is extracted from [`Albertzry/TotalSpineSeg`](https://github.com/Albertzry/TotalSpineSeg).

- This repository **only vendors the inference portion** required to run the backend Celery pipeline (`infer_ldh.py` + `calculate.py`).
- For **full training code, training recipes, and detailed model documentation**, please refer to the upstream project: [`Albertzry/TotalSpineSeg`](https://github.com/Albertzry/TotalSpineSeg).

---

## 6. Model Weights (Release Asset) and Expected Layout

Large weight files are **not tracked by git**. They are expected under `model/weights/` at runtime.

### 6.1 Download + extract into this repo

Download `nnUNet.tar.gz` from the weights release:

- [Albertzry/Spinodyne `weights` release](https://github.com/Albertzry/Spinodyne/releases/tag/weights)

Then extract it into this repo:

```bash
# from repo root
tar -xzf nnUNet.tar.gz -C model/weights
```

After extraction, the expected directory structure is:

```text
Spinodyne/
└── model/
    └── weights/
        └── nnUNet/
            └── results/
                ├── Dataset101_TotalSpineSeg_step1/
                ├── Dataset102_TotalSpineSeg_step2/
                ├── Dataset105_TotalSpineSeg_LDH/
                └── Dataset107_LDH_ROI/
```

If the structure matches the above, the backend worker will set:

- `TOTALSPINESEG_DATA=Spinodyne/model/weights`

and then run inference in the `tss` conda environment.

---

## 7. Prerequisites

Make sure your environment has the following:

- Python 3.x (backend)
- Node.js + npm (frontend)
- PostgreSQL
- Redis
- MinIO
- Conda (for the `tss` inference environment)

> Note: The inference pipeline is executed via `conda run -n tss ...` (the conda environment remains `tss`).

---

## 8. Configuration (Read This First)

The project uses a **single source of configuration**: root `config.json`.  
Both backend and frontend read from it, and backend also supports `.env` overrides.

Key configuration entries:

- `backend.host / backend.port`
- `frontend.host / frontend.port`
- `postgres.{host,port,user,password,database}`
- `redis.{host,port,db}`
- `minio.{endpoint,access_key,secret_key,bucket,secure}`

Backend overrides can be set in `backend/.env` (see `backend/.env.example`).

---

## 9. Deployment Notes (Shared Server / Multi-Host)

This repository includes `start_services.sh` mainly for a **shared / containerized server** workflow where you may need to **restart infrastructure services on each deployment**.

In many production deployments, **PostgreSQL / Redis / MinIO are already running** (managed by ops/K8s/docker-compose/systemd). In that case:

- **Do NOT run** `start_services.sh`
- Only make sure `config.json` (and optional `backend/.env`) points to the correct existing services.

### 9.1 What runs on which machine

- **API + worker machine** (required):
  - Run `bash start_backend.sh start` (starts FastAPI + Celery worker)
  - Must have the `tss` conda environment and model weights under `model/weights/`
- **Infrastructure machine** (optional; if not already provided):
  - PostgreSQL
  - Redis
  - MinIO

You can deploy these on the same machine or separate machines. The only requirement is network connectivity and correct configuration.

### 9.2 How to point Spinodyne to existing services

Edit root `config.json`:

- **PostgreSQL**
  - `postgres.host`, `postgres.port`, `postgres.user`, `postgres.password`, `postgres.database`
- **Redis**
  - `redis.host`, `redis.port`, `redis.db`
- **MinIO**
  - `minio.endpoint` (format: `host:port`)
  - `minio.access_key`, `minio.secret_key`, `minio.bucket`, `minio.secure`

If you need to override config per-environment without changing `config.json`, use `backend/.env` (see `backend/.env.example`) to set:

- `POSTGRES_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE`

### 9.3 When to use `start_services.sh`

Use `bash start_services.sh` only when **you are responsible for starting** these services on the current server (e.g., shared container where services are not persisted across deployments).

---

## 9. Local Startup (Recommended Order)

### 9.1 Start Infrastructure Services

```bash
# Enter repository root (auto-resolve inside a Git repository)
cd "$(git rev-parse --show-toplevel)"
bash start_services.sh
```

This script reads Redis/MinIO ports from `config.json` and starts:

- PostgreSQL
- Redis
- MinIO (default script log path is `/var/log/minio.log`; adjust for your deployment permissions if needed)

### 9.2 Initialize Database

```bash
cd backend
python init_db.py
```

### 9.3 Start Backend API + Celery Worker (Production-like)

```bash
cd "$(git rev-parse --show-toplevel)"
bash start_backend.sh start
```

This script reads backend host/port from `config.json`, starts both processes in background, and writes logs to:

- `backend/logs/uvicorn.log`
- `backend/logs/celery.log`

PID files are written to:

- `backend/run/uvicorn.pid`
- `backend/run/celery.pid`

### 9.4 Start Celery Worker

Celery worker is already started by `start_backend.sh start`.

Optional runtime operations:

```bash
bash start_backend.sh status
bash start_backend.sh restart
bash start_backend.sh stop
```

### 9.5 Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 10. Main API (`/api/tasks`)

The backend mounts `tasks_router` in `app/main.py` with prefix `/api`.

### 10.1 Create Task and Upload Image

- `POST /api/tasks/upload`
- Form fields (alias-compatible):
  - `file` or `upload`: `.nii.gz` file (max 500MB)
  - `patient_name` or `name`
  - `patient_id_external` or `patient_id`
  - `study_date` (optional)

### 10.2 List Tasks

- `GET /api/tasks`

### 10.3 Get Single Task

- `GET /api/tasks/{task_id}`

### 10.4 Get Task Result (After Success)

- `GET /api/tasks/{task_id}/result`
- Response includes:
  - 3D file URLs (raw image, structure mask, LDH mask)
  - vertebral metric list
  - disc metric list
  - global metrics
  - preview URL map

### 10.5 Delete Task

- `DELETE /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/delete` (compatibility endpoint)

---

## 11. Data Models (Key Fields)

- **Patient**: `external_id`, `name`
- **Task**: `status`, `study_date`, `raw_scan_key`, `result_files`, `error_message`
- **VertebraResult**: `level`, `vh_anterior`, `vh_posterior`, `ap_diameter`
- **DiscResult**: `level`, `dh`, `dhi`, `hdr`, `dia`, `scan_height_a/m/p`
- **GlobalMetric**: `ll`, `ss`, `lsa`, `pd`, `pa`, `par`, `plr`

---

## 12. Frontend Pages

- `/inference`: upload and task processing entry
- `/records`: patient/task record list
- `/result/:id`: single-task result dashboard
- `/compare/:oldId/:newId`: two-task comparison dashboard

---

## 13. Development and Validation

Available commands in this repository:

- Frontend dev: `npm run dev`
- Frontend build: `npm run build`
- Frontend preview: `npm run preview`

For automated test and static-check entry points, refer to the current `package.json`, backend tool configuration, and CI workflows.

---

## 14. Troubleshooting

1. **Task does not progress after upload**
   - Check whether Celery worker is running
   - Check whether Redis is running on the port from `config.json`

2. **Task immediately fails (`failed`)**
   - Verify that the `tss` conda environment exists
   - Verify inference scripts exist under `model/` and weights exist under `model/weights/` (see release section below)
   - Check subprocess errors in worker logs

3. **No result images shown in frontend**
   - Check MinIO service and bucket status
   - Check if objects were uploaded under `tasks/{task_id}/...`

4. **Frontend cannot reach backend**
   - Check frontend/backend ports in `config.json`
   - Check Vite proxy config (`frontend/vite.config.ts`)

---

## 15. License

This repository includes a `LICENSE` file (CC BY-NC 4.0).
