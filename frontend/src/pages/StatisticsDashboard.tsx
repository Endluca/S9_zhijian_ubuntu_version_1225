import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { statisticsApi } from '@/api';
import type { VideoStatisticsResponse } from '@/types/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, FileDown, Calendar, BarChart3, Bell, Menu } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

// 颜色配置 - 柔和渐变配色方案
// 主图表配色（蓝紫渐变系 - 柔和现代）
const COLORS = [
  'hsl(221, 83%, 65%)',  // 柔和蓝
  'hsl(248, 83%, 70%)',  // 柔和紫
  'hsl(210, 83%, 65%)',  // 天空蓝
  'hsl(269, 83%, 70%)',  // 淡紫
  'hsl(193, 83%, 65%)',  // 青蓝
  'hsl(280, 83%, 70%)',  // 薰衣草紫
  'hsl(180, 83%, 65%)',  // 青绿
  'hsl(200, 83%, 65%)',  // 深天蓝
  'hsl(260, 83%, 70%)',  // 紫罗兰
  'hsl(230, 83%, 65%)',  // 靛蓝
];

// 饼图配色 - 更柔和的绿色和红色
const PIE_COLORS = [
  'hsl(142, 69%, 58%)',  // 柔和绿色（合规）
  'hsl(0, 84%, 65%)',    // 柔和珊瑚红（违规）
];

export default function StatisticsDashboard() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 获取统计数据
  const { data: statistics, isLoading, refetch } = useQuery<
    VideoStatisticsResponse,
    Error
  >({
    queryKey: ['statistics', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await statisticsApi.getStatistics({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分钟缓存
  });

  // 处理日期变化
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    // 自动重新查询
    setTimeout(() => {
      refetch();
    }, 100);
  };

  // 导出CSV
  const handleExportCSV = async () => {
    try {
      const response = await statisticsApi.exportStatisticsCSV({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'video_statistics.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: '统计报告已下载到本地',
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast({
        title: '导出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 准备饼图数据
  const getPieData = () => {
    if (!statistics) return [];

    return [
      { name: '无违规视频', value: statistics.videos_without_violations },
      { name: '有违规视频', value: statistics.videos_with_violations },
    ];
  };

  // 准备柱状图数据（限制显示前10个最常见的违规项）
  const getBarData = () => {
    if (!statistics) return [];

    const sorted = [...statistics.category_violations]
      .sort((a, b) => b.violation_count - a.violation_count)
      .slice(0, 10); // 只显示前10个

    return sorted.map((item, index) => ({
      name: item.category_name,
      count: item.violation_count,
      color: COLORS[index % COLORS.length],
    }));
  };

  // 格式化日期显示
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '所有时间';
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy年MM月dd日', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 border-b border-border/40 shadow-lg shadow-primary/5">
            <div className="px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon" className="hover:bg-secondary">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      统计看板
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="btn-hover"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  导出CSV
                </Button>
                <Button variant="ghost" size="icon" className="relative hover:bg-secondary">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive-foreground">5</span>
                  </span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="container mx-auto space-y-6">

      {/* 日期筛选 */}
      <Card className="border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent/10 to-accent/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">时间筛选</CardTitle>
              <CardDescription>
                选择要统计的时间范围
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">开始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="bg-background/70"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date" className="text-sm font-medium">结束日期</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="bg-background/70"
              />
            </div>
            <Button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                refetch();
              }}
              variant="outline"
              className="btn-hover"
            >
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计概览卡片 */}
      {statistics && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group card-hover border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">总视频数</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {statistics.total_videos}
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-success/60"></span>
                  审核完成 (review_completed)
                </p>
              </CardContent>
            </Card>

            <Card className="group card-hover border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">有违规视频</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-destructive/10 to-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold bg-gradient-to-r from-destructive to-destructive/80 bg-clip-text text-transparent">
                  {statistics.videos_with_violations}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {statistics.total_videos > 0
                    ? `${((statistics.videos_with_violations / statistics.total_videos) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>

            <Card className="group card-hover border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">无违规视频</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/10 to-success/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold bg-gradient-to-r from-success to-success/80 bg-clip-text text-transparent">
                  {statistics.videos_without_violations}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {statistics.total_videos > 0
                    ? `${((statistics.videos_without_violations / statistics.total_videos) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 图表展示区 */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 饼图：有违规 vs 无违规 */}
            <Card className="border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent/10 to-accent/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                  </div>
                  <div>
                    <CardTitle className="text-base">合规性分布</CardTitle>
                    <CardDescription>有违规与无违规视频比例</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getPieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}\n${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} 个视频`, '数量']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 4px 20px -4px hsl(25 30% 50% / 0.1)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{
                        paddingTop: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 柱状图：各违规项分布 */}
            <Card className="md:col-span-2 border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">违规项分布 (Top 10)</CardTitle>
                    <CardDescription>最常见的违规项目统计（按出现次数排序）</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={getBarData()}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} 个视频`, '违规视频数']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 4px 20px -4px hsl(25 30% 50% / 0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {getBarData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 详细统计表格 */}
          <Card className="border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                  <div className="text-xs font-bold text-primary">#</div>
                </div>
                <div>
                  <CardTitle className="text-base">违规项详细统计</CardTitle>
                  <CardDescription>按父类别和违规项名称统计</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-muted-foreground font-medium">父类别</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">违规项名称</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">行为代码</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">违规视频数</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">占比</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {statistics.category_violations.map((item, index) => {
                      const percentage =
                        statistics.total_videos > 0
                          ? ((item.violation_count / statistics.total_videos) * 100).toFixed(1)
                          : '0';
                      return (
                        <tr key={index} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="p-3">{item.parent_category}</td>
                          <td className="p-3">
                            <span className="font-medium">{item.category_name}</span>
                          </td>
                          <td className="p-3">
                            <code className="text-xs bg-gradient-to-r from-primary/10 to-primary/20 px-2 py-1 rounded-md font-mono text-primary">
                              {item.behavior_code}
                            </code>
                          </td>
                          <td className="text-right p-3 font-medium">{item.violation_count}</td>
                          <td className="text-right p-3">
                            <span className="text-sm">{percentage}%</span>
                            <div className="mt-1">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {statistics.category_violations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-6 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <BarChart3 className="w-5 h-5 text-muted-foreground" />
                            </div>
                            暂无违规数据
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">加载统计数据中...</p>
          </div>
        </div>
      )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
