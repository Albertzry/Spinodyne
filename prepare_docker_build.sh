#!/bin/bash
# ===========================================================================
# prepare_docker_build.sh
# 准备 Docker 构建所需的文件（在构建镜像之前运行此脚本）
#
# 用法:
#   cd /root/Spinodyne
#   bash prepare_docker_build.sh
#   docker build -t spinodyne:latest .
# ===========================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  准备 Docker 构建环境..."
echo "=========================================="

# ── 1. 复制 conda tss 环境 ────────────────────────────────────────────────
echo ""
echo ">>> [1/3] 复制 Conda tss 环境 (~13GB)..."
echo "    源: /opt/conda/envs/tss/"
echo "    目标: $SCRIPT_DIR/tss_env/"

if [ -d "$SCRIPT_DIR/tss_env" ]; then
    echo "    tss_env/ 已存在，跳过。如需重新复制，请先删除: rm -rf tss_env/"
else
    echo "    正在复制（这可能需要几分钟）..."
    cp -a /opt/conda/envs/tss/ "$SCRIPT_DIR/tss_env/"
    echo "    ✅ Conda tss 环境复制完成"
fi

# ── 2. 复制模型权重 ──────────────────────────────────────────────────────
echo ""
echo ">>> [2/3] 复制模型权重..."
echo "    源: /opt/data/private/data_sum/nnUNet/"
echo "    目标: $SCRIPT_DIR/model_weights/nnUNet/"

if [ -d "$SCRIPT_DIR/model_weights/nnUNet" ]; then
    echo "    model_weights/ 已存在，跳过。如需重新复制，请先删除: rm -rf model_weights/"
else
    echo "    仅复制 results/ 和 exports/（不含 raw/、preprocessed/、bids/ 训练数据）"
    mkdir -p "$SCRIPT_DIR/model_weights/nnUNet"

    # 复制 results（模型检查点，~771MB）
    if [ -d "/opt/data/private/data_sum/nnUNet/results" ]; then
        echo "    正在复制 nnUNet/results/ ..."
        cp -a /opt/data/private/data_sum/nnUNet/results/ "$SCRIPT_DIR/model_weights/nnUNet/results/"
        echo "    ✅ results 复制完成"
    fi

    # 复制 exports（导出模型，~440MB）
    if [ -d "/opt/data/private/data_sum/nnUNet/exports" ]; then
        echo "    正在复制 nnUNet/exports/ ..."
        cp -a /opt/data/private/data_sum/nnUNet/exports/ "$SCRIPT_DIR/model_weights/nnUNet/exports/"
        echo "    ✅ exports 复制完成"
    fi
fi

# ── 3. 复制 TotalSpineSeg-v2 代码 ────────────────────────────────────────
echo ""
echo ">>> [3/3] 复制 TotalSpineSeg-v2 推理代码..."
echo "    源: /root/TotalSpineSeg-v2/"
echo "    目标: $SCRIPT_DIR/TotalSpineSeg-v2/"

if [ -d "$SCRIPT_DIR/TotalSpineSeg-v2" ]; then
    echo "    TotalSpineSeg-v2/ 已存在，跳过。如需重新复制，请先删除: rm -rf TotalSpineSeg-v2/"
else
    echo "    正在复制..."
    cp -a /root/TotalSpineSeg-v2/ "$SCRIPT_DIR/TotalSpineSeg-v2/"
    # 清理不需要的文件
    rm -rf "$SCRIPT_DIR/TotalSpineSeg-v2/.git" 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/TotalSpineSeg-v2/__pycache__" 2>/dev/null || true
    echo "    ✅ TotalSpineSeg-v2 复制完成"
fi

echo ""
echo "=========================================="
echo "  ✅ 准备完成！"
echo ""
echo "  构建文件大小:"
du -sh "$SCRIPT_DIR/tss_env/" 2>/dev/null || echo "    tss_env/: (not found)"
du -sh "$SCRIPT_DIR/model_weights/" 2>/dev/null || echo "    model_weights/: (not found)"
du -sh "$SCRIPT_DIR/TotalSpineSeg-v2/" 2>/dev/null || echo "    TotalSpineSeg-v2/: (not found)"
echo ""
echo "  现在可以构建 Docker 镜像了："
echo "    docker build -t spinodyne:latest ."
echo ""
echo "  或使用 docker-compose："
echo "    docker-compose build"
echo "=========================================="
