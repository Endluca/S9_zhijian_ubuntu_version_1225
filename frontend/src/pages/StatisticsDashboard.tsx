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

// 颜色配置 - 单调和谐配色
const COLORS = [
  '#4c6ef5',
  '#364fc7',
  '#6741d9',
  '#5f3dc4',
  '#4285F4',
  '#3367d6',
  '#f59f00',
  '#f57c00',
  '#e8590c',
  '#d9480f',
];

const PIE_COLORS = ['#22c55e', '#ef4444']; // 绿色（合规）和红色（违规）

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
          <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
            <div className="px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <div className="flex items-center space-x-4">
                  <BarChart3 className="w-7 h-7 text-primary" />
                  <div>
                    <h1 className="text-lg font-semibold">统计看板</h1>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" />
                  导出CSV
                </Button>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="container mx-auto space-y-6">

      {/* 日期筛选 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <CardTitle>时间筛选</CardTitle>
          </div>
          <CardDescription>
            选择要统计的时间范围（留空表示所有时间）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="start-date">开始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">结束日期</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                refetch();
              }}
              variant="outline"
            >
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计概览卡片 */}
      {statistics && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总视频数</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_videos}</div>
                <p className="text-xs text-muted-foreground">
                  审核完成 (review_completed)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">有违规视频</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {statistics.videos_with_violations}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics.total_videos > 0
                    ? `${((statistics.videos_with_violations / statistics.total_videos) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">无违规视频</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {statistics.videos_without_violations}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics.total_videos > 0
                    ? `${((statistics.videos_without_violations / statistics.total_videos) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 图表展示区 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 饼图：有违规 vs 无违规 */}
            <Card>
              <CardHeader>
                <CardTitle>合规性分布</CardTitle>
                <CardDescription>
                  有违规与无违规视频比例
                </CardDescription>
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
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} 个视频`, '数量']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 柱状图：各违规项分布 */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>违规项分布 (Top 10)</CardTitle>
                <CardDescription>
                  最常见的违规项目统计（按出现次数排序）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={getBarData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value} 个视频`, '违规视频数']} />
                    <Bar dataKey="count" fill="#4c6ef5">
                      {getBarData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 详细统计表格 */}
          <Card>
            <CardHeader>
              <CardTitle>违规项详细统计</CardTitle>
              <CardDescription>
                按父类别和违规项名称统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">父类别</th>
                      <th className="text-left p-2">违规项名称</th>
                      <th className="text-left p-2">行为代码</th>
                      <th className="text-right p-2">违规视频数</th>
                      <th className="text-right p-2">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.category_violations.map((item, index) => {
                      const percentage =
                        statistics.total_videos > 0
                          ? ((item.violation_count / statistics.total_videos) * 100).toFixed(1)
                          : '0';
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2">{item.parent_category}</td>
                          <td className="p-2">{item.category_name}</td>
                          <td className="p-2">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {item.behavior_code}
                            </code>
                          </td>
                          <td className="text-right p-2">{item.violation_count}</td>
                          <td className="text-right p-2">{percentage}%</td>
                        </tr>
                      );
                    })}
                    {statistics.category_violations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-4 text-muted-foreground">
                          暂无违规数据
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
