"""
视频管理API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models.user import User
from app.models.video import VideoInfo
from app.models.evaluation import VideoEvaluation
from app.models.category import EvaluationCategory
from app.schemas.video import (
    VideoUploadSingle,
    VideoResponse,
    VideoDetailResponse,
    VideoListResponse
)
from app.middleware.auth_middleware import get_current_user
from app.services.task_manager import get_task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["视频管理"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_video(
    request: VideoUploadSingle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    上传单条视频

    **请求体：**
    - student_id: 学员ID
    - teacher_name: 教师姓名
    - class_time: 上课时间
    - video_url: 视频URL

    **返回：**
    - success: 是否成功
    - message: 提示信息
    - video_id: 视频ID
    """
    try:
        # 生成视频ID
        video_id = f"vid_{uuid.uuid4().hex[:12]}"

        # 创建视频记录
        video = VideoInfo(
            video_id=video_id,
            student_id=request.student_id,
            teacher_name=request.teacher_name,
            class_time=request.class_time,
            original_video_url=str(request.video_url),
            task_status="pending",
            step_status="{}"
        )

        db.add(video)
        db.commit()

        # 添加到任务队列
        task_manager = get_task_manager()
        task_manager.add_task(video_id)

        logger.info(f"视频上传成功: {video_id}, 用户: {current_user.email}")

        return {
            "success": True,
            "message": "视频上传成功，已加入处理队列",
            "video_id": video_id
        }

    except Exception as e:
        logger.error(f"视频上传失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"视频上传失败: {str(e)}"
        )


@router.get("", response_model=VideoListResponse)
def list_videos(
    student_id: Optional[str] = Query(None, description="学员ID"),
    teacher_name: Optional[str] = Query(None, description="教师姓名"),
    class_time_start: Optional[datetime] = Query(None, description="开始时间"),
    class_time_end: Optional[datetime] = Query(None, description="结束时间"),
    task_status: Optional[str] = Query(None, description="任务状态"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取视频列表（支持筛选和分页）

    **查询参数：**
    - student_id: 学员ID（模糊匹配）
    - teacher_name: 教师姓名（模糊匹配）
    - class_time_start: 上课时间起始
    - class_time_end: 上课时间结束
    - task_status: 任务状态
    - page: 页码（从1开始）
    - page_size: 每页数量（1-100）

    **返回：**
    - data: 视频列表
    - total: 总数
    - page: 当前页码
    - page_size: 每页数量
    """
    # 构建查询
    query = db.query(VideoInfo)

    # 应用筛选条件
    if student_id:
        query = query.filter(VideoInfo.student_id.like(f"%{student_id}%"))
    if teacher_name:
        query = query.filter(VideoInfo.teacher_name.like(f"%{teacher_name}%"))
    if class_time_start:
        query = query.filter(VideoInfo.class_time >= class_time_start)
    if class_time_end:
        query = query.filter(VideoInfo.class_time <= class_time_end)
    if task_status:
        query = query.filter(VideoInfo.task_status == task_status)

    # 获取总数
    total = query.count()

    # 分页
    offset = (page - 1) * page_size
    videos = query.order_by(VideoInfo.created_at.desc()).offset(offset).limit(page_size).all()

    return VideoListResponse(
        data=[VideoResponse.from_orm(v) for v in videos],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{video_id}", response_model=VideoDetailResponse)
def get_video_detail(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取视频详情

    **路径参数：**
    - video_id: 视频ID

    **返回：**
    视频详情（包含评估结果）
    """
    # 查询视频
    video = db.query(VideoInfo).filter(VideoInfo.video_id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="视频不存在"
        )

    # 查询评估结果
    evaluations = db.query(VideoEvaluation, EvaluationCategory).join(
        EvaluationCategory,
        VideoEvaluation.category_id == EvaluationCategory.id
    ).filter(
        VideoEvaluation.video_id == video_id
    ).all()

    # 构建评估结果
    evaluation_list = []
    for eval, category in evaluations:
        evaluation_list.append({
            "category_name": category.category_name,
            "parent_category": category.parent_category,
            "behavior_code": category.behavior_code,
            "is_compliant": eval.is_compliant,
            "evidence_timestamp": eval.evidence_timestamp.split(",") if eval.evidence_timestamp else [],
            "analysis_comment": eval.analysis_comment
        })

    # 构建响应
    response = VideoDetailResponse.from_orm_with_urls(video)
    response.evaluations = evaluation_list

    return response


@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除视频

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

    # 删除视频（级联删除相关记录）
    db.delete(video)
    db.commit()

    logger.info(f"视频删除成功: {video_id}, 用户: {current_user.email}")

    return {
        "success": True,
        "message": "视频删除成功"
    }
