import type { VideoResponse, VideoDetailResponse } from '@/types/api';
import type { QARecord, DetectionStatus, ViolationItem } from '@/types/qa';

// 后端 task_status 映射到前端 DetectionStatus
// 后端可能的值: uploaded, processing, failed, pending_review, review_completed
const mapTaskStatusToDetectionStatus = (taskStatus: string): DetectionStatus => {
  switch (taskStatus) {
    case 'uploaded':
      return 'uploaded';
    case 'processing':
      return 'processing';
    case 'pending_review':
      return 'pending_review';
    case 'review_completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'processing';
  }
};

// 从后端违规数据中提取违规项
const extractViolationsFromApi = (violations?: any[]): ViolationItem[] => {
  if (!violations || violations.length === 0) return [];
  
  return violations.map(violation => ({
    category: violation.parent_category || '未知分类',
    subCategory: violation.category_name || '未知',  // 直接使用 category_name（中文名称）
  }));
};

// 从后端评估数据中提取违规项（用于详情页）
const extractViolations = (evaluations?: any[]): ViolationItem[] => {
  if (!evaluations || evaluations.length === 0) return [];
  
  return evaluations
    .filter(evaluation => evaluation.is_compliant === false)
    .map(evaluation => ({
      category: evaluation.parent_category || '未知分类',
      subCategory: evaluation.category_name || '未知',  // 直接使用 category_name（中文名称）
    }));
};

// 后端 API 数据转换为前端 QARecord 格式
export const transformVideoResponse = (apiData: VideoResponse): QARecord => {
  const detectionStatus = mapTaskStatusToDetectionStatus(apiData.task_status);
  const isViolation = apiData.compliance_status === '有违规';
  const violations = extractViolationsFromApi(apiData.violations);
  
  // 使用 frame_urls 的第三张图片作为封面（索引为2）
  const screenshot = apiData.frame_urls && apiData.frame_urls.length > 2 
    ? apiData.frame_urls[2] 
    : apiData.frame_urls && apiData.frame_urls.length > 0
    ? apiData.frame_urls[0]  // 如果少于3张，使用第一张
    : '/placeholder.svg';  // 没有图片时使用占位图
  
  return {
    id: apiData.video_id,
    courseId: apiData.video_id,
    studentId: apiData.student_id,
    teacherName: apiData.teacher_name,
    classTime: new Date(apiData.class_time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    classDuration: apiData.video_duration || 'N/A',
    videoLink: apiData.original_video_url || '',
    screenshot,
    isViolation,
    complianceStatus: apiData.compliance_status,  // 添加合规状态
    violations, // 从后端返回的违规信息
    status: apiData.task_status === 'failed' ? 'failed' : 'completed',
    coverStatus: 'pass', // 默认通过
    detectionStatus,
    createdAt: apiData.created_at,
  };
};

// 详情数据转换
export const transformVideoDetailResponse = (apiData: VideoDetailResponse): QARecord => {
  const baseRecord = transformVideoResponse(apiData);
  const violations = extractViolations(apiData.evaluations);
  
  return {
    ...baseRecord,
    violations,
    screenshot: apiData.frame_urls?.[0] || '/placeholder.svg', // 使用第一帧作为封面
    asrText: apiData.formatted_text || undefined,
    keyframes: apiData.frame_urls || [],
    modelThinking: apiData.llm_thinking || undefined,
    modelResult: apiData.llm_result_json || undefined,
  };
};

// 格式化日期时间
export const formatDateTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 处理frame_urls字段（逗号分隔字符串转数组）
export const parseFrameUrls = (frameUrls: string | null): string[] => {
  if (!frameUrls) return [];
  return frameUrls.split(',').filter(url => url.trim());
};
