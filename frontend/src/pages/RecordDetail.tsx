import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  ExternalLink, 
  Video, 
  User, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Download,
  FileText,
  Brain,
  CheckCircle,
  AlertTriangle,
  X,
  ZoomIn,
  Loader2
} from 'lucide-react';
import { videosApi } from '@/api';
import { getSubCategoryLabel } from '@/data/violationCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asrOpen, setAsrOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: videoDetail, isLoading } = useQuery({
    queryKey: ['video-detail', id],
    queryFn: () => videosApi.getVideoDetail(id!).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!videoDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">记录未找到</h1>
          <p className="text-muted-foreground mb-4">ID: {id}</p>
          <Button onClick={() => navigate('/dashboard')}>返回列表</Button>
        </div>
      </div>
    );
  }

  // 从 evaluations 中提取违规项
  const violations = videoDetail.evaluations?.filter(e => e.is_compliant === false) || [];
  const isViolation = videoDetail.compliance_status === '有违规';

  const handleDownloadAsr = () => {
    const blob = new Blob([videoDetail.formatted_text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASR_${videoDetail.video_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="-ml-2" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">原始评情</h1>
                <p className="text-sm text-muted-foreground">{videoDetail.video_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isViolation ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  存在违规
                </span>
              ) : videoDetail.compliance_status === '正常' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  记录正常
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  未质检完成
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-64px)] overflow-hidden">
        <div className="h-full flex">
          {/* 左侧：关键帧图片区 - 固定宽度，可滚动 */}
          <div className="w-1/2 h-full border-r border-border overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">关键帧截图 ({videoDetail.frame_urls?.length || 0}张)</h2>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {videoDetail.frame_urls?.map((frame, idx) => (
                <div 
                  key={idx}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  onClick={() => setSelectedImage(frame)}
                >
                  <img 
                    src={frame} 
                    alt={`关键帧 ${idx + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：其他信息 - 可滚动 */}
          <div className="w-1/2 h-full overflow-y-auto p-6 space-y-6">
            {/* 基本信息区 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>学员ID</span>
                    </div>
                    <p className="font-mono font-medium text-foreground">{videoDetail.student_id}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>教师姓名</span>
                    </div>
                    <p className="font-medium text-foreground">{videoDetail.teacher_name}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>上课时间</span>
                    </div>
                    <p className="font-medium text-foreground">
                      {new Date(videoDetail.class_time).toLocaleString('zh-CN')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>课程时长</span>
                    </div>
                    <p className="font-medium text-foreground">{videoDetail.video_duration || 'N/A'}</p>
                  </div>
                </div>

                {videoDetail.original_video_url && (
                  <div className="mt-4">
                    <Button asChild size="sm">
                      <a href={videoDetail.original_video_url} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-2" />
                        查看课程回放
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 最终质检结果区 */}
            <Card className={cn(
              isViolation && "border-red-300"
            )}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">最终质检结果</CardTitle>
              </CardHeader>
              <CardContent>
                {isViolation && violations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">发现 {violations.length} 项违规</span>
                    </div>
                    <div className="space-y-2">
                      {violations.map((evaluation, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-red-700 text-sm">
                              {evaluation.category_name}
                            </p>
                            <p className="text-xs text-red-600 mt-0.5">
                              类别: {evaluation.parent_category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : videoDetail.compliance_status === '正常' ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 text-sm">质检通过</p>
                      <p className="text-xs text-green-600">本节课程符合教学规范要求</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <AlertTriangle className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700 text-sm">未质检完成</p>
                      <p className="text-xs text-gray-600">质检流程尚未完成</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ASR文本记录区 */}
            {videoDetail.formatted_text && (
              <Card>
                <Collapsible open={asrOpen} onOpenChange={setAsrOpen}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        ASR文本记录
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownloadAsr}>
                          <Download className="h-4 w-4 mr-1" />
                          下载
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {asrOpen ? (
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
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                          {videoDetail.formatted_text}
                        </pre>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* 模型分析理由区 */}
            {videoDetail.llm_thinking && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Model Thinking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                      {videoDetail.llm_thinking}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* 图片放大预览 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={selectedImage} 
            alt="放大预览"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default RecordDetail;
