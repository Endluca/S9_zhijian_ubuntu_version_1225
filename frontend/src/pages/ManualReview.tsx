import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Menu, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Video,
  ExternalLink,
  ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { videosApi } from '@/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ManualReview: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [framesExpanded, setFramesExpanded] = useState(false);
  const lastCheckedVideoIdRef = useRef<string | null>(null);
  // 保存初始视频列表长度，用于右上角显示
  const initialVideoCountRef = useRef<number | null>(null);

  // 获取待人工审核的视频列表
  const { data: videosData, isLoading } = useQuery({
    queryKey: ['manual-review-videos'],
    queryFn: async () => {
      const response = await videosApi.getVideos({
        task_status: 'pending_review',
        page: 1,
        page_size: 100,
      });
      return response.data;
    },
    // 只在组件挂载时获取一次，不自动刷新
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 当前视频
  const videos = videosData?.data || [];
  
  // 初始化时保存视频列表长度
  useEffect(() => {
    if (videos.length > 0 && initialVideoCountRef.current === null) {
      initialVideoCountRef.current = videos.length;
    }
  }, [videos.length]);

  // 确保 currentIndex 不会超出范围
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= videos.length) {
      setCurrentIndex(Math.max(0, videos.length - 1));
    }
  }, [videos.length, currentIndex]);

  const currentVideo = videos[currentIndex];

  // 获取当前视频详情
  const { data: currentDetail, isLoading: isLoadingDetail, isError: isErrorDetail } = useQuery({
    queryKey: ['video-detail', currentVideo?.video_id],
    queryFn: () => videosApi.getVideoDetail(currentVideo!.video_id).then(res => res.data),
    enabled: !!currentVideo,
    retry: 2,
  });

  // 需要人工审核的评估项（is_compliant 为 null）
  const pendingEvaluations = useMemo(() => {
    if (!currentDetail?.evaluations) return [];
    return currentDetail.evaluations.filter(e => e.is_compliant === null);
  }, [currentDetail]);

  // 当前正在审核的评估项
  const currentEvaluation = pendingEvaluations[0];

  // 当视频详情加载完成但没有待审核项时，自动跳到下一个视频
  useEffect(() => {
    if (currentDetail && !isLoadingDetail && pendingEvaluations.length === 0 && videos.length > 0) {
      const videoId = currentDetail.video_id;
      // 避免重复处理同一个视频（只在视频ID改变时检查一次）
      if (lastCheckedVideoIdRef.current !== videoId) {
        lastCheckedVideoIdRef.current = videoId;
        // 当前视频没有待审核项，自动跳到下一个
        if (currentIndex < videos.length - 1) {
          setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
          }, 300);
        }
      }
    }
  }, [currentDetail?.video_id, isLoadingDetail, pendingEvaluations.length, currentIndex, videos.length]);

  // 更新评估结果
  const updateMutation = useMutation({
    mutationFn: async ({ isCompliant }: { isCompliant: boolean }) => {
      if (!currentDetail || !currentEvaluation) return;
      
      // 直接使用评估项中的 category_id
      const categoryId = currentEvaluation.category_id;

      return videosApi.updateEvaluation(
        currentDetail.video_id,
        categoryId,
        { is_compliant: isCompliant }
      );
    },
    onSuccess: async () => {
      toast.success('评估结果已保存');
      // 只刷新视频详情，不刷新视频列表（避免列表变化导致索引越界）
      queryClient.invalidateQueries({ queryKey: ['video-detail', currentVideo?.video_id] });
      
      // 重新获取最新的视频详情数据
      try {
        const latestDetail = await queryClient.fetchQuery({
          queryKey: ['video-detail', currentVideo?.video_id],
          queryFn: () => videosApi.getVideoDetail(currentVideo!.video_id).then(res => res.data),
        });
        
        // 检查是否还有待审核的项
        const remainingPending = latestDetail?.evaluations?.filter(e => e.is_compliant === null) || [];
        
        if (remainingPending.length === 0) {
          // 没有待审核项了，跳到下一个视频
          if (currentIndex < videos.length - 1) {
            setTimeout(() => {
              setCurrentIndex(currentIndex + 1);
            }, 300);
          } else {
            toast.success('所有视频已审核完毕！');
          }
        }
      } catch (error) {
        // 如果获取数据失败，仍然尝试跳转（基于当前已知的状态）
        if (pendingEvaluations.length <= 1 && currentIndex < videos.length - 1) {
          setTimeout(() => {
            setCurrentIndex(currentIndex + 1);
          }, 300);
        }
      }
    },
    onError: (error: any) => {
      toast.error(`保存失败: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handlePass = () => {
    updateMutation.mutate({ isCompliant: true });
  };

  const handleFail = () => {
    updateMutation.mutate({ isCompliant: false });
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
                <h1 className="text-lg font-semibold">人工审核 - 人像清晰度和完整度</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {videos.length > 0 && initialVideoCountRef.current !== null
                    ? `${currentIndex + 1} / ${initialVideoCountRef.current}`
                    : videos.length > 0
                    ? `${currentIndex + 1} / ${videos.length}`
                    : '0 / 0'}
                </span>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">没有待审核的视频</h2>
                  <p className="text-muted-foreground">所有视频都已完成人工审核</p>
                </Card>
              </div>
            ) : isLoadingDetail ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">加载详情中...</p>
                </div>
              </div>
            ) : isErrorDetail ? (
              <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">加载失败</h2>
                  <p className="text-muted-foreground mb-4">无法加载视频详情，请稍后重试</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['video-detail', currentVideo?.video_id] })}>
                    重试
                  </Button>
                </Card>
              </div>
            ) : !currentDetail ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">加载详情中...</p>
                </div>
              </div>
            ) : pendingEvaluations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">该视频已全部审核完毕</h2>
                  <p className="text-muted-foreground mb-4">正在跳转到下一个视频...</p>
                </Card>
              </div>
            ) : !currentEvaluation ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">加载详情中...</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex">
                {/* 左侧：主要截图展示 */}
                <div className="w-1/2 h-full border-r border-border overflow-y-auto p-6">
                  {/* 主要预览图 - 第三张 */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">关键截图预览</h2>
                    {currentDetail.frame_urls && currentDetail.frame_urls.length > 2 ? (
                      <div 
                        className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all shadow-lg"
                        onClick={() => setSelectedImage(currentDetail.frame_urls[2])}
                      >
                        <img 
                          src={currentDetail.frame_urls[2]} 
                          alt="主要截图"
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          第 3 张
                        </span>
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">暂无截图</p>
                      </div>
                    )}
                  </div>

                  {/* 所有关键帧 - 可展开 */}
                  <Collapsible open={framesExpanded} onOpenChange={setFramesExpanded}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">所有关键帧 ({currentDetail.frame_urls?.length || 0}张)</h3>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {framesExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              收起
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              展开
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {currentDetail.frame_urls?.map((frame, idx) => (
                          <div 
                            key={idx}
                            className="relative group cursor-pointer rounded overflow-hidden border border-border hover:border-primary transition-colors"
                            onClick={() => setSelectedImage(frame)}
                          >
                            <img 
                              src={frame} 
                              alt={`关键帧 ${idx + 1}`}
                              className="w-full aspect-video object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 py-0.5 rounded">
                              {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* 右侧：审核操作区 */}
                <div className="w-1/2 h-full overflow-y-auto p-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* 视频基本信息 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>视频信息</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground">学员ID：</span>
                            <span className="font-mono font-medium">{currentDetail.student_id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">教师姓名：</span>
                            <span className="font-medium">{currentDetail.teacher_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">上课时间：</span>
                            <span>{new Date(currentDetail.class_time).toLocaleString('zh-CN')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">课程时长：</span>
                            <span>{currentDetail.video_duration || 'N/A'}</span>
                          </div>
                        </div>
                        {currentDetail.original_video_url && (
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <a href={currentDetail.original_video_url} target="_blank" rel="noopener noreferrer">
                              <Video className="h-4 w-4 mr-2" />
                              查看课程回放
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* 审核项目 */}
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>审核项目</span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {currentEvaluation.parent_category}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-primary/5 rounded-lg">
                            <h3 className="font-semibold text-lg mb-2">{currentEvaluation.category_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              请根据关键帧截图判断该项目是否合规
                            </p>
                          </div>

                          {/* 审核按钮 */}
                          <div className="flex gap-3">
                            <Button
                              className="flex-1 h-14 text-base gap-2"
                              variant="default"
                              onClick={handlePass}
                              disabled={updateMutation.isPending}
                            >
                              <CheckCircle2 className="h-5 w-5" />
                              合格
                            </Button>
                            <Button
                              className="flex-1 h-14 text-base gap-2"
                              variant="destructive"
                              onClick={handleFail}
                              disabled={updateMutation.isPending}
                            >
                              <XCircle className="h-5 w-5" />
                              不合格
                            </Button>
                          </div>

                          {/* 提示信息 */}
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            提示：请仔细查看所有关键帧后再做判断
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 导航按钮 */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        上一个
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        第 {currentIndex + 1} / {videos.length} 个
                      </span>
                      <Button
                        variant="outline"
                        onClick={handleNext}
                        disabled={currentIndex >= videos.length - 1}
                      >
                        下一个
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* 已审核的评估项 */}
                    {currentDetail.evaluations && currentDetail.evaluations.filter(e => e.is_compliant !== null).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>已审核项目</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {currentDetail.evaluations
                              .filter(e => e.is_compliant !== null)
                              .map((evaluation, idx) => (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-lg",
                                    evaluation.is_compliant 
                                      ? "bg-green-50 border border-green-200" 
                                      : "bg-red-50 border border-red-200"
                                  )}
                                >
                                  <div>
                                    <p className="font-medium text-sm">{evaluation.category_name}</p>
                                    <p className="text-xs text-muted-foreground">{evaluation.parent_category}</p>
                                  </div>
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    evaluation.is_compliant 
                                      ? "bg-green-100 text-green-700" 
                                      : "bg-red-100 text-red-700"
                                  )}>
                                    {evaluation.is_compliant ? '合格' : '不合格'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* 图片放大预览 */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <img 
              src={selectedImage} 
              alt="放大预览"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <XCircle className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default ManualReview;
