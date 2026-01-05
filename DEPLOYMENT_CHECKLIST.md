# 部署特殊配置项清单

> 本文档列出部署时必须注意的特殊配置项，用于快速检查配置是否正确。

---

## 🔴 必需环境版本

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Python | **3.9** | 必须使用 Python 3.9，不能使用其他版本 |
| Node.js | **20.x** | 仅用于前端构建 |
| PostgreSQL | **15+** | 推荐使用 PostgreSQL 15 |
| Docker | 20.10+ | 如使用容器部署 |
| Docker Compose | 2.0+ | 如使用容器部署 |

---

## 🔴 必需环境变量配置

在 `backend/.env` 文件中配置以下**必需**的环境变量：

```bash
# ========== 数据库配置（必需）==========
DATABASE_URL=postgresql://postgres:密码@数据库地址:5432/video_analysis

# ========== JWT 密钥（必需，生产环境请修改）==========
SECRET_KEY=your-secret-key-change-in-production-123456789

# ========== 阿里云听悟 ASR 配置（必需）==========
DASHSCOPE_API_KEY=你的听悟API密钥
TINGWU_APP_ID=你的听悟应用ID
TINGWU_MODEL=tingwu-meeting

# ========== 字节跳动豆包模型配置（必需）==========
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-seed-1-6-251015

# ========== 阿里云 OSS 配置（必需）==========
OSS_ACCESS_KEY_ID=你的OSS AccessKey ID
OSS_ACCESS_KEY_SECRET=你的OSS AccessKey Secret
OSS_BUCKET_NAME=51talk-ai
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_BASE_URL=https://51talk-ai.oss-cn-beijing.aliyuncs.com

# ========== 应用配置 ==========
DEBUG=False
APP_NAME=视频课堂质量分析系统
APP_VERSION=1.0.0
```

---

## ⚠️ 重要配置项

### 1. Python 版本
- ✅ **必须使用 Python 3.9**
- ✅ Dockerfile 已配置为 `FROM python:3.9-slim`
- ❌ 不要使用 Python 3.13 或其他版本

### 2. 端口配置
| 服务 | 默认端口 | 说明 |
|------|---------|------|
| 前端 | 80 | HTTP |
| 后端 API | 8000 | FastAPI |
| PostgreSQL | 5432 | 数据库 |

### 3. 文件存储
- **临时目录路径**：
  - `backend/temp/videos/` - 临时视频文件
  - `backend/temp/frames/` - 临时图片文件
- **Docker 容器内路径**：
  - `/app/backend/temp/videos`
  - `/app/backend/temp/frames`
- **磁盘空间要求**：至少 10GB
- **权限要求**：确保应用有读写权限

### 4. CORS 配置（如需要）
如果前端和后端不在同一域名，在 `backend/.env` 中添加：
```bash
CORS_ORIGINS=http://your-frontend-domain.com,https://your-frontend-domain.com
```

### 5. 数据库初始化
```bash
# 创建数据库
createdb video_analysis

# 执行初始化脚本（从项目根目录）
psql -d video_analysis -f backend/init_database.sql
```

---

## 🔐 默认管理员账号

- **邮箱**: `51talk`
- **密码**: `123456`
- ⚠️ **生产环境请务必修改默认密码！**

---

## ✅ 部署前检查清单

- [ ] Python 版本为 3.9
- [ ] 已创建 `backend/.env` 文件
- [ ] 已配置所有必需的环境变量（API 密钥、数据库连接等）
- [ ] 已初始化数据库（执行 `init_database.sql`）
- [ ] 临时目录有足够的磁盘空间（至少 10GB）
- [ ] 临时目录有读写权限
- [ ] 服务器可以访问外网（调用阿里云和字节跳动 API）
- [ ] 防火墙已开放必要端口（80, 8000, 5432）
- [ ] 已修改默认管理员密码（生产环境）

---

## 🚀 快速部署命令

### Docker Compose 部署
```bash
# 1. 确认 Python 版本（Dockerfile 已配置为 3.9）
# 2. 配置环境变量
vim backend/.env

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 本地部署
```bash
# 1. 安装 Python 3.9
pyenv install 3.9.18
pyenv local 3.9.18

# 2. 安装依赖
cd backend
pip install -r requirements.txt

# 3. 配置环境变量
vim .env

# 4. 初始化数据库
createdb video_analysis
psql -d video_analysis -f init_database.sql

# 5. 启动后端
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# 6. 构建前端（另开终端）
cd frontend
npm install
npm run build
```

---

## 🔍 验证部署

```bash
# 检查后端服务
curl http://localhost:8000/health
curl http://localhost:8000/docs

# 检查前端服务
curl http://localhost/

# 检查数据库连接
docker exec -it s9_postgres psql -U postgres -d video_analysis
```

---

## 📝 注意事项

1. **Python 版本兼容性**：必须使用 Python 3.9，某些依赖包可能需要针对 Python 3.9 调整
2. **API 密钥安全**：不要将 API 密钥提交到代码仓库，使用 `.env` 文件管理
3. **资源要求**：建议服务器配置至少 4 核 CPU，8GB 内存
4. **网络要求**：服务器需要能够访问外网（调用阿里云和字节跳动 API）
5. **数据库迁移**：首次部署执行 `init_database.sql`，后续变更执行 `migrations/` 目录下的脚本

---

**最后更新**: 2024-12

