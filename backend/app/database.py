"""
数据库连接管理
使用 SQLAlchemy 连接 PostgreSQL
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 连接前检查连接是否有效
    pool_recycle=3600,  # 1小时后回收连接
    echo=settings.DEBUG,  # DEBUG 模式下打印 SQL
    connect_args={
        "connect_timeout": 10,  # 连接超时时间（秒）
        "options": "-c timezone=utc"  # 设置时区
    }
)

# 创建会话工厂
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# 创建基类
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话
    用于 FastAPI 依赖注入

    使用示例:
        @app.get("/")
        def read_root(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    创建所有表
    注意：实际生产环境建议使用 Alembic 进行数据库迁移
    """
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """
    删除所有表（谨慎使用）
    """
    Base.metadata.drop_all(bind=engine)
