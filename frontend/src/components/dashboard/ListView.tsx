import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Copy, Check, FileText, Download } from 'lucide-react';
import { QARecord } from '@/types/qa';
import { getSubCategoryLabel } from '@/data/violationCategories';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ListViewProps {
  records: QARecord[];
  onViewDetail: (record: QARecord) => void;
  isExportMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
}

export const ListView: React.FC<ListViewProps> = ({ 
  records, 
  onViewDetail,
  isExportMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
}) => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
  const [reportVideoId, setReportVideoId] = useState<string>('');

  const handleCopyTeacherName = (name: string) => {
    navigator.clipboard.writeText(name);
    toast.success('教师姓名已复制');
  };

  const handleCopyVideoLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('视频链接已复制');
  };

  const handleGenerateReport = async (videoId: string) => {
    try {
      toast.info('正在生成报告...');
      const { videosApi } = await import('@/api');
      const response = await videosApi.generateReport(videoId);
      
      // 创建预览 URL
      const blob = response.data as Blob;
      const url = URL.createObjectURL(blob);
      
      // 打开预览弹窗
      setReportPreviewUrl(url);
      setReportVideoId(videoId);
      toast.success('报告已生成');
    } catch (error: any) {
      toast.error(`生成报告失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleCloseReportPreview = () => {
    if (reportPreviewUrl) {
      URL.revokeObjectURL(reportPreviewUrl);
    }
    setReportPreviewUrl(null);
    setReportVideoId('');
  };

  const handleCopyCourseId = (courseId: string, recordId: string) => {
    navigator.clipboard.writeText(courseId);
    setCopiedId(recordId);
    toast.success('课程ID已复制');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCoverStatusDisplay = (status: QARecord['coverStatus']) => {
    switch (status) {
      case 'pending':
        return {
          overlay: 'bg-muted/80',
          text: '待审',
          border: 'border-muted-foreground/30',
        };
      case 'fail':
        return {
          overlay: '',
          text: '封面违规',
          border: 'ring-2 ring-destructive ring-offset-2',
        };
      case 'pass':
        return {
          overlay: '',
          text: '',
          border: '',
        };
    }
  };

  const getDetectionStatusDisplay = (status: QARecord['detectionStatus']) => {
    switch (status) {
      case 'uploaded':
        return { label: '已上传', className: 'bg-muted text-muted-foreground' };
      case 'processing':
        return { label: '处理中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'pending_review':
        return { label: '待人工质检', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
      case 'completed':
        return { label: '质检完成', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'failed':
        return { label: '处理失败', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {isExportMode && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={records.length > 0 && selectedIds.size === records.length}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[120px]">封面预览</TableHead>
              <TableHead className="w-[220px]">课程信息</TableHead>
              <TableHead className="w-[120px]">检测状态</TableHead>
              <TableHead>AI 预警标签</TableHead>
              <TableHead className="w-[140px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, index) => {
              const coverStatus = getCoverStatusDisplay(record.coverStatus);
              const detectionStatus = getDetectionStatusDisplay(record.detectionStatus);
              
              return (
                <TableRow 
                  key={record.id}
                  className={cn(
                    "group hover:bg-muted/20 transition-colors",
                    isExportMode && selectedIds.has(record.id) && "bg-primary/5"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {isExportMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => onToggleSelect?.(record.id)}
                      />
                    </TableCell>
                  )}
                  {/* 封面预览 - 80x45px 圆角矩形 */}
                  <TableCell>
                    {record.detectionStatus === 'uploaded' || record.detectionStatus === 'processing' || record.detectionStatus === 'failed' ? (
                      // 已上传/处理中/失败状态：无封面，显示占位
                      <div className="w-20 h-[45px] rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {record.detectionStatus === 'uploaded' ? '待处理' : record.detectionStatus === 'failed' ? '失败' : '处理中'}
                        </span>
                      </div>
                    ) : (
                      // 待人工质检/质检完成：显示封面
                      <div
                        className={cn(
                          "relative w-20 h-[45px] rounded-lg overflow-hidden cursor-pointer transition-all",
                          "hover:shadow-md hover:scale-105 bg-muted",
                          coverStatus.border
                        )}
                        onClick={() => setPreviewImage(record.screenshot)}
                      >
                        <img
                          src={record.screenshot}
                          alt="封面预览"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* 待审状态遮罩 */}
                        {record.coverStatus === 'pending' && (
                          <div className="absolute inset-0 bg-muted/80 flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">待审</span>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* 课程信息 */}
                  <TableCell>
                    <div className="space-y-1">
                      {/* 课程ID - Mono字体, 灰色 */}
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm text-muted-foreground">{record.courseId}</span>
                        <button
                          onClick={() => handleCopyCourseId(record.courseId, record.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                        >
                          {copiedId === record.id ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      {/* 教师姓名和学员ID区域 - 用竖线分隔 */}
                      <div className="flex items-center gap-2">
                        {/* 教师姓名 - 加粗, 黑色, 可复制 */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p 
                              className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleCopyTeacherName(record.teacherName)}
                            >
                              {record.teacherName}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>点击复制教师姓名</p>
                          </TooltipContent>
                        </Tooltip>
                        {/* 分隔线 */}
                        <div className="h-4 w-px bg-border"></div>
                        {/* 学员ID */}
                        <span className="font-mono text-sm text-muted-foreground">{record.studentId}</span>
                      </div>
                      {/* 时间 - Mono字体 */}
                      <p className="font-mono text-sm text-muted-foreground">{record.classTime}</p>
                    </div>
                  </TableCell>

                  {/* 检测状态 */}
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                      detectionStatus.className
                    )}>
                      {detectionStatus.label}
                    </span>
                  </TableCell>

                  {/* AI 预警标签 - 核心列 */}
                  <TableCell>
                    {record.detectionStatus === 'uploaded' || record.detectionStatus === 'processing' || record.detectionStatus === 'failed' ? (
                      <span className="text-muted-foreground text-sm">—</span>
                    ) : record.isViolation && record.violations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {record.violations.map((v, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"
                          >
                            {getSubCategoryLabel(v.subCategory)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* 操作 */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* 生成报告按钮 */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleGenerateReport(record.id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            生成报告
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>生成教学质量反馈报告</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* 详情按钮 - Primary */}
                      <Button
                        variant="link"
                        size="sm"
                        className="text-primary font-medium"
                        onClick={() => navigate(`/record/${record.id}`)}
                      >
                        详情
                      </Button>
                      
                      {/* 复制视频链接 */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyVideoLink(record.videoLink)}
                          >
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>复制视频链接</p>
                        </TooltipContent>
                      </Tooltip>

                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {records.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p>暂无数据</p>
          </div>
        )}

        {/* 大图预览弹窗 */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl p-2">
            {previewImage && (
              <img
                src={previewImage}
                alt="封面大图"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 报告预览弹窗 */}
        <Dialog open={!!reportPreviewUrl} onOpenChange={(open) => !open && handleCloseReportPreview()}>
          <DialogContent className="max-w-[900px] w-[90vw] max-h-[95vh] p-0 flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold">报告预览</h2>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  if (reportPreviewUrl) {
                    const a = document.createElement('a');
                    a.href = reportPreviewUrl;
                    a.download = `教学质量反馈报告_${reportVideoId}.png`;
                    a.click();
                    toast.success('报告已下载');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                下载报告
              </Button>
            </div>
            <div className="overflow-auto flex-1 bg-gray-50 p-6 flex items-start justify-center">
              {reportPreviewUrl && (
                <img 
                  src={reportPreviewUrl} 
                  alt="教学质量反馈报告"
                  className="max-w-full h-auto rounded-lg shadow-2xl"
                  style={{ maxHeight: 'calc(95vh - 120px)' }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
