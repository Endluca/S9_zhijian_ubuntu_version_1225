export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const TASK_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  FAILED: 'failed',
  PENDING_REVIEW: 'pending_review',
  REVIEW_COMPLETED: 'review_completed',
} as const;

export const COMPLIANCE_STATUS = {
  NORMAL: '正常',
  VIOLATION: '有违规',
  PENDING: '未质检完成',
} as const;

export const TASK_STATUS_LABELS = {
  uploaded: '已上传',
  processing: '处理中',
  failed: '失败',
  pending_review: '待人工质检',
  review_completed: '质检完成',
} as const;

export const COMPLIANCE_STATUS_LABELS = {
  '正常': '正常',
  '有违规': '有违规',
  '未质检完成': '未质检完成',
} as const;
