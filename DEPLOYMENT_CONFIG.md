# 部署配置说明文档

本文档列出了项目部署到服务器时需要的所有特殊配置项和环境要求。

## 📋 环境版本要求

### 后端环境
- **Python 版本**: `3.9` （必需）
- **PostgreSQL 版本**: `15+` （推荐使用 PostgreSQL 15）
- **操作系统**: Linux（推荐 Ubuntu 20.04+ 或 CentOS 7+）

### 前端环境
- **Node.js 版本**: `20.x` （必需，用于构建）
- **npm 版本**: `9.x+` （随 Node.js 20 自带）

### Docker 环境（如使用容器部署）
- **Docker 版本**: `20.10+`
- **Docker Compose 版本**: `2.0+`

---

## 🔧 特殊配置项

### 1. Python 版本配置

**重要**: 项目要求使用 **Python 3.9**。Dockerfile 已配置为使用 Python 3.9。

#### 修改方式

**方式A: 修改 Dockerfile（推荐）**

在 `backend/Dockerfile` 中，将第2行：
```dockerfile
FROM python:3.13-slim
```
修改为：
```dockerfile
FROM python:3.9-slim
```

**方式B: 本地部署**

如果使用虚拟环境部署：
```bash
# 使用 pyenv 安装 Python 3.9
pyenv install 3.9.18
pyenv local 3.9.18

# 或使用 conda
conda create -n s9_official python=3.9
conda activate s9_official
```

### 2. 数据库配置

#### PostgreSQL 配置要求
- **版本**: PostgreSQL 15+ （推荐使用 `postgres:15-alpine`）
- **数据库名**: `video_analysis`（可在 docker-compose.yml 中修改）
- **端口**: `5432`（默认）

#### 数据库初始化
```bash
# 创建数据库
createdb video_analysis

# 执行初始化脚本
psql -d video_analysis -f backend/init_database.sql
```

### 3. 环境变量配置

在 `backend/.env` 文件中配置以下必需的环境变量：

#### 必需配置项

```bash
# 数据库连接（必需）
DATABASE_URL=postgresql://postgres:密码@数据库地址:5432/video_analysis

# JWT 密钥（必需，生产环境请修改）
SECRET_KEY=your-secret-key-change-in-production-123456789

# 阿里云听悟 ASR 配置（必需）
DASHSCOPE_API_KEY=你的听悟API密钥
TINGWU_APP_ID=你的听悟应用ID
TINGWU_MODEL=tingwu-meeting

# 字节跳动豆包模型配置（必需）
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-seed-1-6-251015

# 阿里云 OSS 配置（必需）
OSS_ACCESS_KEY_ID=你的OSS AccessKey ID
OSS_ACCESS_KEY_SECRET=你的OSS AccessKey Secret
OSS_BUCKET_NAME=51talk-ai
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_BASE_URL=https://51talk-ai.oss-cn-beijing.aliyuncs.com

# 应用配置
DEBUG=False
APP_NAME=视频课堂质量分析系统
APP_VERSION=1.0.0
```

#### 可选配置项

```bash
# JWT Token 过期时间（分钟，默认1440即24小时）
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS 允许的源（根据实际前端地址配置，使用逗号分隔）
# 注意：pydantic-settings 会自动解析逗号分隔的字符串为列表
CORS_ORIGINS=http://your-frontend-domain.com,https://your-frontend-domain.com

# 任务重试配置（可选，有默认值）
MAX_RETRY_COUNT=3
# RETRY_DELAYS 在代码中定义为 List[int]，如需修改请修改 config.py
```

### 4. 端口配置

#### 默认端口映射
- **前端**: `80` （HTTP）
- **后端 API**: `8000`
- **PostgreSQL**: `5432`

#### 修改端口（如需要）

在 `docker-compose.yml` 中修改：
```yaml
services:
  frontend:
    ports:
      - "自定义端口:80"  # 例如 "8080:80"
  
  backend:
    ports:
      - "自定义端口:8000"  # 例如 "8001:8000"
  
  postgres:
    ports:
      - "自定义端口:5432"  # 例如 "5433:5432"
```

### 5. 文件存储配置

#### 临时目录
项目需要在以下目录存储临时文件：
- `backend/temp/videos/` - 临时视频文件
- `backend/temp/frames/` - 临时图片文件

**注意**: 
- 确保这些目录有足够的磁盘空间（建议至少 10GB）
- 确保应用有读写权限
- 如果使用 Docker，这些目录会映射到 volume `backend_temp`
- Docker 容器内路径为：`/app/backend/temp/videos` 和 `/app/backend/temp/frames`

### 6. 网络配置

#### CORS 配置
如果前端和后端不在同一域名，需要在 `backend/.env` 文件中配置 CORS 允许的源：

```bash
# 在 .env 文件中添加（使用逗号分隔多个域名）
CORS_ORIGINS=http://your-frontend-domain.com,https://your-frontend-domain.com
```

或者修改 `backend/app/config.py` 中的默认值：

```python
CORS_ORIGINS: List[str] = [
    "http://your-frontend-domain.com",
    "https://your-frontend-domain.com",
]
```

#### 防火墙规则
确保服务器防火墙开放以下端口：
- `80` (前端)
- `8000` (后端 API)
- `5432` (PostgreSQL，如需要外部访问)

---

## 🚀 部署步骤

### 使用 Docker Compose 部署（推荐）

1. **确认 Python 版本**
   ```bash
   # 确认 backend/Dockerfile 中已使用 Python 3.9
   # 如果还是 3.13，需要修改为：
   # FROM python:3.9-slim
   ```

2. **配置环境变量**
   ```bash
   # 创建并编辑环境变量文件
   # 如果 backend/.env 不存在，需要手动创建
   vim backend/.env
   # 或使用其他编辑器编辑 backend/.env，填入所有必需配置
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **查看日志**
   ```bash
   docker-compose logs -f
   ```

### 本地部署

1. **安装 Python 3.9**
   ```bash
   # 使用 pyenv
   pyenv install 3.9.18
   pyenv local 3.9.18
   
   # 或使用 conda
   conda create -n s9_official python=3.9
   conda activate s9_official
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **配置环境变量**
   ```bash
   # 编辑 .env 文件（当前在 backend 目录）
   vim .env
   ```

4. **初始化数据库**
   ```bash
   # 如果还未创建数据库
   createdb video_analysis
   
   # 执行初始化脚本（从项目根目录执行）
   cd ..
   psql -d video_analysis -f backend/init_database.sql
   # 或从 backend 目录执行
   # psql -d video_analysis -f init_database.sql
   ```

5. **启动后端服务**
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

6. **构建前端**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

7. **部署前端**
   ```bash
   # 将 dist 目录部署到 nginx
   cp -r frontend/dist/* /usr/share/nginx/html/
   ```

---

## ⚠️ 重要注意事项

### 1. Python 版本兼容性
- **必须使用 Python 3.9**，不要使用 Python 3.13
- 某些依赖包可能需要针对 Python 3.9 进行调整
- 如果遇到依赖问题，可能需要降级某些包的版本

### 2. 数据库迁移
- 首次部署需要执行 `init_database.sql` 初始化数据库结构
- 后续如有数据库结构变更，需要执行 `migrations/` 目录下的迁移脚本

### 3. API 密钥安全
- **不要**将 API 密钥提交到代码仓库
- 使用 `.env` 文件管理敏感信息
- 确保 `.env` 文件在 `.gitignore` 中

### 4. 资源限制
- 视频处理需要较多 CPU 和内存资源
- 建议服务器配置：至少 4 核 CPU，8GB 内存
- 确保有足够的磁盘空间存储临时文件

### 5. 网络要求
- 服务器需要能够访问外网（调用阿里云和字节跳动 API）
- 确保网络延迟较低，避免 API 调用超时

### 6. 默认管理员账号
- **邮箱**: `51talk`
- **密码**: `123456`
- **生产环境请务必修改默认密码！**

---

## 🔍 验证部署

### 检查后端服务
```bash
# 检查 API 文档
curl http://localhost:8000/docs

# 检查健康状态
curl http://localhost:8000/health
```

### 检查前端服务
```bash
# 访问前端页面
curl http://localhost/
```

### 检查数据库连接
```bash
# 进入 PostgreSQL 容器
docker exec -it s9_postgres psql -U postgres -d video_analysis

# 或本地连接
psql -U postgres -d video_analysis
```

---

## 📞 故障排查

### 常见问题

1. **Python 版本不匹配**
   - 错误: `SyntaxError` 或导入错误
   - 解决: 确保使用 Python 3.9

2. **数据库连接失败**
   - 检查 `DATABASE_URL` 配置
   - 确认 PostgreSQL 服务已启动
   - 检查网络连接和防火墙规则

3. **API 调用失败**
   - 检查 API 密钥是否正确
   - 确认服务器可以访问外网
   - 查看日志获取详细错误信息

4. **文件权限问题**
   - 确保临时目录有读写权限
   - 检查 Docker volume 挂载是否正确

---

## 📝 更新日志

- 2024-12: 初始版本，要求 Python 3.9

---

**最后更新**: 2024-12

