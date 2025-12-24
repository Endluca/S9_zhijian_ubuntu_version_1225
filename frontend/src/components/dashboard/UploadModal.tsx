import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Link, User, Clock, X, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('single');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [singleForm, setSingleForm] = useState({
    studentId: '',
    teacherName: '',
    classTime: '',
    videoLink: '',
  });

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    // Simulate processing
    setTimeout(() => {
      setUploading(false);
      toast({
        title: "提交成功",
        description: "质检任务已添加到处理队列",
      });
      onOpenChange(false);
      setSingleForm({ studentId: '', teacherName: '', classTime: '', videoLink: '' });
    }, 1500);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "文件格式错误",
        description: "请上传 .xlsx、.xls 或 .csv 格式文件",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
      }
    }
  };

  const handleBatchUpload = () => {
    if (!uploadedFile) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast({
            title: "上传成功",
            description: `已成功解析 ${uploadedFile.name}`,
          });
          onOpenChange(false);
          setUploadedFile(null);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl">上传质检任务</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">单条录入</TabsTrigger>
            <TabsTrigger value="batch">批量上传</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">学员 ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="studentId"
                    placeholder="输入学员 ID"
                    value={singleForm.studentId}
                    onChange={(e) => setSingleForm({ ...singleForm, studentId: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherName">教师姓名</Label>
                <Input
                  id="teacherName"
                  placeholder="输入教师姓名"
                  value={singleForm.teacherName}
                  onChange={(e) => setSingleForm({ ...singleForm, teacherName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classTime">上课时间</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="classTime"
                    type="datetime-local"
                    value={singleForm.classTime}
                    onChange={(e) => setSingleForm({ ...singleForm, classTime: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoLink">视频链接</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="videoLink"
                    type="url"
                    placeholder="https://..."
                    value={singleForm.videoLink}
                    onChange={(e) => setSingleForm({ ...singleForm, videoLink: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="brand" className="w-full" disabled={uploading}>
                {uploading ? '处理中...' : '提交'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="batch" className="mt-4 space-y-4">
            {/* Drag & Drop Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                dragActive ? "border-primary bg-primary/5" : "border-border",
                uploadedFile && "border-success bg-success/5"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    移除
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">拖拽文件到这里</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    支持 .xlsx, .xls, .csv 格式
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button variant="outline" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        选择文件
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            {/* Template Info */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-light">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">模板要求</p>
                <p className="text-muted-foreground">
                  必须包含以下列：学员id、教师姓名、课程时间、视频链接
                </p>
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>上传中...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Button
              variant="brand"
              className="w-full"
              disabled={!uploadedFile || uploading}
              onClick={handleBatchUpload}
            >
              {uploading ? '处理中...' : '开始上传'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
