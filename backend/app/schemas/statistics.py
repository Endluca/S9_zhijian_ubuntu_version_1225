"""
统计相关的Pydantic模式
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryStats(BaseModel):
    """违规项统计详情"""
    category_name: str
    parent_category: str
    behavior_code: str
    violation_count: int


class VideoStatisticsResponse(BaseModel):
    """视频统计响应"""
    # 基础统计
    total_videos: int
    videos_with_violations: int
    videos_without_violations: int

    # 违规项详情
    category_violations: List[CategoryStats]

    # 时间范围
    start_date: datetime
    end_date: datetime


class StatisticsExportRequest(BaseModel):
    """统计导出请求"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
