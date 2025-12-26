import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Eye, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { QARecord } from '@/types/qa';
import { StatusBadge } from '@/components/StatusBadge';
import { getSubCategoryLabel } from '@/data/violationCategories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CardViewProps {
  records: QARecord[];
  onViewDetail: (record: QARecord) => void;
  isExportMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const CardView: React.FC<CardViewProps> = ({ 
  records, 
  onViewDetail,
  isExportMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const navigate = useNavigate();
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
  const [reportVideoId, setReportVideoId] = useState<string>('');

  const handleGenerateReport = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast.info('正在生成报告...');
      const { videosApi } = await import('@/api');
      const response = await videosApi.generateReport(videoId);
      
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-fade-in">
      {records.map((record, index) => (
        <div
          key={record.id}
          className={cn(
            "bg-card rounded-xl shadow-card overflow-hidden",
            "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1",
            "group relative",
            isExportMode && selectedIds.has(record.id) && "ring-2 ring-primary",
            !isExportMode && "cursor-pointer"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => !isExportMode && onViewDetail(record)}
        >
          {isExportMode && (
            <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(record.id)}
                onCheckedChange={() => onToggleSelect?.(record.id)}
              />
            </div>
          )}
          {/* Image Section - 60% */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={record.screenshot}
              alt="课堂截图"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Violation Overlay */}
            {record.isViolation && record.violations.length > 0 && (
              <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[90%]">
                {record.violations.map((v, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-500 text-white shadow-lg"
                  >
                    {getSubCategoryLabel(v.subCategory)}
                  </span>
                ))}
              </div>
            )}
            
            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-foreground/80 text-background">
                <Clock className="h-3 w-3 mr-1" />
                {record.classDuration}
              </span>
            </div>
          </div>
          
          {/* Info Section - 40% */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground truncate flex-1">
                {record.teacherName}
              </h3>
              <StatusBadge isViolation={record.isViolation} complianceStatus={record.complianceStatus} size="sm" />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono">{record.studentId}</span>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {record.classTime}
            </p>
            
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 px-2 text-xs"
                onClick={(e) => handleGenerateReport(record.id, e)}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                生成报告
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/record/${record.id}`);
                }}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                查看详情
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {records.length === 0 && (
        <div className="col-span-full py-20 text-center text-muted-foreground">
          <p>暂无数据</p>
        </div>
      )}

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
  );
};
