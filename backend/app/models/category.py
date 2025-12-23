"""
评估类别模型
"""
from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class EvaluationCategory(Base):
    """评估类别表（仅子类）"""
    __tablename__ = "evaluation_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(100), nullable=False)  # 子类名称
    parent_category = Column(String(100), nullable=False, index=True)  # 父类名称（完全匹配）
    behavior_code = Column(String(50), nullable=False, unique=True)
    criteria = Column(Text)  # 评估标准
    display_order = Column(Integer, default=0)

    def __repr__(self):
        return f"<EvaluationCategory(id={self.id}, name={self.category_name}, code={self.behavior_code})>"
