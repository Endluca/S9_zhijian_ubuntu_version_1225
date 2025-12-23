"""
评估结果模型
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.database import Base


class VideoEvaluation(Base):
    """评估结果表"""
    __tablename__ = "video_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(
        String(50),
        ForeignKey('video_info.video_id', ondelete='CASCADE'),
        nullable=False
    )
    category_id = Column(
        Integer,
        ForeignKey('evaluation_categories.id', ondelete='CASCADE'),
        nullable=False
    )
    parent_category = Column(String(50))  # 父类别（从 evaluation_categories 同步）
    category_name = Column(String(50))  # 子类别名（从 evaluation_categories 同步）
    is_compliant = Column(Boolean, nullable=True)  # 是否合规（NULL 表示待人工评判）
    evidence_timestamp = Column(Text)  # 逗号分隔的时间戳（如 "05:32,18:45"）
    analysis_comment = Column(Text)  # 分析备注
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<VideoEvaluation(id={self.id}, video_id={self.video_id}, category_id={self.category_id})>"


# 创建复合索引
Index('idx_video_category', VideoEvaluation.video_id, VideoEvaluation.category_id)
