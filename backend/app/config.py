"""
应用配置管理
使用 Pydantic Settings 管理环境变量
"""
import os
import sys
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


# 查找 .env 文件路径
def find_env_file():
    """查找 .env 文件，尝试多个可能的路径"""
    possible_paths = [
        ".env",
        "backend/.env",
        "/app/.env",
        "/app/backend/.env"
    ]
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✓ 找到配置文件: {path}")
            return path
    print("⚠ 警告: 未找到 .env 文件，使用默认配置")
    return ".env"


ENV_FILE_PATH = find_env_file()


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
    DOUBAO_API_KEY: str = ""  # 从环境变量读取，不要硬编码
    DOUBAO_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    DOUBAO_MODEL: str = "doubao-seed-1-6-251015"

    # 阿里云 OSS 配置
    OSS_ACCESS_KEY_ID: str = ""  # 从环境变量读取
    OSS_ACCESS_KEY_SECRET: str = ""  # 从环境变量读取
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
        env_file = ENV_FILE_PATH
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"  # 允许额外的字段


@lru_cache()
def get_settings() -> Settings:
    """
    获取配置单例
    使用 lru_cache 确保只创建一次配置实例
    """
    settings = Settings()
    # 打印数据库配置信息（隐藏密码）
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        # 隐藏密码部分
        parts = db_url.split("@")
        if ":" in parts[0]:
            user_part = parts[0].split("://")[1].split(":")[0]
            host_part = parts[1] if len(parts) > 1 else "..."
            print(f"✓ 数据库配置: 用户={user_part}, 主机={host_part}")
    return settings


def validate_security_config():
    """
    验证安全配置
    
    检查关键安全配置是否使用了不安全的默认值
    如果发现问题，将拒绝启动应用
    """
    _settings = get_settings()
    
    # 检查 SECRET_KEY 是否为默认值
    default_secret_key = "your-secret-key-change-in-production-123456789"
    if _settings.SECRET_KEY == default_secret_key:
        print("\n" + "="*70)
        print("❌ 严重安全错误：检测到使用默认 SECRET_KEY")
        print("="*70)
        print("JWT SECRET_KEY 仍在使用硬编码的默认值，这在生产环境中极其危险！")
        print("\n攻击者可以使用此默认密钥伪造任意 JWT 令牌，完全绕过身份验证。")
        print("\n修复方法：")
        print("1. 在 .env 文件中设置: SECRET_KEY=<你的强随机密钥>")
        print("2. 或设置环境变量: export SECRET_KEY=<你的强随机密钥>")
        print("\n生成强随机密钥示例命令:")
        print("   openssl rand -hex 32")
        print("   python -c 'import secrets; print(secrets.token_hex(32))'")
        print("="*70 + "\n")
        sys.exit(1)


# 便捷访问
settings = get_settings()

# 启动时验证安全配置
validate_security_config()
