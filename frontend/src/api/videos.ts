import client from './client';
import type {
  VideoUploadRequest,
  VideoUploadResponse,
  VideoListParams,
  VideoListResponse,
  VideoDetailResponse,
  EvaluationUpdateRequest,
  EvaluationUpdateResponse,
  SuccessResponse,
} from '@/types/api';

export const videosApi = {
  // 上传视频
  uploadVideo: (data: VideoUploadRequest) => {
    return client.post<VideoUploadResponse>('/api/videos/upload', data);
  },

  // 获取视频列表
  getVideos: (params: VideoListParams) => {
    return client.get<VideoListResponse>('/api/videos', { params });
  },

  // 获取视频详情
  getVideoDetail: (videoId: string) => {
    return client.get<VideoDetailResponse>(`/api/videos/${videoId}`);
  },

  // 删除视频
  deleteVideo: (videoId: string) => {
    return client.delete<SuccessResponse>(`/api/videos/${videoId}`);
  },

  // 更新评估结果
  updateEvaluation: (
    videoId: string,
    categoryId: number,
    data: EvaluationUpdateRequest
  ) => {
    return client.patch<EvaluationUpdateResponse>(
      `/api/videos/${videoId}/evaluations/${categoryId}`,
      data
    );
  },

  // 生成报告
  generateReport: (videoId: string) => {
    return client.get(`/api/videos/${videoId}/report`, {
      responseType: 'blob',
    });
  },
};
