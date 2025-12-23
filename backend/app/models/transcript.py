"""
转录文本模型
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class VideoTranscript(Base):
    """转录文本表"""
    __tablename__ = "video_transcripts"

    video_id = Column(
        String(50),
        ForeignKey('video_info.video_id', ondelete='CASCADE'),
        primary_key=True
    )
    formatted_text = Column(Text, nullable=False)  # 结构化文本（由 ASR 处理脚本生成）
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<VideoTranscript(video_id={self.video_id})>"
