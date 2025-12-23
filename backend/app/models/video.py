"""
视频信息模型
"""
from sqlalchemy import Column, String, DateTime, Text, Integer, Index
from sqlalchemy.sql import func
from app.database import Base


class VideoInfo(Base):
    """视频信息表"""
    __tablename__ = "video_info"

    video_id = Column(String(50), primary_key=True)
    student_id = Column(String(100), nullable=False, index=True)
    teacher_name = Column(String(100), nullable=False, index=True)
    class_time = Column(DateTime, nullable=False, index=True)
    video_duration = Column(String(20))  # 分钟数，如 "55"
    original_video_url = Column(Text, nullable=False)

    # OSS 图片 URL（逗号分隔）
    frame_urls = Column(Text)

    # ASR 结果（原始 JSON）
    asr_raw_json = Column(Text)

    # 大模型分析结果
    llm_thinking = Column(Text)  # 豆包的 thinking 过程
    llm_result_json = Column(Text)  # 豆包返回的完整结果 JSON

    # 任务状态
    task_status = Column(String(20), default='pending', index=True)  # pending/processing/completed/failed
    current_step = Column(String(50))
    step_status = Column(Text)  # JSON 格式：{"asr":"completed","download":"processing"}
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<VideoInfo(video_id={self.video_id}, student_id={self.student_id}, status={self.task_status})>"


# 创建复合索引
Index('idx_video_status_time', VideoInfo.task_status, VideoInfo.class_time)
