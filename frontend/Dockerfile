FROM node:20-bullseye AS builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY config.json /app/config.json
COPY frontend /app/frontend

RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
