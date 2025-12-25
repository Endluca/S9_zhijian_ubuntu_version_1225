import axios from 'axios';
import { toast } from '@/hooks/use-toast';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.detail || '请求失败';

    if (status === 401) {
      // Token 过期，清除并跳转登录
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
      toast({
        title: '登录已过期',
        description: '请重新登录',
        variant: 'destructive',
      });
    } else if (status === 403) {
      toast({
        title: '权限不足',
        description: message,
        variant: 'destructive',
      });
    } else if (status >= 500) {
      toast({
        title: '服务器错误',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);

export default client;
