export interface ViolationItem {
  category: string;
  subCategory: string;
}

export type CoverStatus = 'pending' | 'pass' | 'fail';

// 检测状态：已上传 -> 处理中 -> 待人工质检 -> 质检完成 / 处理失败
export type DetectionStatus = 'uploaded' | 'processing' | 'pending_review' | 'completed' | 'failed';

export interface QARecord {
  id: string;
  courseId: string;
  studentId: string;
  teacherName: string;
  classTime: string;
  classDuration: string;
  videoLink: string;
  screenshot: string;
  isViolation: boolean;
  complianceStatus: string;  // 合规状态：正常/有违规/未质检完成
  violations: ViolationItem[];
  status: 'processing' | 'completed' | 'failed';
  coverStatus: CoverStatus;
  detectionStatus: DetectionStatus;
  createdAt: string;
  // 详情页扩展字段
  asrText?: string;
  keyframes?: string[];
  modelThinking?: string;
  modelResult?: string;
}

export interface ViolationCategory {
  id: string;
  label: string;
  children: ViolationSubCategory[];
}

export interface ViolationSubCategory {
  id: string;
  label: string;
  parentId: string;
}

export interface FilterState {
  courseId: string;
  studentId: string;
  teacherName: string;
  dateRange: [Date | null, Date | null];
  status: 'all' | 'true' | 'false' | 'pending';  // 添加 'pending' 表示未质检完成
  violationCategories: string[];
  detectionStatus: 'all' | 'uploaded' | 'processing' | 'pending_review' | 'completed' | 'failed';
}

export type ViewMode = 'list' | 'card';

