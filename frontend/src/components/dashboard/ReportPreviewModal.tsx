import React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  videoId: string;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  open,
  onOpenChange,
  imageUrl,
  videoId,
}) => {
  const handleDownload = () => {
    if (!imageUrl) return;
    
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `教学质量反馈报告_${videoId}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>报告预览</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                下载报告
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-auto p-6">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="教学质量反馈报告"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

