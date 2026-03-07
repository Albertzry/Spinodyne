# Spinodyne

Spinodyne 是一个面向**脊柱影像智能分析**的全栈平台：上传 `.nii.gz` 影像后，系统会通过异步 AI 流水线完成分割与量化计算，并在前端展示 3D 影像、椎体/椎间盘指标及全局临床指标，支持病例管理和结果对比。

---

## 1. 项目意义与定位

该项目的目标是将脊柱影像分析流程产品化，形成可追踪、可复查、可对比的工作流：

- **临床前处理与量化分析一体化**：从上传到结构化结果输出的端到端闭环。
- **异步任务化**：耗时 AI 推理通过 Celery 执行，前端可持续查看任务状态。
- **结果可视化**：同时支持 3D 影像查看与数值指标查看。
- **病例管理**：一个患者可关联多次检查任务，方便纵向追踪。

---

## 2. 核心能力

- 上传 `.nii.gz` 医学影像并创建任务（含患者信息、检查日期）
- AI 两阶段推理（`infer_ldh.py` + `calculate.py`，运行于 `tss` conda 环境）
- 自动解析 `clinical_report.json` / `report.json` 并入库
- 自动上传结构化结果（3D 掩码、预览图）到 MinIO
- 前端展示：
  - 任务列表与状态（pending / processing / success / failed）
  - 单任务结果大屏（3D + 指标）
  - 历史任务对比大屏（comparison）
- 多语言（中/英）与深浅色主题

---

## 3. 技术架构概览

### 后端（`backend/`）

- **FastAPI**：对外 REST API
- **SQLModel + PostgreSQL**：任务与结构化指标存储
- **Celery + Redis**：异步任务队列
- **MinIO**：影像文件、掩码与预览图对象存储

### 前端（`frontend/`）

- **React + TypeScript + Vite**
- **Ant Design** UI
- **NiiVue** 医学影像可视化

### AI 推理链路

1. 上传原始影像到 MinIO，创建 Task（状态 `pending`）
2. Celery Worker 拉起任务（状态 `processing`）
3. 在 `tss` conda 环境执行：
   - 推理脚本：`infer_ldh.py`
   - 计算脚本：`calculate.py`
4. 解析结果并写入数据库，上传衍生文件到 MinIO
5. 任务完成后状态更新为 `success`（异常则 `failed`）

---

## 4. 目录结构（简版）

```text
Spinodyne/
├── config.json                # 全局统一配置（端口/数据库/Redis/MinIO）
├── start_services.sh          # 启动 PostgreSQL / Redis / MinIO
├── backend/
│   ├── init_db.py             # 初始化数据库表 + MinIO bucket
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI 入口
│       ├── api/tasks_router.py
│       ├── worker/tasks.py    # Celery 推理任务
│       ├── services/ingestion.py
│       ├── models/            # Task/Patient/Result 数据模型
│       └── core/config.py     # 读取 config.json + 环境变量覆盖
└── frontend/
    ├── package.json
    ├── vite.config.ts         # dev server / API 代理
    └── src/
        ├── pages/             # inference / records / result / compare
        └── components/        # NiiVue 及数据展示组件
```

---

## 5. 运行前准备

请先确保系统具备以下依赖：

- Python 3.x（后端）
- Node.js + npm（前端）
- PostgreSQL
- Redis
- MinIO
- Conda（用于运行 `tss` 推理环境）
- 已安装并可访问 TotalSpineSeg-v2（本仓库不包含该推理工程）

> 注意： TotalSpineSeg-v2 路径由后端 Worker 配置决定；如你的部署路径不同，请同步调整 `backend/app/worker/tasks.py` 中的推理脚本路径（也可按需改造成环境变量/配置项）。

---

## 6. 配置说明（强烈建议先看）

项目采用**单一配置源**：根目录 `config.json`。  
后端与前端都会读取它（后端还支持 `.env` 覆盖）。

关键配置项示例：

- `backend.host / backend.port`
- `frontend.host / frontend.port`
- `postgres.{host,port,user,password,database}`
- `redis.{host,port,db}`
- `minio.{endpoint,access_key,secret_key,bucket,secure}`

后端可通过 `backend/.env` 覆盖，示例见：`backend/.env.example`。

---

## 7. 本地启动（推荐顺序）

### 7.1 启动基础服务

```bash
# 进入仓库根目录（Git 仓库下可自动解析）
cd "$(git rev-parse --show-toplevel)"
bash start_services.sh
```

该脚本会读取 `config.json` 中 Redis/MinIO 端口，并尝试启动：

- PostgreSQL
- Redis
- MinIO（脚本默认将日志写入 `/var/log/minio.log`，若权限受限请按部署环境调整）

### 7.2 初始化数据库

```bash
cd backend
python init_db.py
```

### 7.3 启动后端 API

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 25285 --reload
```

### 7.4 启动 Celery Worker

```bash
cd backend
celery -A app.worker.celery_app worker --loglevel=info
```

### 7.5 启动前端

```bash
cd frontend
npm install
npm run dev
```

---

## 8. 主要 API（`/api/tasks`）

后端在 `app/main.py` 中挂载了 `tasks_router`，前缀为 `/api`。

### 8.1 创建任务并上传影像

- `POST /api/tasks/upload`
- 表单字段（兼容别名）：
  - `file` 或 `upload`：`.nii.gz` 文件（最大 500MB）
  - `patient_name` 或 `name`
  - `patient_id_external` 或 `patient_id`
  - `study_date`（可选）

### 8.2 查询任务列表

- `GET /api/tasks`

### 8.3 查询单任务信息

- `GET /api/tasks/{task_id}`

### 8.4 查询任务结果（成功后）

- `GET /api/tasks/{task_id}/result`
- 返回内容包含：
  - 3D 文件 URL（原图、结构掩码、LDH 掩码）
  - 椎体指标列表
  - 椎间盘指标列表
  - 全局指标
  - 预览图 URL 集合

### 8.5 删除任务

- `DELETE /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/delete`（兼容方式）

---

## 9. 数据模型（核心字段）

- **Patient**：`external_id`、`name`
- **Task**：`status`、`study_date`、`raw_scan_key`、`result_files`、`error_message`
- **VertebraResult**：`level`、`vh_anterior`、`vh_posterior`、`ap_diameter`
- **DiscResult**：`level`、`dh`、`dhi`、`hdr`、`dia`、`scan_height_a/m/p`
- **GlobalMetric**：`ll`、`ss`、`lsa`、`pd`、`pa`、`par`、`plr`

---

## 10. 前端页面说明

- `/inference`：上传与任务处理入口
- `/records`：病例与任务记录列表
- `/result/:id`：单任务分析结果大屏
- `/compare/:oldId/:newId`：双任务对比分析

---

## 11. 开发与验证

当前仓库内可见命令：

- 前端开发：`npm run dev`
- 前端构建：`npm run build`
- 前端预览：`npm run preview`

自动化测试与静态检查入口请以仓库当前的 `package.json`、后端工具配置及 CI 工作流为准。

---

## 12. 常见问题排查

1. **上传后任务长时间不动**
   - 检查 Celery Worker 是否运行
   - 检查 Redis 是否按 `config.json` 端口启动

2. **任务直接失败（failed）**
   - 检查 `tss` conda 环境是否存在
   - 检查当前配置/代码中的 TotalSpineSeg-v2 脚本路径及可执行性
   - 查看 Worker 日志中的 subprocess 报错

3. **前端看不到结果图像**
   - 检查 MinIO 服务与 bucket 是否正常
   - 检查对象是否上传到 `tasks/{task_id}/...` 目录

4. **前端无法访问后端**
   - 检查 `config.json` 中前后端端口
   - 检查 Vite 代理配置（`frontend/vite.config.ts`）

---

## 13. License

本项目仓库附带 `LICENSE` 文件（CC BY-NC 4.0）。
