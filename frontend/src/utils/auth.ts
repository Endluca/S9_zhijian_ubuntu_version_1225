import type { UserInfo } from '@/types/api';

export const authUtils = {
  // 保存 token
  setToken: (token: string) => {
    localStorage.setItem('access_token', token);
  },

  // 获取 token
  getToken: () => {
    return localStorage.getItem('access_token');
  },

  // 保存用户信息
  setUserInfo: (user: UserInfo) => {
    localStorage.setItem('user_info', JSON.stringify(user));
  },

  // 获取用户信息
  getUserInfo: (): UserInfo | null => {
    const userStr = localStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
  },

  // 清除认证信息
  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  },

  // 检查是否已登录
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};
