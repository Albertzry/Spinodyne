# Spinodyne
AI platform that spots early disc trouble and shows how to keep your spine moving strong.

celery -A app.worker.celery_app worker --loglevel=info
uvicorn app.main:app --host 0.0.0.0 --port 25792 --reload
npm run dev -- --port 25320 --host 0.0.0.0

# 1. 启动 Redis (消息队列)
# 尝试使用 systemctl (CentOS/Ubuntu 通用)
systemctl start redis
# 或者如果 systemctl 不好用，尝试 service 命令
# service redis-server start

# 2. 启动 PostgreSQL (数据库)
systemctl start postgresql
# 或者
# service postgresql start

# 3. 检查一下它们是否活过来了 (看到 Active: active (running) 就是成功)
systemctl status redis
systemctl status postgresql

# 1. 进入后端目录
cd /root/Spinodyne/backend

# 2. 激活后端 Conda 环境
conda activate spine_ai

# 3. 启动 Worker
# --loglevel=info 能让你看到任务接收和完成的日志，非常有安全感
celery -A app.worker.celery_app worker --loglevel=info

# 1. 进入后端目录
cd /root/Spinodyne/backend

# 2. 激活后端 Conda 环境 (每个新窗口都要重新激活)
conda activate spine_ai

# 3. 启动 API 服务
# --reload 参数允许你改代码后自动重启，生产环境可以去掉
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 1. 进入前端目录
cd /root/Spinodyne/frontend

# 2. 启动开发服务器
# --host 0.0.0.0 确保外网/端口映射能访问
npm run dev -- --host