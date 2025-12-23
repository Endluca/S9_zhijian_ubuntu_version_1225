"""
任务管理API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import logging

from app.database import get_db
from app.models.user import User
from app.models.video import VideoInfo
from app.schemas.video import TaskStatusResponse
from app.middleware.auth_middleware import get_current_user
from app.services.task_manager import get_task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


# 步骤权重（用于计算进度）
STEP_WEIGHTS = {
    "asr": 15,
    "parse_asr": 5,
    "download": 10,
    "extract_frames": 10,
    "upload_oss": 10,
    "llm_analysis": 40,
    "save_results": 10,
}


def calculate_progress(step_status: dict) -> int:
    """
    计算任务进度百分比

    Args:
        step_status: 步骤状态字典

    Returns:
        进度百分比（0-100）
    """
    if not step_status:
        return 0

    total_progress = 0
    for step, status in step_status.items():
        weight = STEP_WEIGHTS.get(step, 0)
        if status == "completed":
            total_progress += weight
        elif status == "processing":
            total_progress += weight / 2

    return min(int(total_progress), 100)


@router.get("", response_model=List[TaskStatusResponse])
def get_all_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取所有任务状态

    **返回：**
    任务状态列表（包含进度）
    """
    # 查询所有非完成状态的视频
    videos = db.query(VideoInfo).filter(
        VideoInfo.task_status.in_(["pending", "processing", "failed"])
    ).order_by(VideoInfo.created_at.desc()).all()

    tasks = []
    for video in videos:
        # 解析步骤状态
        step_status = json.loads(video.step_status) if video.step_status else {}

        # 计算进度
        progress = calculate_progress(step_status)

        tasks.append(TaskStatusResponse(
            video_id=video.video_id,
            task_status=video.task_status,
            current_step=video.current_step,
            step_status=step_status,
            progress=progress,
            error_message=video.error_message
        ))

    return tasks


@router.get("/{video_id}", response_model=TaskStatusResponse)
def get_task_status(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取单个任务状态

    **路径参数：**
    - video_id: 视频ID

    **返回：**
    任务状态（包含进度）
    """
    # 查询视频
    video = db.query(VideoInfo).filter(VideoInfo.video_id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="视频不存在"
        )

    # 解析步骤状态
    step_status = json.loads(video.step_status) if video.step_status else {}

    # 计算进度
    progress = calculate_progress(step_status)

    return TaskStatusResponse(
        video_id=video.video_id,
        task_status=video.task_status,
        current_step=video.current_step,
        step_status=step_status,
        progress=progress,
        error_message=video.error_message
    )


@router.post("/{video_id}/retry")
def retry_task(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    重试失败的任务（继续功能）

    **路径参数：**
    - video_id: 视频ID

    **返回：**
    - success: 是否成功
    - message: 提示信息
    """
    # 查询视频
    video = db.query(VideoInfo).filter(VideoInfo.video_id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="视频不存在"
        )

    # 检查是否可以重试
    if video.task_status not in ["failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有失败的任务才能重试"
        )

    # 重置状态
    video.task_status = "pending"
    video.error_message = None
    db.commit()

    # 重新添加到任务队列
    task_manager = get_task_manager()
    task_manager.add_task(video_id)

    logger.info(f"任务重试: {video_id}, 用户: {current_user.email}")

    return {
        "success": True,
        "message": "任务已重新加入处理队列"
    }


@router.get("/queue/status")
def get_queue_status(
    current_user: User = Depends(get_current_user)
):
    """
    获取任务队列状态

    **返回：**
    - queue_size: 队列中待处理的任务数量
    """
    task_manager = get_task_manager()
    queue_size = task_manager.get_queue_size()

    return {
        "queue_size": queue_size
    }
