FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    CONDA_DIR=/opt/conda \
    PATH=/opt/conda/bin:$PATH

WORKDIR /app

RUN sed -i 's|http://security.ubuntu.com/ubuntu|http://archive.ubuntu.com/ubuntu|g' /etc/apt/sources.list \
    && apt-get update -o Acquire::Retries=10 \
    && apt-get install -y --fix-missing \
    -o Acquire::Retries=10 \
    --no-install-recommends \
    wget \
    bzip2 \
    ca-certificates \
    git \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libsndfile1 \
    ffmpeg \
    dcm2niix \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh \
    && bash /tmp/miniconda.sh -b -p "$CONDA_DIR" \
    && rm -f /tmp/miniconda.sh \
    && conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main \
    && conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r \
    && conda config --set auto_activate_base false

COPY backend/requirements.txt /tmp/backend-requirements.txt
COPY model /app/model

RUN conda create -n tss -y python=3.10 pip

RUN conda run -n tss pip install --upgrade pip setuptools wheel

RUN conda run -n tss pip install --index-url https://download.pytorch.org/whl/cu121 torch torchvision torchaudio

RUN conda run -n tss pip install "nnunetv2<=2.4.2"

RUN conda run -n tss pip install -r /tmp/backend-requirements.txt

RUN conda run -n tss pip install /app/model

RUN conda clean -afy

COPY backend /app/backend
COPY config.json /app/config.json
COPY backend/docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh \
    && mkdir -p /app/backend/data/uploads

WORKDIR /app/backend

ENV CONFIG_FILE=/app/config.json \
    TOTALSPINESEG_DATA=/app/model/weights \
    PYTHONPATH=/app/backend

EXPOSE 25025

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["api"]
