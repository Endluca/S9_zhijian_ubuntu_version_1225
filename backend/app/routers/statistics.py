"""
统计看板API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract
from typing import Optional
from datetime import datetime, time
from io import StringIO
import csv

from app.database import get_db
from app.models.user import User
from app.models.video import VideoInfo
from app.models.evaluation import VideoEvaluation
from app.models.category import EvaluationCategory
from app.schemas.statistics import VideoStatisticsResponse, CategoryStats
from app.middleware.auth_middleware import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/statistics", tags=["统计分析"])


@router.get("/dashboard", response_model=VideoStatisticsResponse)
def get_statistics_dashboard(
    start_date: Optional[datetime] = Query(None, description="开始日期 (ISO 8601格式: YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="结束日期 (ISO 8601格式: YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取统计看板数据

    **查询参数：**
    - start_date: 开始日期（可选，默认无限期）
    - end_date: 结束日期（可选，默认无限期）

    **返回：**
    - total_videos: 上传的视频数量（task_status=review_completed）
    - videos_with_violations: 出现任一违规项的视频数
    - videos_without_violations: 没有任一违规项的视频数
    - category_violations: 各个违规项的视频数
    - start_date: 实际查询的开始日期
    - end_date: 实际查询的结束日期
    """
    try:
        # 构建基础查询 - 只统计task_status为review_completed的视频
        base_query = db.query(VideoInfo).filter(
            VideoInfo.task_status == "review_completed"
        )

        # 记录实际查询的日期范围
        actual_start_date = start_date
        actual_end_date = end_date

        # 应用日期筛选
        if start_date:
            # 设置为当天的开始时间 (00:00:00)
            start_datetime = datetime.combine(start_date.date(), time.min)
            base_query = base_query.filter(VideoInfo.created_at >= start_datetime)
            actual_start_date = start_datetime

        if end_date:
            # 设置为当天的结束时间 (23:59:59)
            end_datetime = datetime.combine(end_date.date(), time.max)
            base_query = base_query.filter(VideoInfo.created_at <= end_datetime)
            actual_end_date = end_datetime

        # 1. 总视频数量
        total_videos = base_query.count()

        # 2. 获取所有有违规的视频ID
        videos_with_violations_query = db.query(VideoEvaluation.video_id).filter(
            VideoEvaluation.is_compliant == False
        ).distinct()

        # 转换为子查询
        subquery = videos_with_violations_query.subquery()

        # 查询有违规的视频
        videos_with_violations = base_query.join(
            subquery, VideoInfo.video_id == subquery.c.video_id
        ).count()

        # 3. 没有违规的视频数
        videos_without_violations = total_videos - videos_with_violations

        # 4. 各个违规项的统计
        category_stats_query = db.query(
            VideoEvaluation.category_name,
            VideoEvaluation.parent_category,
            EvaluationCategory.behavior_code,
            func.count(VideoEvaluation.video_id.distinct()).label('violation_count')
        ).join(
            VideoInfo, VideoEvaluation.video_id == VideoInfo.video_id
        ).join(
            EvaluationCategory, VideoEvaluation.category_id == EvaluationCategory.id
        ).filter(
            and_(
                VideoInfo.task_status == "review_completed",
                VideoEvaluation.is_compliant == False,
                VideoEvaluation.category_name == EvaluationCategory.category_name
            )
        ).group_by(
            VideoEvaluation.category_name,
            VideoEvaluation.parent_category,
            EvaluationCategory.behavior_code
        ).order_by(
            func.count(VideoEvaluation.video_id.distinct()).desc()
        )

        # 应用日期筛选
        if start_date:
            category_stats_query = category_stats_query.filter(
                VideoInfo.created_at >= start_datetime
            )
        if end_date:
            category_stats_query = category_stats_query.filter(
                VideoInfo.created_at <= end_datetime
            )

        category_stats_results = category_stats_query.all()

        # 转换为响应格式
        category_violations = [
            CategoryStats(
                category_name=row.category_name,
                parent_category=row.parent_category,
                behavior_code=row.behavior_code,
                violation_count=row.violation_count
            )
            for row in category_stats_results
        ]

        # 如果没有设置日期范围，使用数据库中的实际范围
        if not actual_start_date or not actual_end_date:
            date_range = base_query.with_entities(
                func.min(VideoInfo.created_at).label('min_date'),
                func.max(VideoInfo.created_at).label('max_date')
            ).first()

            if date_range and date_range.min_date:
                actual_start_date = actual_start_date or date_range.min_date
                actual_end_date = actual_end_date or date_range.max_date

        logger.info(
            f"统计查询成功 - 用户: {current_user.email}, "
            f"时间范围: {actual_start_date} 到 {actual_end_date}, "
            f"总视频数: {total_videos}, 有违规: {videos_with_violations}, "
            f"无违规: {videos_without_violations}"
        )

        return VideoStatisticsResponse(
            total_videos=total_videos,
            videos_with_violations=videos_with_violations,
            videos_without_violations=videos_without_violations,
            category_violations=category_violations,
            start_date=actual_start_date or datetime.now(),
            end_date=actual_end_date or datetime.now()
        )

    except Exception as e:
        logger.error(f"统计查询失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"统计查询失败: {str(e)}"
        )


@router.get("/dashboard/export")
def export_statistics_csv(
    start_date: Optional[datetime] = Query(None, description="开始日期 (ISO 8601格式: YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="结束日期 (ISO 8601格式: YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    导出统计数据的CSV文件

    **查询参数：**
    - start_date: 开始日期（可选）
    - end_date: 结束日期（可选）

    **返回：**
    - CSV 文件
    """
    try:
        # 获取统计数据
        stats = get_statistics_dashboard(
            start_date=start_date,
            end_date=end_date,
            db=db,
            current_user=current_user
        )

        # 创建CSV内容
        output = StringIO()
        writer = csv.writer(output)

        # 写入BOM以支持Excel显示中文
        output.write('\ufeff')

        # 写入标题和日期范围
        writer.writerow(["51Talk 视频质检统计报告"])
        writer.writerow([])
        writer.writerow(["统计时间范围:", f"{stats.start_date.strftime('%Y-%m-%d %H:%M')} 至 {stats.end_date.strftime('%Y-%m-%d %H:%M')}"])
        writer.writerow(["生成时间:", datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(["操作用户:", current_user.email])
        writer.writerow([])

        # 写入概览统计
        writer.writerow(["=== 概览统计 ==="])
        writer.writerow(["统计项目", "数量", "占比"])
        total = stats.total_videos or 1  # 避免除零
        writer.writerow(["审核完成的视频总数", stats.total_videos, "100%"])
        writer.writerow(["出现任一违规的视频数", stats.videos_with_violations,
                        f"{stats.videos_with_violations/total*100:.1f}%"])
        writer.writerow(["没有任何违规的视频数", stats.videos_without_violations,
                        f"{stats.videos_without_violations/total*100:.1f}%"])
        writer.writerow([])

        # 写入违规项详细统计
        writer.writerow(["=== 违规项详细统计 ==="])
        writer.writerow(["父类别", "违规项名称", "行为代码", "违规视频数", "占总视频比例"])

        for violation in stats.category_violations:
            percentage = violation.violation_count / total * 100
            writer.writerow([
                violation.parent_category,
                violation.category_name,
                violation.behavior_code,
                violation.violation_count,
                f"{percentage:.1f}%"
            ])

        # 准备响应
        output.seek(0)
        csv_content = output.getvalue()
        filename = f"video_statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        logger.info(f"统计数据导出成功 - 用户: {current_user.email}, 文件名: {filename}")

        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        logger.error(f"统计导出失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"统计导出失败: {str(e)}"
        )
