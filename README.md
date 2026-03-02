# Spinodyne
AI platform that spots early disc trouble and shows how to keep your spine moving strong.

**配置**：端口、数据库、Redis、MinIO 等统一在项目根目录 **`config.json`** 中修改，前后端与后端服务均从该文件读取。

## 启动基础服务

请运行自带的 bash 脚本来在后台或系统服务中启动：

```bash
bash start_services.sh
```

```bash
# 后端（端口等来自 config.json）
uvicorn app.main:app --host 0.0.0.0 --port 25285 --reload 
celery -A app.worker.celery_app worker --loglevel=info
# 前端（端口与 API 代理来自 config.json）
cd frontend && npm run dev
```
