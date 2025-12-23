# 视频课堂质量分析系统 - 后端

基于 FastAPI + PostgreSQL 构建的视频课堂质量分析后端服务。

## 📋 功能特性

- ✅ 用户认证（JWT）
- ✅ 视频上传管理
- ✅ 自动化视频处理（9步流程）
  - 听悟 ASR 转录
  - 视频下载与分帧
  - OSS 图片存储
  - 豆包大模型分析
  - 评估结果保存
- ✅ 实时任务进度追踪
- ✅ 多维度筛选查询
- ✅ 网络错误自动重试

## 🚀 快速开始

### 1. 安装依赖

#### 方法A: 使用Conda (推荐)

```bash
# 从项目根目录执行
conda env create -f environment.yml

# 激活环境
conda activate s9_official

# 验证安装
python --version  # 应显示Python 3.13.x
```

#### 方法B: 使用venv

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env` 文件并填写配置：

```bash
# 重要：请配置以下两项
DASHSCOPE_API_KEY=你的听悟API密钥
TINGWU_APP_ID=你的听悟应用ID

# 数据库配置（根据实际情况修改）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/video_analysis
```

### 3. 初始化数据库

```bash
# 确保 PostgreSQL 已安装并运行
# 创建数据库
createdb video_analysis

# 执行初始化脚本
psql -d video_analysis -f ../init_database.sql
```

### 4. 启动服务

```bash
# 开发模式（自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 或直接运行
python -m app.main
```

访问 http://localhost:8000/docs 查看 API 文档

## 📁 项目结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models/              # SQLAlchemy 模型
│   ├── schemas/             # Pydantic 模式
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   │   ├── video_processor.py  # 9步处理流程
│   │   └── task_manager.py     # 任务队列管理
│   ├── external/            # 外部服务
│   │   ├── tingwu_asr.py       # 听悟 ASR
│   │   ├── doubao_model.py     # 豆包模型
│   │   ├── video_downloader.py # 视频下载
│   │   ├── frame_extractor.py  # 视频分帧
│   │   └── oss_uploader.py     # OSS 上传
│   ├── utils/               # 工具函数
│   └── middleware/          # 中间件
├── temp/                    # 临时文件（自动创建）
│   ├── videos/              # 临时视频存储
│   └── frames/              # 临时图片存储
├── .env                     # 环境变量配置
├── requirements.txt         # Python 依赖
└── README.md
```

## 🔐 默认管理员账号

- **邮箱**: `51talk`
- **密码**: `123456`

## 📡 核心API端点

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/profile` - 获取当前用户信息

### 视频管理
- `POST /api/videos/upload` - 上传视频
- `GET /api/videos` - 获取视频列表（支持筛选）
- `GET /api/videos/{video_id}` - 获取视频详情
- `DELETE /api/videos/{video_id}` - 删除视频

### 任务管理
- `GET /api/tasks` - 获取所有任务状态
- `GET /api/tasks/{video_id}` - 获取单个任务状态
- `POST /api/tasks/{video_id}/retry` - 重试失败的任务

### 评估类别
- `GET /api/categories` - 获取评估类别列表

## 🛠️ 视频处理流程

系统采用 **串行处理** 模式，每个视频按以下9步顺序执行：

1. **听悟 ASR** - 调用阿里云听悟服务进行语音转录
2. **ASR 处理** - 格式化转录文本
3. **下载视频** - 从URL下载视频到本地
4. **视频分帧** - 按规则提取关键帧
5. **删除视频** - 清理本地视频文件
6. **上传 OSS** - 将图片上传到阿里云OSS
7. **豆包分析** - 调用豆包大模型进行质量分析
8. **保存结果** - 解析并保存评估结果到数据库
9. **清理图片** - 清理本地图片文件

### 分帧规则
- 10分钟处：随机抽 1 张
- 20分钟处：随机抽 1 张
- 20分钟后：每10分钟抽3张（间隔3分钟）
- 结尾前5秒：抽 1 张

### 重试机制
- 网络错误自动重试3次
- 指数退避策略：5秒 → 10秒 → 20秒

## ⚙️ 环境要求

- Python 3.9+
- PostgreSQL 13+
- 阿里云 OSS 账号
- 阿里云听悟 API Key
- 字节跳动豆包 API Key

## 📝 开发注意事项

1. **数据库迁移**：修改模型后，建议使用 Alembic 进行数据库迁移
2. **日志查看**：日志输出到控制台，包含详细的处理步骤
3. **错误处理**：所有外部服务调用都有重试机制
4. **性能优化**：视频处理采用后台线程，不阻塞API响应

## 🐛 常见问题

### 1. 数据库连接失败
检查 `.env` 中的 `DATABASE_URL` 配置是否正确

### 2. 听悟 ASR 调用失败
确认 `DASHSCOPE_API_KEY` 和 `TINGWU_APP_ID` 配置正确

### 3. 视频下载超时
检查网络连接，视频URL是否可访问

### 4. OSS 上传失败
确认 OSS 配置（AccessKey、Bucket、Endpoint）正确

## 📮 技术支持

如有问题，请查看日志输出或联系开发团队。
