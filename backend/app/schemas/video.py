"""
视频相关的Pydantic模式
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime


class VideoUploadSingle(BaseModel):
    """单条视频上传"""
    student_id: str
    teacher_name: str
    class_time: datetime
    video_url: HttpUrl


class VideoResponse(BaseModel):
    """视频响应"""
    video_id: str
    student_id: str
    teacher_name: str
    class_time: datetime
    video_duration: Optional[str] = None
    task_status: str
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VideoDetailResponse(VideoResponse):
    """视频详情响应"""
    frame_urls: Optional[List[str]] = None
    llm_thinking: Optional[str] = None
    evaluations: Optional[List[dict]] = None

    @classmethod
    def from_orm_with_urls(cls, video):
        """从ORM对象创建，解析frame_urls"""
        data = {
            "video_id": video.video_id,
            "student_id": video.student_id,
            "teacher_name": video.teacher_name,
            "class_time": video.class_time,
            "video_duration": video.video_duration,
            "task_status": video.task_status,
            "current_step": video.current_step,
            "error_message": video.error_message,
            "created_at": video.created_at,
            "frame_urls": video.frame_urls.split(",") if video.frame_urls else [],
            "llm_thinking": video.llm_thinking,
        }
        return cls(**data)


class VideoListResponse(BaseModel):
    """视频列表响应"""
    data: List[VideoResponse]
    total: int
    page: int
    page_size: int


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    video_id: str
    task_status: str
    current_step: Optional[str] = None
    step_status: Optional[dict] = None
    progress: int  # 进度百分比
    error_message: Optional[str] = None
