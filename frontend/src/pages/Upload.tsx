import React, { useState, useCallback } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, Link, User, Clock, X, Check, AlertCircle, Download, Menu, Bell } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { videosApi } from '@/api';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UploadRecord {
  id: string;
  studentId: string;
  teacherName: string;
  classTime: string;
  videoLink: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadTime: string;
  message?: string;
}

const Upload: React.FC = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([]);

  // Excel 日期转换函数
  const parseExcelDate = (value: any): string => {
    // 如果是数字（Excel 日期格式）
    if (typeof value === 'number') {
      // Excel 日期是从 1900/1/1 开始的天数
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (excelDate) {
        const year = excelDate.y;
        const month = String(excelDate.m).padStart(2, '0');
        const day = String(excelDate.d).padStart(2, '0');
        const hour = String(excelDate.H || 0).padStart(2, '0');
        const minute = String(excelDate.M || 0).padStart(2, '0');
        return `${year}/${month}/${day} ${hour}:${minute}`;
      }
    }
    // 如果已经是字符串，直接返回
    return String(value);
  };

  const [singleForm, setSingleForm] = useState({
    studentId: '',
    teacherName: '',
    classTime: '',
    videoLink: '',
  });

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 解析时间格式（支持 YYYY/MM/DD H:mm 或 datetime-local 格式）
      let classTimeISO: string;
      if (singleForm.classTime.includes('T')) {
        // datetime-local 格式
        classTimeISO = new Date(singleForm.classTime).toISOString();
      } else {
        // 自定义格式 2025/12/09 7:00
        classTimeISO = new Date(singleForm.classTime.replace(/\//g, '-')).toISOString();
      }

      const response = await videosApi.uploadVideo({
        student_id: singleForm.studentId,
        teacher_name: singleForm.teacherName,
        class_time: classTimeISO,
        video_url: singleForm.videoLink,
      });

      const newRecord: UploadRecord = {
        id: response.data.video_id,
        studentId: singleForm.studentId,
        teacherName: singleForm.teacherName,
        classTime: singleForm.classTime,
        videoLink: singleForm.videoLink,
        status: 'processing',
        uploadTime: new Date().toLocaleString('zh-CN'),
        message: response.data.message,
      };

      setRecentUploads(prev => [newRecord, ...prev]);
      toast.success(response.data.message || '质检任务已添加到处理队列');
      setSingleForm({ studentId: '', teacherName: '', classTime: '', videoLink: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
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
      toast.error('文件格式错误，请上传 .xlsx、.xls 或 .csv 格式文件');
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

  const handleBatchUpload = async () => {
    if (!uploadedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 读取文件
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      // 使用 xlsx 库解析 Excel/CSV
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 转换为 JSON 格式（第一行作为表头）
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        toast.error('文件内容为空或格式错误');
        setUploading(false);
        return;
      }

      // 解析表头
      const headers = jsonData[0].map((h: any) => String(h || '').trim());
      const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);

      console.log('解析到的表头:', headers);
      console.log('数据行数:', dataRows.length);

      // 灵活匹配字段名（不区分大小写，支持多种变体）
      const findColumnIndex = (possibleNames: string[]) => {
        return headers.findIndex(header => 
          possibleNames.some(name => 
            header.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(header.toLowerCase())
          )
        );
      };

      const studentIdIdx = findColumnIndex(['学员id', '学员ID', 'student_id', 'studentId', '学员']);
      const teacherNameIdx = findColumnIndex(['教师姓名', '教师', 'teacher_name', 'teacherName']);
      const classTimeIdx = findColumnIndex(['上课时间', '课程时间', '时间', 'class_time', 'classTime']);
      const videoLinkIdx = findColumnIndex(['视频链接', '视频url', '链接', 'video_url', 'videoLink', 'url', '视频']);

      console.log('字段索引:', { studentIdIdx, teacherNameIdx, classTimeIdx, videoLinkIdx });

      // 检查必填字段
      const missingFields = [];
      if (studentIdIdx === -1) missingFields.push('学员ID');
      if (teacherNameIdx === -1) missingFields.push('教师姓名');
      if (classTimeIdx === -1) missingFields.push('上课时间');
      if (videoLinkIdx === -1) missingFields.push('视频链接');

      if (missingFields.length > 0) {
        toast.error(`缺少必填列：${missingFields.join('、')}。\n当前表头：${headers.join('、')}`);
        setUploading(false);
        return;
      }

      // 逐条上传
      const results: UploadRecord[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // 跳过空行
        if (!row || row.every((cell: any) => !cell)) continue;

        const studentId = String(row[studentIdIdx] || '').trim();
        const teacherName = String(row[teacherNameIdx] || '').trim();
        const classTimeRaw = row[classTimeIdx];
        const videoLink = String(row[videoLinkIdx] || '').trim();
        
        // 处理 Excel 日期格式
        const classTime = parseExcelDate(classTimeRaw);
        
        console.log(`第 ${i + 2} 行:`, { studentId, teacherName, classTimeRaw, classTime, videoLink });
        
        // 跳过数据不完整的行
        if (!studentId || !teacherName || !classTime || !videoLink) {
          console.warn(`跳过第 ${i + 2} 行：数据不完整`);
          continue;
        }

        try {
          // 转换为 ISO 格式
          let classTimeISO: string;
          try {
            classTimeISO = new Date(classTime.replace(/\//g, '-')).toISOString();
          } catch (e) {
            throw new Error(`时间格式错误: ${classTime}`);
          }

          const response = await videosApi.uploadVideo({
            student_id: studentId,
            teacher_name: teacherName,
            class_time: classTimeISO,
            video_url: videoLink,
          });

          results.push({
            id: response.data.video_id,
            studentId,
            teacherName,
            classTime,
            videoLink,
            status: 'processing',
            uploadTime: new Date().toLocaleString('zh-CN'),
            message: response.data.message,
          });
        } catch (error: any) {
          results.push({
            id: `error-${i}`,
            studentId,
            teacherName,
            classTime,
            videoLink,
            status: 'failed',
            uploadTime: new Date().toLocaleString('zh-CN'),
            message: error.response?.data?.detail || '上传失败',
          });
        }

        // 更新进度
        setUploadProgress(Math.round(((i + 1) / dataRows.length) * 100));
      }

      setRecentUploads(prev => [...results, ...prev]);
      toast.success(`批量上传完成！成功 ${results.filter(r => r.status !== 'failed').length} 条，失败 ${results.filter(r => r.status === 'failed').length} 条`);
      setUploadedFile(null);
    } catch (error: any) {
      toast.error(`文件解析失败: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    // 创建CSV模板内容
    const csvContent = "学员ID,教师姓名,上课时间,视频链接\nSTU-52883,张晓萌,2024/12/09 00:29,https://video.example.com/class-1\nSTU-52884,李老师,2024/12/09 08:00,https://video.example.com/class-2";
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '质检数据模板.csv';
    link.click();
    toast.success('模板文件已下载');
  };

  const getStatusBadge = (status: UploadRecord['status']) => {
    const statusConfig = {
      pending: { label: '待处理', className: 'bg-muted text-muted-foreground' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      failed: { label: '失败', className: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status];
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.className)}>
        {config.label}
      </span>
    );
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
                <div>
                  <h1 className="text-lg font-semibold">数据上传</h1>
                  <p className="text-xs text-muted-foreground">上传视频链接进行质检分析</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* 上传卡片 */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>上传质检任务</CardTitle>
                  <CardDescription>支持单条录入或批量上传 Excel/CSV 文件</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                      <TabsTrigger value="single">单条录入</TabsTrigger>
                      <TabsTrigger value="batch">批量上传</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="mt-6">
                      <form onSubmit={handleSingleSubmit} className="grid gap-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="teacherName"
                                placeholder="输入教师姓名"
                                value={singleForm.teacherName}
                                onChange={(e) => setSingleForm({ ...singleForm, teacherName: e.target.value })}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>

                        <Button type="submit" className="w-fit" disabled={uploading}>
                          {uploading ? '提交中...' : '提交质检任务'}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="batch" className="mt-6">
                      <div className="grid gap-6 max-w-2xl">
                        {/* 拖拽上传区域 */}
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                            uploadedFile && "border-green-500 bg-green-50"
                          )}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('fileInput')?.click()}
                        >
                          {uploadedFile ? (
                            <div className="space-y-3">
                              <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-7 w-7 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{uploadedFile.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(uploadedFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedFile(null);
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                移除文件
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                              </div>
                              <p className="font-medium mb-1 text-foreground">拖拽文件到这里，或点击选择</p>
                              <p className="text-sm text-muted-foreground mb-4">
                                支持 .xlsx, .xls, .csv 格式
                              </p>
                              <input
                                id="fileInput"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                              <Button variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
                                <UploadIcon className="h-4 w-4 mr-2" />
                                选择文件
                              </Button>
                            </>
                          )}
                        </div>

                        {/* 模板说明 */}
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">模板要求</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              文件第一行必须为字段名，包含以下列：<span className="font-medium text-foreground">学员ID</span>、<span className="font-medium text-foreground">教师姓名</span>、<span className="font-medium text-foreground">上课时间</span>、<span className="font-medium text-foreground">视频链接</span>
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              提示：字段顺序可任意，支持多种字段名（如"学员id"、"student_id"均可）
                            </p>
                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                              <Download className="h-4 w-4 mr-2" />
                              下载模板
                            </Button>
                          </div>
                        </div>

                        {/* 上传进度 */}
                        {uploading && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground">正在上传...</span>
                              <span className="text-primary font-medium">{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                          </div>
                        )}

                        <Button
                          className="w-fit"
                          disabled={!uploadedFile || uploading}
                          onClick={handleBatchUpload}
                        >
                          {uploading ? '上传中...' : '开始上传'}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* 最近上传记录 */}
              {recentUploads.length > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>最近上传记录</CardTitle>
                    <CardDescription>本次会话中上传的质检任务</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>学员 ID</TableHead>
                          <TableHead>教师姓名</TableHead>
                          <TableHead>上课时间</TableHead>
                          <TableHead>视频链接</TableHead>
                          <TableHead>上传时间</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentUploads.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono font-medium">{record.studentId}</TableCell>
                            <TableCell>{record.teacherName}</TableCell>
                            <TableCell className="font-mono text-sm">{record.classTime}</TableCell>
                            <TableCell>
                              <a 
                                href={record.videoLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate block max-w-[200px]"
                                title={record.videoLink}
                              >
                                {record.videoLink}
                              </a>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{record.uploadTime}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(record.status)}
                                {record.status === 'failed' && record.message && (
                                  <p className="text-xs text-red-600" title={record.message}>
                                    {record.message.length > 30 ? record.message.substring(0, 30) + '...' : record.message}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Upload;
