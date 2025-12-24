import client from './client';
import type { CategoryResponse } from '@/types/api';

export const categoriesApi = {
  // 获取评估类别
  getCategories: () => {
    return client.get<CategoryResponse[]>('/api/categories');
  },
};
