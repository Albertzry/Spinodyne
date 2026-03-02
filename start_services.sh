#!/bin/bash

# start_services.sh - 启动本地基础服务 (PostgreSQL, Redis, MinIO)

# 获取当前脚本所在目录的 config.json
CONFIG_FILE="$(dirname "$0")/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 找不到配置文件: $CONFIG_FILE"
    exit 1
fi

echo ">>> 解析 config.json 中配置的端口..."
REDIS_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['redis']['port'])")
MINIO_ENDPOINT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['minio']['endpoint'])")
MINIO_PORT=$(echo $MINIO_ENDPOINT | awk -F':' '{print $NF}')

echo " - Redis 端口: $REDIS_PORT"
echo " - MinIO 端口: $MINIO_PORT"

echo ">>> 停止已存在的基础服务进程..."
sudo service postgresql stop >/dev/null 2>&1
sudo service redis-server stop >/dev/null 2>&1
pkill -f redis-server
pkill -f "minio server"
sleep 2

echo ">>> 修复 Redis 日志目录权限..."
mkdir -p /var/log/redis
touch /var/log/redis/redis-server.log
chmod 777 /var/log/redis /var/log/redis/redis-server.log
chown redis:redis /var/log/redis /var/log/redis/redis-server.log 2>/dev/null || true

echo ">>> 启动 Redis 数据库 (端口: $REDIS_PORT)..."
# 不使用 service 默认启动而是通过指定 config.json 配置的端口后台运行
redis-server --daemonize yes --port "$REDIS_PORT"

echo ">>> 启动 PostgreSQL 数据库..."
# 在容器中直接使用 service 启动 postgresql
sudo service postgresql start

echo ">>> 启动 MinIO 对象存储..."
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin

# 创建 MinIO 数据存储目录
mkdir -p /data/minio

# 在后台启动 MinIO 服务
nohup minio server /data/minio --address ":$MINIO_PORT" > /var/log/minio.log 2>&1 &

echo "=========================================="
echo "基础服务启动脚本执行完毕！"
echo "您可以检查各个服务状态:"
echo " - Redis: service redis-server status"
echo " - PostgreSQL: service postgresql status"
echo " - MinIO 日志: cat /var/log/minio.log"
echo "=========================================="
