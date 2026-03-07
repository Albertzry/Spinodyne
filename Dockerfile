# ============================================================================
# Spinodyne + TotalSpineSeg-v2 All-in-One Docker Image
# ============================================================================
# Includes: PostgreSQL 12, Redis, MinIO, Node.js 20, Conda tss env,
#           TotalSpineSeg-v2, model weights, Spinodyne backend + frontend
#
# Build:
#   docker build -t spinodyne:latest .
#
# Run:
#   docker run --gpus all -p 25433:25433 -p 25546:25546 -p 25772:25772 spinodyne:latest
# ============================================================================

FROM nvidia/cuda:12.6.3-runtime-ubuntu20.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# ── 1. System dependencies ─────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        # PostgreSQL 12
        postgresql postgresql-contrib \
        # Redis
        redis-server \
        # Build essentials
        curl wget ca-certificates gnupg \
        # Python 3 (system)
        python3 python3-pip python3-dev \
        # Misc utilities
        sudo lsb-release \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Node.js 20 ──────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── 3. MinIO ───────────────────────────────────────────────────────────────
RUN wget -q https://dl.min.io/server/minio/release/linux-amd64/minio \
        -O /usr/local/bin/minio \
    && chmod +x /usr/local/bin/minio

# ── 4. Conda tss environment ───────────────────────────────────────────────
# Copy the pre-built tss conda environment directly from the host
COPY tss_env/ /opt/conda/envs/tss/

# Create a minimal conda setup so "conda run -n tss" works
RUN pip3 install --no-cache-dir conda 2>/dev/null || true

# Create a wrapper script for "conda run -n tss" since conda might not work
# The celery worker calls: conda run -n tss python /root/TotalSpineSeg-v2/scripts/infer_ldh.py
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/bash' > /usr/local/bin/conda && \
    echo 'if [ "$1" = "run" ] && [ "$2" = "-n" ] && [ "$3" = "tss" ]; then' >> /usr/local/bin/conda && \
    echo '    shift 3  # remove "run -n tss"' >> /usr/local/bin/conda && \
    echo '    export PATH="/opt/conda/envs/tss/bin:$PATH"' >> /usr/local/bin/conda && \
    echo '    export CONDA_PREFIX="/opt/conda/envs/tss"' >> /usr/local/bin/conda && \
    echo '    exec "$@"' >> /usr/local/bin/conda && \
    echo 'else' >> /usr/local/bin/conda && \
    echo '    echo "conda wrapper: unsupported command: $*" >&2' >> /usr/local/bin/conda && \
    echo '    exit 1' >> /usr/local/bin/conda && \
    echo 'fi' >> /usr/local/bin/conda && \
    chmod +x /usr/local/bin/conda

# ── 5. TotalSpineSeg-v2 inference code ──────────────────────────────────────
COPY TotalSpineSeg-v2/ /root/TotalSpineSeg-v2/

# ── 6. Model weights (nnUNet results + exports only) ───────────────────────
COPY model_weights/nnUNet/ /opt/data/private/data_sum/nnUNet/

# ── 7. Spinodyne Backend ───────────────────────────────────────────────────
WORKDIR /root/Spinodyne

# Copy config first (shared by frontend and backend)
COPY config.json ./config.json
COPY start_services.sh ./start_services.sh

# Copy and install backend dependencies
COPY backend/ ./backend/
RUN pip3 install --no-cache-dir -r backend/requirements.txt

# ── 8. Spinodyne Frontend ──────────────────────────────────────────────────
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --prefer-offline

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── 9. Entrypoint ──────────────────────────────────────────────────────────
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# PostgreSQL needs this directory
RUN mkdir -p /var/run/postgresql && chown postgres:postgres /var/run/postgresql

# Create data directories
RUN mkdir -p /data/minio /root/Spinodyne/backend/data/uploads

# ── Environment variables ──────────────────────────────────────────────────
ENV TOTALSPINESEG_DATA=/opt/data/private/data_sum
ENV PATH="/opt/conda/envs/tss/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# ── Expose ports ───────────────────────────────────────────────────────────
# Frontend, Backend, MinIO (from config.json defaults)
EXPOSE 25433 25546 25772

ENTRYPOINT ["/docker-entrypoint.sh"]
