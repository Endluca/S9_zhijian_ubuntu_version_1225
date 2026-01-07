# ==========================================
# 51Talk 视频质检系统 - 统一镜像
# 使用 s6-overlay 管理 nginx + uvicorn
# ==========================================

# Stage 1: 前端构建
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# 复制前端代码
COPY frontend/package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com

COPY frontend/ ./
RUN npm run build

# Stage 2: 运行时镜像 (Debian 12 bookworm)
FROM python:3.11-bookworm

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    xz-utils \
    curl \
    libpq5 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# 安装 s6-overlay
ARG S6_OVERLAY_VERSION=3.1.6.2
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
    && tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz \
    && rm /tmp/s6-overlay-*.tar.xz

# 设置 Python 环境
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装 Python 依赖
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend/ ./

# 复制前端构建产物
COPY --from=frontend-builder /build/dist /app/frontend/dist

# 创建临时目录
RUN mkdir -p /app/backend/temp/videos /app/backend/temp/frames

# 复制 nginx 配置
COPY gaea/nginx.conf /etc/nginx/nginx.conf

# 复制 s6 服务配置
COPY gaea/s6/ /etc/s6-overlay/s6-rc.d/

# 设置 s6 服务依赖
RUN mkdir -p /etc/s6-overlay/s6-rc.d/user/contents.d \
    && touch /etc/s6-overlay/s6-rc.d/user/contents.d/backend \
    && touch /etc/s6-overlay/s6-rc.d/user/contents.d/nginx

# 设置工作目录
WORKDIR /app

# 暴露端口
EXPOSE 80

# 环境变量（可被覆盖）
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/video_analysis \
    DEBUG=False

# 使用 s6-overlay 作为入口点
ENTRYPOINT ["/init"]
