"""
认证API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse
from app.utils.security import verify_password, create_access_token
from app.middleware.auth_middleware import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    用户登录

    **请求体：**
    - email: 邮箱
    - password: 密码

    **返回：**
    - access_token: JWT令牌
    - token_type: bearer
    - user: 用户信息
    """
    # 查询用户
    user = db.query(User).filter(User.email == request.email).first()

    # 验证用户存在
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )

    # 验证密码
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )

    # 生成token
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role}
    )

    logger.info(f"用户登录成功: {user.email}")

    return LoginResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """
    获取当前用户信息

    需要认证
    """
    return UserResponse.from_orm(current_user)
