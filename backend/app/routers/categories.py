"""
评估类别API路由
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict

from app.database import get_db
from app.models.user import User
from app.models.category import EvaluationCategory
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/categories", tags=["评估类别"])


@router.get("")
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取评估类别列表（按父子结构组织）

    **返回：**
    按父类分组的评估类别列表
    """
    # 查询所有类别
    categories = db.query(EvaluationCategory).order_by(
        EvaluationCategory.display_order
    ).all()

    # 按父类分组
    grouped = defaultdict(list)
    for cat in categories:
        grouped[cat.parent_category].append({
            "id": cat.id,
            "category_name": cat.category_name,
            "behavior_code": cat.behavior_code,
            "criteria": cat.criteria,
            "display_order": cat.display_order
        })

    # 构建结果
    result = []
    for parent, children in grouped.items():
        result.append({
            "parent_category": parent,
            "children": children
        })

    return result
