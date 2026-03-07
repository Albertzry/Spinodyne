#!/bin/bash
echo "开始打包离线部署包..."
tar -czvf spinodyne_deploy.tar.gz \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="__pycache__" \
    --exclude="preprocessed" \
    --exclude="raw" \
    --exclude="bids" \
    --exclude="spinodyne_deploy.tar.gz" \
    tss_env model_weights TotalSpineSeg-v2 backend frontend \
    Dockerfile docker-entrypoint.sh docker-compose.yml .dockerignore config.json start_services.sh DOCKER_README.md package.json package-lock.json npm-shrinkwrap.json prepare_docker_build.sh
echo "打包完成！文件: spinodyne_deploy.tar.gz"
