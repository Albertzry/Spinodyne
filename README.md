# Spinodyne
AI platform that spots early disc trouble and shows how to keep your spine moving strong.

**配置**：端口、数据库、Redis、MinIO 等统一在项目根目录 **`config.json`** 中修改，前后端与后端服务均从该文件读取。

```bash
# 后端（端口等来自 config.json）
cd backend && source .venv/bin/activate && python run.py
celery -A app.worker.celery_app worker --loglevel=info

# 前端（端口与 API 代理来自 config.json）
cd frontend && npm run dev
```
