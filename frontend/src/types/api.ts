// ==================== 认证相关 ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  created_at?: string;
}

// ==================== 视频上传 ====================

export interface VideoUploadRequest {
  student_id: string;
  teacher_name: string;
  class_time: string; // ISO 8601 格式
  video_url: string;
}

export interface VideoUploadResponse {
  success: boolean;
  message: string;
  video_id: string;
}

// ==================== 视频列表 ====================

export interface VideoListParams {
  student_id?: string;
  teacher_name?: string;
  class_time_start?: string;
  class_time_end?: string;
  task_status?: string;
  compliance_status?: string;
  violation_categories?: string;
  page: number;
  page_size: number;
}

export interface VideoResponse {
  video_id: string;
  student_id: string;
  teacher_name: string;
  class_time: string;
  video_duration: string | null;
  original_video_url?: string;
  task_status: 'uploaded' | 'processing' | 'failed' | 'pending_review' | 'review_completed';
  compliance_status: '正常' | '有违规' | '未质检完成';
  current_step?: string;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
  violations?: ViolationItem[];  // 违规项列表
  frame_urls?: string[];  // 关键帧 URL 列表
}

export interface VideoListResponse {
  data: VideoResponse[];
  total: number;
  page: number;
  page_size: number;
}

// ==================== 视频详情 ====================

export interface VideoDetailResponse extends VideoResponse {
  frame_urls: string[];
  formatted_text: string | null;
  llm_thinking: string | null;
  llm_result_json?: string | null;
  asr_raw_json?: string | null;
  evaluations: EvaluationItem[];
  violations: ViolationItem[];
}

export interface EvaluationItem {
  category_id: number;  // 评估类别ID
  category_name: string;
  parent_category: string;
  behavior_code: string;
  is_compliant: boolean | null;
  evidence_timestamp: string[];
  analysis_comment: string | null;
}

export interface ViolationItem {
  parent_category: string;
  category_name: string;
  is_compliant: boolean;
  evidence_timestamp: string[];
  analysis_comment: string | null;
}

// ==================== 评估更新 ====================

export interface EvaluationUpdateRequest {
  is_compliant: boolean;
  analysis_comment?: string;
}

export interface EvaluationUpdateResponse {
  success: boolean;
  message: string;
  video_status: string;
}

// ==================== 评估类别 ====================

export interface CategoryResponse {
  parent_category: string;
  children: CategoryChild[];
}

export interface CategoryChild {
  id: number;
  category_name: string;
  behavior_code: string;
  criteria: string;
  display_order?: number;
}

// ==================== 通用响应 ====================

export interface ApiError {
  detail: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

// ==================== 统计分析 ====================

export interface CategoryStats {
  category_name: string;
  parent_category: string;
  behavior_code: string;
  violation_count: number;
}

export interface VideoStatisticsResponse {
  total_videos: number;
  videos_with_violations: number;
  videos_without_violations: number;
  category_violations: CategoryStats[];
  start_date: string;
  end_date: string;
}

export interface StatisticsParams {
  start_date?: string; // ISO 8601 format
  end_date?: string; // ISO 8601 format
}
