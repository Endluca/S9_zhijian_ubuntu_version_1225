import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { authApi } from '@/api';
import { authUtils } from '@/utils/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 调用真实的登录API
      const { data } = await authApi.login(form.email, form.password);

      // 保存token和用户信息
      authUtils.setToken(data.access_token);
      authUtils.setUserInfo(data.user);

      toast({
        title: "登录成功",
        description: `欢迎回来，${data.user.email}`,
      });

      // 跳转到看板
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.response?.data?.detail || '邮箱或密码错误',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background decorations with gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-accent/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-gradient-to-tr from-success/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Floating particles effect */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-accent/30 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-success/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Login Card with entrance animation */}
      <div className="relative w-full max-w-md scale-in">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/30">
          {/* Logo area with animation */}
          <div className="flex justify-center mb-4 fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                AC
              </div>
            </div>
          </div>

          {/* Title with enhanced animation */}
          <div className="text-center mb-8 fade-in-up stagger-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">
              AC教室质检平台
            </h1>
            <p className="text-gray-600 text-sm font-medium flex items-center justify-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/60"></span>
              智能质检 · 数据驱动 · 品质保障
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/60"></span>
            </p>
          </div>

          {/* Hint with glass effect */}
          <div className="mb-6 p-4 bg-blue-50/70 border border-blue-200/50 rounded-lg backdrop-blur-sm fade-in-up stagger-2">
            <p className="text-sm text-blue-700">
              <strong>提示：</strong> 默认账号: <code className="bg-blue-100/70 px-2 py-0.5 rounded font-mono">51talk</code>，密码: <code className="bg-blue-100/70 px-2 py-0.5 rounded font-mono">123456</code>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱/账号</Label>
              <Input
                id="email"
                type="text"
                placeholder="请输入邮箱或账号"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  登录中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  登录
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
