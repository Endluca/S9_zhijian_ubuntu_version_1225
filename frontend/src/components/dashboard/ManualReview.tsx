import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Keyboard, Eye, LayoutGrid, List, ZoomIn, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { QARecord } from '@/types/qa';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

type ReviewStatus = 'pending' | 'pass' | 'fail';

interface ReviewRecord extends QARecord {
  reviewStatus: ReviewStatus;
}

interface ManualReviewProps {
  records: QARecord[];
}

export const ManualReview: React.FC<ManualReviewProps> = ({ records }) => {
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'kanban'>('card');
  const [reviewRecords, setReviewRecords] = useState<ReviewRecord[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');

  // 初始化审核记录
  useEffect(() => {
    setReviewRecords(
      records.map((r) => ({
        ...r,
        reviewStatus: 'pending' as ReviewStatus,
      }))
    );
  }, [records]);

  // 筛选后的记录
  const filteredRecords = statusFilter === 'all' 
    ? reviewRecords 
    : reviewRecords.filter(r => r.reviewStatus === statusFilter);

  // 当前在筛选列表中的索引
  const [filteredIndex, setFilteredIndex] = useState(0);

  // 当前记录（基于筛选后的列表）
  const currentRecord = filteredRecords[filteredIndex];
  
  // 当筛选条件变化时，重置到第一条
  useEffect(() => {
    setFilteredIndex(0);
  }, [statusFilter]);
  
  // 统计
  const stats = {
    total: reviewRecords.length,
    pending: reviewRecords.filter((r) => r.reviewStatus === 'pending').length,
    pass: reviewRecords.filter((r) => r.reviewStatus === 'pass').length,
    fail: reviewRecords.filter((r) => r.reviewStatus === 'fail').length,
  };

  // 获取原始索引
  const getOriginalIndex = (record: ReviewRecord) => {
    return reviewRecords.findIndex(r => r.id === record.id);
  };

  // 跳转到下一条未检测
  const goToNextPending = useCallback(() => {
    // 在筛选列表中找下一条待审
    const nextIdx = filteredRecords.findIndex(
      (r, idx) => idx > filteredIndex && r.reviewStatus === 'pending'
    );
    if (nextIdx !== -1) {
      setFilteredIndex(nextIdx);
    } else {
      // 从头找
      const firstPending = filteredRecords.findIndex((r) => r.reviewStatus === 'pending');
      if (firstPending !== -1 && firstPending !== filteredIndex) {
        setFilteredIndex(firstPending);
      } else if (stats.pending === 0) {
        toast({
          title: "全部完成！",
          description: "所有记录都已审核完毕",
        });
      }
    }
  }, [filteredRecords, filteredIndex, stats.pending]);

  // 标记为合格
  const markAsPass = useCallback(() => {
    if (!currentRecord) return;
    
    setReviewRecords((prev) =>
      prev.map((r) => (r.id === currentRecord.id ? { ...r, reviewStatus: 'pass' } : r))
    );
    
    toast({
      title: "已标记为合格",
      description: `${currentRecord.teacherName} - ${currentRecord.studentId}`,
    });
    
    if (currentRecord.reviewStatus === 'pending') {
      setTimeout(goToNextPending, 300);
    }
  }, [currentRecord, goToNextPending]);

  // 标记为不合格
  const markAsFail = useCallback(() => {
    if (!currentRecord) return;
    
    setReviewRecords((prev) =>
      prev.map((r) => (r.id === currentRecord.id ? { ...r, reviewStatus: 'fail' } : r))
    );
    
    toast({
      title: "已标记为不合格",
      description: `${currentRecord.teacherName} - ${currentRecord.studentId}`,
      variant: "destructive",
    });
    
    if (currentRecord.reviewStatus === 'pending') {
      setTimeout(goToNextPending, 300);
    }
  }, [currentRecord, goToNextPending]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Enter' || e.key === '1' || e.key === 'ArrowRight') {
        e.preventDefault();
        markAsPass();
      } else if (e.key === ' ' || e.key === '2' || e.key === 'ArrowLeft') {
        e.preventDefault();
        markAsFail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markAsPass, markAsFail]);

  // 导航 - 基于筛选后的列表
  const goToPrev = () => {
    if (filteredIndex > 0) setFilteredIndex(filteredIndex - 1);
  };

  const goToNext = () => {
    if (filteredIndex < filteredRecords.length - 1) setFilteredIndex(filteredIndex + 1);
  };

  if (reviewRecords.length === 0 || !currentRecord) {
    return (
      <div className="bg-card rounded-xl shadow-card p-8 text-center">
        <p className="text-muted-foreground">暂无待审核数据</p>
      </div>
    );
  }

  // 如果筛选后没有记录
  if (filteredRecords.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
        {/* Header 保持不变，需要显示筛选按钮 */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">人工审核</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm">
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                    statusFilter === 'all' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  onClick={() => setStatusFilter('all')}
                >
                  <span>全部 {stats.total}</span>
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                    statusFilter === 'pending' ? "bg-muted-foreground text-background" : "hover:bg-muted"
                  )}
                  onClick={() => setStatusFilter('pending')}
                >
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span>待审 {stats.pending}</span>
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                    statusFilter === 'pass' ? "bg-success text-success-foreground" : "hover:bg-muted"
                  )}
                  onClick={() => setStatusFilter('pass')}
                >
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span>合格 {stats.pass}</span>
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                    statusFilter === 'fail' ? "bg-destructive text-destructive-foreground" : "hover:bg-muted"
                  )}
                  onClick={() => setStatusFilter('fail')}
                >
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <span>不合格 {stats.fail}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">
            暂无{statusFilter === 'pending' ? '待审' : statusFilter === 'pass' ? '合格' : '不合格'}记录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">人工审核</h2>
            <Badge variant="secondary" className="font-mono">
              {filteredIndex + 1} / {filteredRecords.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 统计 - 可点击筛选 */}
            <div className="flex items-center gap-1 text-sm">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                  statusFilter === 'all' 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => setStatusFilter('all')}
              >
                <span>全部 {stats.total}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                  statusFilter === 'pending' 
                    ? "bg-muted-foreground text-background" 
                    : "hover:bg-muted"
                )}
                onClick={() => setStatusFilter('pending')}
              >
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span>待审 {stats.pending}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                  statusFilter === 'pass' 
                    ? "bg-success text-success-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => setStatusFilter('pass')}
              >
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>合格 {stats.pass}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors",
                  statusFilter === 'fail' 
                    ? "bg-destructive text-destructive-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => setStatusFilter('fail')}
              >
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <span>不合格 {stats.fail}</span>
              </button>
            </div>
            
            {/* 视图切换 */}
            <div className="flex items-center bg-secondary rounded-lg p-1">
              <button
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === 'card' ? "bg-background shadow-sm" : "hover:bg-background/50"
                )}
                onClick={() => setViewMode('card')}
                title="卡片视图"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            
            {/* 快捷键提示 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="gap-1"
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">快捷键</span>
            </Button>
          </div>
        </div>
        
        {/* 快捷键说明 */}
        {showShortcuts && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">Enter</kbd>
                <span>或</span>
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">1</kbd>
                <span>或</span>
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">→</kbd>
                <span className="text-muted-foreground">合格</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">Space</kbd>
                <span>或</span>
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">2</kbd>
                <span>或</span>
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">←</kbd>
                <span className="text-muted-foreground">不合格</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'card' ? (
          /* 卡片视图 - 大图模式 */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 大图区域 */}
            <div className="flex-1 min-h-[600px]">
              <div 
                className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary cursor-pointer group"
                onClick={() => setShowFullImage(true)}
              >
                <img
                  src={currentRecord.screenshot}
                  alt="课堂截图"
                  className="w-full h-full object-contain"
                />
                
                {/* 放大提示 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-3">
                    <ZoomIn className="h-6 w-6" />
                  </div>
                </div>
                
                {/* 状态标签 */}
                <div className="absolute top-4 left-4">
                  <Badge
                    className={cn(
                      "text-sm font-medium px-3 py-1",
                      currentRecord.reviewStatus === 'pending' && "bg-muted text-muted-foreground",
                      currentRecord.reviewStatus === 'pass' && "bg-success text-success-foreground",
                      currentRecord.reviewStatus === 'fail' && "bg-destructive text-destructive-foreground"
                    )}
                  >
                    {currentRecord.reviewStatus === 'pending' && '未检测'}
                    {currentRecord.reviewStatus === 'pass' && '合格'}
                    {currentRecord.reviewStatus === 'fail' && '不合格'}
                  </Badge>
                </div>
                
                {/* 导航按钮 */}
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                  disabled={filteredIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  disabled={filteredIndex === filteredRecords.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              
              {/* 课程信息 */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{currentRecord.teacherName}</h3>
                  <p className="text-muted-foreground font-mono">{currentRecord.studentId}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{currentRecord.classTime}</p>
                  <p>{currentRecord.classDuration}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={currentRecord.videoLink} target="_blank" rel="noopener noreferrer">
                    视频链接
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to={`/record/${currentRecord.id}`}>
                    视频详情页
                  </Link>
                </Button>
              </div>
            </div>

            {/* 操作区 */}
            <div className="lg:w-72 flex flex-col gap-4">
              <div className="bg-secondary/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">快速操作</h4>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className={cn(
                      "w-full justify-start gap-3 h-14 text-left",
                      "border-2 hover:border-success hover:bg-success/10",
                      currentRecord.reviewStatus === 'pass' && "border-success bg-success/10"
                    )}
                    onClick={markAsPass}
                  >
                    <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="font-medium">合格</div>
                      <div className="text-xs text-muted-foreground">Enter / 1 / →</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className={cn(
                      "w-full justify-start gap-3 h-14 text-left",
                      "border-2 hover:border-destructive hover:bg-destructive/10",
                      currentRecord.reviewStatus === 'fail' && "border-destructive bg-destructive/10"
                    )}
                    onClick={markAsFail}
                  >
                    <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                      <X className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <div className="font-medium">不合格</div>
                      <div className="text-xs text-muted-foreground">Space / 2 / ←</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* 列表视图 - 根据筛选状态显示 */
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredRecords.map((record, idx) => (
              <div
                key={record.id}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors",
                  idx === filteredIndex ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary/50 hover:bg-secondary"
                )}
                onClick={() => setFilteredIndex(idx)}
              >
                <img
                  src={record.screenshot}
                  alt="课堂截图"
                  className="w-20 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{record.teacherName}</p>
                  <p className="text-sm text-muted-foreground font-mono">{record.studentId}</p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0",
                    record.reviewStatus === 'pending' && "bg-muted text-muted-foreground",
                    record.reviewStatus === 'pass' && "bg-success text-success-foreground",
                    record.reviewStatus === 'fail' && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {record.reviewStatus === 'pending' && '未检测'}
                  {record.reviewStatus === 'pass' && '合格'}
                  {record.reviewStatus === 'fail' && '不合格'}
                </Badge>
                {idx === filteredIndex && record.reviewStatus === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); markAsPass(); }}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); markAsFail(); }}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 看板视图 - 三列布局：待审/合格/不合格 */
          <div className="grid grid-cols-3 gap-4">
            {/* 待审列 */}
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-muted-foreground" />
                <h3 className="font-semibold">待审</h3>
                <Badge variant="secondary" className="ml-auto">{stats.pending}</Badge>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reviewRecords.filter(r => r.reviewStatus === 'pending').map((record) => {
                  const idx = filteredRecords.findIndex(r => r.id === record.id);
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "bg-card rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                        idx === filteredIndex && statusFilter === 'all' && "ring-2 ring-primary"
                      )}
                      onClick={() => {
                        setStatusFilter('all');
                        const allIdx = reviewRecords.findIndex(r => r.id === record.id);
                        setFilteredIndex(allIdx);
                      }}
                    >
                      <img
                        src={record.screenshot}
                        alt="课堂截图"
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                      <p className="font-medium text-sm truncate">{record.teacherName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{record.courseId}</p>
                    </div>
                  );
                })}
                {stats.pending === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">暂无待审</p>
                )}
              </div>
            </div>

            {/* 合格列 */}
            <div className="bg-success/5 rounded-xl p-4 border border-success/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-success" />
                <h3 className="font-semibold text-success">合格</h3>
                <Badge className="ml-auto bg-success/20 text-success">{stats.pass}</Badge>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reviewRecords.filter(r => r.reviewStatus === 'pass').map((record) => (
                  <div
                    key={record.id}
                    className="bg-card rounded-lg p-3 cursor-pointer transition-all hover:shadow-md border-l-4 border-success"
                  >
                    <img
                      src={record.screenshot}
                      alt="课堂截图"
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                    <p className="font-medium text-sm truncate">{record.teacherName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{record.courseId}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-xs text-success">已通过</span>
                    </div>
                  </div>
                ))}
                {stats.pass === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">暂无合格</p>
                )}
              </div>
            </div>

            {/* 不合格列 */}
            <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-destructive" />
                <h3 className="font-semibold text-destructive">不合格</h3>
                <Badge className="ml-auto bg-destructive/20 text-destructive">{stats.fail}</Badge>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reviewRecords.filter(r => r.reviewStatus === 'fail').map((record) => (
                  <div
                    key={record.id}
                    className="bg-card rounded-lg p-3 cursor-pointer transition-all hover:shadow-md border-l-4 border-destructive"
                  >
                    <img
                      src={record.screenshot}
                      alt="课堂截图"
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                    <p className="font-medium text-sm truncate">{record.teacherName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{record.courseId}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <X className="h-3 w-3 text-destructive" />
                      <span className="text-xs text-destructive">未通过</span>
                    </div>
                  </div>
                ))}
                {stats.fail === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">暂无不合格</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 全屏图片预览模态框 */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-md">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            <img
              src={currentRecord?.screenshot}
              alt="课堂截图"
              className="max-w-full max-h-full object-contain"
            />
            
            {/* 导航按钮 */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
              onClick={goToPrev}
              disabled={filteredIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
              onClick={goToNext}
              disabled={filteredIndex === filteredRecords.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* 底部信息栏 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-4">
              <span className="font-medium">{currentRecord?.teacherName}</span>
              <span className="text-muted-foreground font-mono">{currentRecord?.studentId}</span>
              <Badge variant="secondary">{filteredIndex + 1} / {filteredRecords.length}</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
