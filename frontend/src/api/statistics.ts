import client from './client';
import type {
  VideoStatisticsResponse,
  StatisticsParams,
} from '@/types/api';

export const statisticsApi = {
  // 获取统计看板数据
  getStatistics: (params: StatisticsParams) => {
    return client.get<VideoStatisticsResponse>('/statistics/dashboard', {
      params,
    });
  },

  // 导出统计CSV文件
  exportStatisticsCSV: (params: StatisticsParams) => {
    return client.get('/statistics/dashboard/export', {
      params,
      responseType: 'blob',
    });
  },
};
