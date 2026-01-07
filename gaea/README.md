# Gaea 部署方案

前后端一体化 Docker 镜像，使用 s6-overlay 管理 nginx + uvicorn 进程。

## 目录结构

```
gaea/
├── Dockerfile          # 统一镜像构建文件
├── docker-compose.yml  # 编排配置
├── nginx.conf          # Nginx 配置
├── .env.example        # 环境变量示例
└── s6/                 # s6 服务配置
    ├── backend/        # 后端服务
    │   ├── type
    │   └── run
    └── nginx/          # Nginx 服务
        ├── type
        ├── run
        └── dependencies
```

## 快速部署

### 1. 配置环境变量

```bash
cd gaea
cp .env.example .env
# 编辑 .env 文件，填写实际配置
```

**必填项：**
- `POSTGRES_PASSWORD` - 数据库密码
- `SECRET_KEY` - JWT 密钥（使用 `openssl rand -hex 32` 生成）

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 访问应用

- 前端页面: http://localhost
- API 接口: http://localhost/api/
- 健康检查: http://localhost/health

## 单独构建镜像

```bash
# 在项目根目录执行
docker build -f gaea/Dockerfile -t 51talk-qa:latest .
```

## 镜像说明

- 基础镜像: `python:3.11-slim-bookworm`
- 进程管理: s6-overlay v3
- 前端服务: nginx
- 后端服务: uvicorn (2 workers)
- 暴露端口: 80

## 服务架构

```
┌─────────────────────────────────────┐
│           Docker Container          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       s6-overlay (PID 1)    │   │
│  └─────────────┬───────────────┘   │
│                │                    │
│       ┌────────┴────────┐          │
│       ▼                 ▼          │
│  ┌─────────┐      ┌──────────┐    │
│  │  nginx  │      │ uvicorn  │    │
│  │  :80    │─────▶│  :8000   │    │
│  └─────────┘      └──────────┘    │
│       │                 │          │
└───────┼─────────────────┼──────────┘
        │                 │
        ▼                 ▼
   前端静态文件      FastAPI 后端
```

## 日志查看

```bash
# 查看所有日志
docker-compose logs -f

# 仅查看应用日志
docker-compose logs -f app
```

## 常见问题

### 1. 启动失败：SECRET_KEY 未设置
确保在 `.env` 文件中设置了 `SECRET_KEY`。

### 2. 数据库连接失败
检查 PostgreSQL 容器是否正常启动：
```bash
docker-compose ps
docker-compose logs postgres
```

### 3. 前端 404
确保前端构建成功，检查 `/app/frontend/dist` 目录是否存在。
