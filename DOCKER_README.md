# Spinodyne Docker 部署指南

## 前提条件

目标服务器需要：
- Docker 20.10+
- NVIDIA Container Toolkit（GPU 推理必需）
- 至少 30GB 可用磁盘空间

```bash
# 安装 NVIDIA Container Toolkit（如果还没有）
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## 构建镜像

### 方式一：在源服务器上构建

```bash
cd /root/Spinodyne

# 1. 准备构建文件（复制 conda 环境、模型权重等）
bash prepare_docker_build.sh

# 2. 构建 Docker 镜像
docker build -t spinodyne:latest .

# 3. 导出镜像（便于传输至其他服务器）
docker save spinodyne:latest | gzip > spinodyne.tar.gz
```

### 方式二：在目标服务器上加载

```bash
# 将 spinodyne.tar.gz 传输到目标服务器后：
docker load < spinodyne.tar.gz
```

## 运行

### 使用 docker-compose（推荐）

```bash
# 将 docker-compose.yml 复制到目标服务器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 使用 docker run

```bash
docker run -d \
  --name spinodyne \
  --gpus all \
  -p 25433:25433 \
  -p 25546:25546 \
  -p 25772:25772 \
  -v spinodyne_pg:/var/lib/postgresql/12/main \
  -v spinodyne_minio:/data/minio \
  spinodyne:latest
```

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 25433 | Vite 前端页面 |
| 后端 API | 25546 | FastAPI 服务 |
| MinIO | 25772 | 对象存储 |

> 端口可通过修改容器内 `/root/Spinodyne/config.json` 调整，但需同步修改 docker-compose.yml 的端口映射。

## 数据持久化

使用 docker-compose 时，以下数据通过 Docker volumes 持久化：
- `pg_data` — PostgreSQL 数据库
- `minio_data` — MinIO 对象存储
- `upload_data` — 上传临时文件

## 常见问题

### 容器启动后前端无法访问

检查日志：
```bash
docker logs spinodyne
```

### GPU 不可用

确认宿主机已安装 NVIDIA 驱动及 nvidia-container-toolkit：
```bash
nvidia-smi                    # 宿主机
docker run --rm --gpus all nvidia/cuda:12.6.3-base-ubuntu20.04 nvidia-smi  # 容器内
```

### 数据库需要重新初始化

```bash
docker exec -it spinodyne bash
rm /root/Spinodyne/.db_initialized
# 重启容器即可
```

### 修改配置

```bash
docker exec -it spinodyne bash
vi /root/Spinodyne/config.json
# 修改后需要重启容器
```
