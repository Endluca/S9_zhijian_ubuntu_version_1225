"""
应用配置管理
使用 Pydantic Settings 管理环境变量
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""

    # 应用配置
    APP_NAME: str = "视频课堂质量分析系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 数据库配置
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/video_analysis"

    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production-123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时

    # 听悟 ASR 配置
    DASHSCOPE_API_KEY: str = ""
    TINGWU_APP_ID: str = ""
    TINGWU_MODEL: str = "tingwu-meeting"

    # 豆包模型配置
    DOUBAO_API_KEY: str = "fbcbd81e-edc2-4215-9133-b18f1b2a9b7d"
    DOUBAO_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    DOUBAO_MODEL: str = "doubao-seed-1-6-251015"

    # 阿里云 OSS 配置
    OSS_ACCESS_KEY_ID: str = "LTAI5tMcWntnNksoBW87sEQM"
    OSS_ACCESS_KEY_SECRET: str = "yfvip5vKTM5bbXHt8ueRmO6DaOWjdM"
    OSS_BUCKET_NAME: str = "51talk-ai"
    OSS_ENDPOINT: str = "oss-cn-beijing.aliyuncs.com"
    OSS_BASE_URL: str = "https://51talk-ai.oss-cn-beijing.aliyuncs.com"

    # 文件存储配置
    TEMP_VIDEO_DIR: str = "./backend/temp/videos"
    TEMP_FRAMES_DIR: str = "./backend/temp/frames"

    # 任务配置
    MAX_RETRY_COUNT: int = 3
    RETRY_DELAYS: List[int] = [5, 10, 20]  # 指数退避（秒）

    # CORS 配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # 允许额外的字段


@lru_cache()
def get_settings() -> Settings:
    """
    获取配置单例
    使用 lru_cache 确保只创建一次配置实例
    """
    return Settings()


# 便捷访问
settings = get_settings()
