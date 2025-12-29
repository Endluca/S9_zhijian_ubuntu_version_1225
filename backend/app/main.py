"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import SessionLocal
from app.services.task_manager import init_task_manager
from app.routers import auth, videos, tasks, categories, statistics

# 配置日志
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时初始化任务管理器，关闭时清理资源
    """
    # 启动时执行
    logger.info("=" * 60)
    logger.info(f"启动 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)

    # 初始化任务管理器
    try:
        init_task_manager(SessionLocal)
        logger.info("✓ 任务管理器初始化成功")
    except Exception as e:
        logger.error(f"✗ 任务管理器初始化失败: {str(e)}")

    yield

    # 关闭时执行
    logger.info("应用关闭中...")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="视频课堂质量分析系统 - 后端API",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(tasks.router)
app.include_router(categories.router)
app.include_router(statistics.router)


@app.get("/")
def root():
    """根路径 - 健康检查"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
