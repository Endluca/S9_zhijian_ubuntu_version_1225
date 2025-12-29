# 统计看板功能说明

## 功能概述

本次新增了一个**统计看板**页面，位于根路径 `/`，用于展示视频质检数据的统计分析。

### 主要功能

1. **数据统计**
   - 显示总视频数量（只包含 `task_status` 为 `review_completed` 的视频）
   - 显示出现任一违规项的视频数量
   - 显示没有任何违规项的视频数量
   - 显示各个违规项的详细统计（按视频数排序）

2. **时间筛选**
   - 支持按日期范围筛选（开始日期、结束日期）
   - 支持清除筛选以查看所有时间的数据
   - 日期筛选自动包含起始/结束日期的完整时间段

3. **数据可视化**
   - 饼图：展示合规与违规视频的比例分布
   - 柱状图：展示最常见的前10个违规项分布
   - 详细表格：展示所有违规项的统计数据，包括父类别、违规项名称、行为代码、违规视频数和占比

4. **数据导出**
   - 支持导出CSV格式的统计报告
   - CSV文件包含：时间范围、概览统计、详细违规项统计
   - 自动生成包含时间戳的文件名

## 技术实现

### 后端API

#### 1. 统计查询 API
- **端点**: `GET /api/statistics/dashboard`
- **查询参数**:
  - `start_date`: 开始日期（可选，ISO 8601格式）
  - `end_date`: 结束日期（可选，ISO 8601格式）
- **响应数据**: `VideoStatisticsResponse`
  ```json
  {
    "total_videos": 100,
    "videos_with_violations": 30,
    "videos_without_violations": 70,
    "category_violations": [
      {
        "category_name": "虚拟背景使用",
        "parent_category": "A. 课堂准备与规范",
        "behavior_code": "VIRTUAL_BACKGROUND",
        "violation_count": 15
      }
    ],
    "start_date": "2024-12-01T00:00:00",
    "end_date": "2024-12-31T23:59:59"
  }
  ```

#### 2. CSV导出 API
- **端点**: `GET /api/statistics/dashboard/export`
- **查询参数**: 同统计查询 API
- **响应**: CSV文件下载

### 前端页面

- **页面路径**: `/` (根路径)
- **组件**: `StatisticsDashboard.tsx`
- **路由**: 已添加到 `App.tsx`
- **侧边栏导航**: 已在 `AppSidebar.tsx` 中添加菜单项

### 核心文件

#### 后端
- `backend/app/schemas/statistics.py` - 统计相关的Pydantic模式
- `backend/app/routers/statistics.py` - 统计API路由
- `backend/app/main.py` - 已注册statistics router

#### 前端
- `frontend/src/types/api.ts` - 添加了统计相关的TypeScript类型
- `frontend/src/api/statistics.ts` - 统计API客户端函数
- `frontend/src/pages/StatisticsDashboard.tsx` - 统计看板页面组件
- `frontend/src/App.tsx` - 添加了统计看板路由
- `frontend/src/pages/Index.tsx` - 修改跳转路径为 /statistics
- `frontend/src/components/AppSidebar.tsx` - 添加统计看板导航菜单

## 使用说明

### 访问统计看板

1. 登录系统后，点击根路径 `/` 或侧边栏中的"统计看板"
2. 系统将显示所有审核完成的视频统计数据

### 使用日期筛选

1. 在"时间筛选"区域选择开始日期和/或结束日期
2. 系统将自动重新加载指定时间范围内的数据
3. 点击"清除筛选"可恢复显示所有时间的数据

### 导出CSV报告

1. 点击右上角的"导出CSV"按钮
2. 系统将生成并下载包含当前筛选条件数据的CSV文件
3. CSV文件使用UTF-8编码，包含BOM以确保Excel正确显示中文

## 数据范围说明

- **统计范围**: 只统计 `task_status = 'review_completed'` 的视频
- **数据来源**: `video_info` 表的 `created_at` 字段
- **违规判断**: 基于 `video_evaluations` 表中 `is_compliant = false` 的记录

## 图表说明

### 合规性分布饼图
- **绿色**: 无违规视频
- **红色**: 有违规视频

### 违规项分布柱状图
- 显示最常见的前10个违规项
- 按违规视频数量从高到低排序
- 每个柱子使用不同的颜色以提高可读性

## 注意事项

1. 数据实时性：统计数据基于数据库当前状态，不缓存
2. 日期处理：日期筛选包含完整日期范围（当天的00:00:00到23:59:59）
3. 性能：对于大量数据，建议使用日期范围筛选以提高查询效率
4. 零违规显示：当某个违规项的计数为0时，不会显示在统计结果中
