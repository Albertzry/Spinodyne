# Spinodyne 后端启动指南

服务器重启后，按以下顺序执行即可把后端跑起来。

## 统一配置（项目根目录 `config.json`）

前后端与后端服务的**端口、数据库、Redis、MinIO** 等均从 **`Spinodyne/config.json`** 读取。修改该文件后，无需改代码即可更换服务器/端口。

| 配置块 | 说明 |
|--------|------|
| `backend` | 后端 API 的 host / port（如 25306） |
| `frontend` | 前端 dev 的 host / port（如 25916） |
| `postgres` | 数据库 host、port、user、password、database |
| `redis` | Redis host、port、db |
| `minio` | endpoint、access_key、secret_key、bucket、secure |

可选：在 `backend/.env` 中设置环境变量可覆盖上述默认值（见 `backend/.env.example`）。

确保 PostgreSQL 用户与密码与 `config.json` 中 `postgres` 一致（见下方「配置 PostgreSQL 密码」），否则应用连库会失败。

---

## 1. 启动 PostgreSQL（pg_ctl，PostgreSQL 12）

PostgreSQL 不能以 root 运行，必须用系统用户 `postgres` 启动。若当前在 `/root` 下执行，postgres 用户无法进入该目录，会报 “Permission denied”；**请先切到 postgres 可读的目录再执行**（例如 `/tmp`）。你本机 `pg_ctl` 路径：`/usr/lib/postgresql/12/bin/pg_ctl`，数据目录需为已初始化过的目录（内含 `postgresql.conf`）。

```bash
cd /tmp && sudo -u postgres /usr/lib/postgresql/12/bin/pg_ctl -D /var/lib/postgresql/12/main start
```

**若报错 “postgresql.conf: No such file or directory”**：说明该路径下没有有效的数据库集群（未执行过 `initdb`），或数据目录不在这一处。请先确认本机真实数据目录：

```bash
# 查找本机 postgresql.conf 所在目录（即数据目录）
sudo find /var /usr -name postgresql.conf 2>/dev/null
```

用找到的**所在目录**替换上面命令里的 `-D` 路径再执行。若没有任何结果，说明尚未初始化集群，需要先初始化（见下方「首次初始化数据目录」）。

**首次初始化数据目录**（仅当系统里从未建过 12 的集群时）：  
Debian/Ubuntu 常用 `pg_createcluster`，例如：

```bash
sudo pg_createcluster 12 main --start
```

会创建并启动 `/var/lib/postgresql/12/main`。若系统没有 `pg_createcluster`，可用：

```bash
sudo -u postgres /usr/lib/postgresql/12/bin/initdb -D /var/lib/postgresql/12/main
```

然后再执行上面的 `cd /tmp && sudo -u postgres ... start`。

---

## 2. 配置 PostgreSQL 密码并创建数据库

代码里使用用户 `postgres`、密码 `password123`、数据库 `spinodyne`。首次需要设密码并建库：

```bash
# 以 postgres 用户进入 psql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';"
sudo -u postgres psql -c "CREATE DATABASE spinodyne;" 2>/dev/null || true
```

若 `spinodyne` 已存在会报错可忽略。若你使用 `ident`/`peer` 认证且不打算用密码，可只建库、不改密码，但应用用 `POSTGRES_URL` 连接时必须能通过认证（例如本机 trust 或已设密码）。

---

## 3. 启动 Redis（端口 25698）

代码里使用 `redis://127.0.0.1:25698/0`，无密码。

```bash
redis-server --port 25698 --daemonize yes
```

---

## 4. 启动 MinIO（端口 25957）

代码里使用 `MINIO_ENDPOINT=localhost:25957`，账号 `minioadmin` / `minioadmin`，桶名 `spinodyne`。MinIO 默认账号即为 minioadmin/minioadmin，与代码一致。

```bash
mkdir -p /tmp/minio-spinodyne
minio server /tmp/minio-spinodyne --address ":25957"
```

建议在 **screen** 或 **tmux** 中后台运行，或新开一个终端保持运行。MinIO 需先安装，例如：

```bash
# 示例：Linux 下载
# wget https://dl.min.io/server/minio/release/linux-amd64/minio
# chmod +x minio
# mv minio ~/bin/ 或 /usr/local/bin/
```

---

## 5. 后端环境与数据库初始化

在项目根目录下：

```bash
cd /root/Spinodyne/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

若已有 `.venv` 且依赖已装，只需：

```bash
cd /root/Spinodyne/backend
source .venv/bin/activate
```

复制环境变量（首次或未配置时）。若 `.env.example` 为空，可直接在 `backend` 下新建 `.env`，内容与代码默认一致即可（不建则用 `config.py` 默认值）：

```bash
# 可选：新建 .env 覆盖默认值
# POSTGRES_URL=postgresql://postgres:password123@localhost:5432/spinodyne
# REDIS_URL=redis://127.0.0.1:25698/0
# MINIO_ENDPOINT=localhost:25957
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin
# MINIO_BUCKET=spinodyne
```

执行数据库建表 + MinIO 桶初始化（会删表重建，仅开发/初始化时用）：

```bash
python init_db.py
```

---

## 6. 启动后端 API 与 Celery Worker

**终端 1 – FastAPI：**（host/port 来自 `config.json`）

```bash
cd /root/Spinodyne/backend
source .venv/bin/activate
python run.py
# 或：uvicorn app.main:app --host 0.0.0.0 --port 25306 --reload
```

**终端 2 – Celery：**

```bash
cd /root/Spinodyne/backend
source .venv/bin/activate
celery -A app.worker.celery_app worker --loglevel=info
```

---

## 一键脚本示例（本机进程，PostgreSQL 12，与代码配置一致）

可将下面内容保存为 `scripts/start-services.sh` 执行（已按你本机 PostgreSQL 12 路径与代码中的账号写好）：

```bash
#!/bin/bash
set -e
PGCTL=/usr/lib/postgresql/12/bin/pg_ctl
PGDATA=/var/lib/postgresql/12/main

(cd /tmp && sudo -u postgres "$PGCTL" -D "$PGDATA" start)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE spinodyne;" 2>/dev/null || true
redis-server --port 25698 --daemonize yes

echo "PostgreSQL、Redis 已启动（postgres 密码 password123，库 spinodyne）。"
echo "请另开终端启动 MinIO："
echo "  mkdir -p /tmp/minio-spinodyne && minio server /tmp/minio-spinodyne --address \":25957\""
echo "然后执行："
echo "  cd /root/Spinodyne/backend && source .venv/bin/activate && python init_db.py"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 25306 --reload"
echo "  celery -A app.worker.celery_app worker --loglevel=info"
```

---

## 小结：最少需要执行的指令（端口等以根目录 `config.json` 为准）

| 步骤 | 指令 |
|------|------|
| 1 | `cd /tmp && sudo -u postgres /usr/lib/postgresql/12/bin/pg_ctl -D /var/lib/postgresql/12/main start`（若报 postgresql.conf 不存在，见文档「1. 启动 PostgreSQL」） |
| 2 | `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';"`（首次或未设密码时；密码需与 `config.json` 中 `postgres.password` 一致） |
| 3 | `sudo -u postgres psql -c "CREATE DATABASE spinodyne;"`（首次或未建库时） |
| 4 | `redis-server --port 25698 --daemonize yes`（端口需与 `config.json` 中 `redis.port` 一致） |
| 5 | 另开终端：`mkdir -p /tmp/minio-spinodyne && minio server /tmp/minio-spinodyne --address ":25957"`（端口需与 `config.json` 中 `minio.endpoint` 一致） |
| 6 | `cd /root/Spinodyne/backend && source .venv/bin/activate && python init_db.py` |
| 7 | `python run.py`（后端 host/port 来自 `config.json` 的 `backend`） |
| 8 | 再开终端：`celery -A app.worker.celery_app worker --loglevel=info` |

前端：在 `frontend` 目录下执行 `npm run dev`，端口与 API 代理目标由根目录 `config.json` 中的 `frontend` / `backend` 决定。
