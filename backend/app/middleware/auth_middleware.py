"""
认证中间件
提供JWT token验证和用户权限检查
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import decode_access_token
import logging

logger = logging.getLogger(__name__)

# HTTP Bearer 认证方案
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    获取当前登录用户

    用于保护需要认证的API端点

    使用示例:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user.email}

    Args:
        credentials: HTTP Bearer credentials
        db: 数据库会话

    Returns:
        当前用户对象

    Raises:
        HTTPException: 认证失败（401）或用户不存在（404）
    """
    # 提取token
    token = credentials.credentials
    logger.debug(f"收到认证请求，token长度: {len(token)}")

    # 解码token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌或令牌已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 获取用户ID
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌格式错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 查询用户
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    要求管理员权限

    用于保护仅管理员可访问的API端点

    使用示例:
        @app.delete("/users/{user_id}")
        def delete_user(
            user_id: str,
            current_user: User = Depends(require_admin)
        ):
            # 只有管理员可以访问
            return {"message": "User deleted"}

    Args:
        current_user: 当前用户（由 get_current_user 提供）

    Returns:
        当前用户对象（管理员）

    Raises:
        HTTPException: 权限不足（403）
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要管理员权限"
        )

    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    获取当前用户（可选）

    用于既可以匿名访问也可以认证访问的端点

    使用示例:
        @app.get("/content")
        def get_content(current_user: Optional[User] = Depends(get_current_user_optional)):
            if current_user:
                # 已登录用户看到更多内容
                return {"content": "full"}
            else:
                # 匿名用户看到部分内容
                return {"content": "preview"}

    Args:
        credentials: HTTP Bearer credentials（可选）
        db: 数据库会话

    Returns:
        当前用户对象，未认证时返回 None
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        user = db.query(User).filter(User.id == user_id).first()
        return user

    except Exception as e:
        logger.warning(f"可选认证失败: {str(e)}")
        return None
