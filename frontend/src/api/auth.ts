import client from './client';
import type { LoginResponse, UserInfo } from '@/types/api';

export const authApi = {
  // 登录
  login: (email: string, password: string) => {
    return client.post<LoginResponse>('/auth/login', { email, password });
  },

  // 获取用户信息
  getProfile: () => {
    return client.get<UserInfo>('/auth/profile');
  },
};
