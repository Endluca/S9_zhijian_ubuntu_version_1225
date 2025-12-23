"""
用户相关的Pydantic模式
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """用户基础模式"""
    email: str


class UserCreate(UserBase):
    """创建用户请求"""
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    """更新用户请求"""
    email: Optional[str] = None
    role: Optional[str] = None


class UserResetPassword(BaseModel):
    """重置密码请求"""
    new_password: str


class UserResponse(UserBase):
    """用户响应"""
    id: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """登录请求"""
    email: str
    password: str


class LoginResponse(BaseModel):
    """登录响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
