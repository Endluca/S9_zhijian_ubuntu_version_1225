import React, { useState, useMemo } from 'react';
import { Bell, Menu, Download, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { videosApi } from '@/api';
import { transformVideoResponse } from '@/utils/transformers';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { ViewToggle } from '@/components/dashboard/ViewToggle';
import { ListView } from '@/components/dashboard/ListView';
import { CardView } from '@/components/dashboard/CardView';
import { Pagination } from '@/components/dashboard/Pagination';
import { RecordDetailModal } from '@/components/dashboard/RecordDetailModal';
import { AppSidebar } from '@/components/AppSidebar';
import { FilterState, ViewMode, QARecord } from '@/types/qa';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getSubCategoryLabel } from '@/data/violationCategories';

const initialFilters: FilterState = {
  courseId: '',
  studentId: '',
  teacherName: '',
  dateRange: [null, null],
  status: 'all',
  violationCategories: [],
  detectionStatus: 'all',
};

const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRecord, setSelectedRecord] = useState<QARecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportMode, setIsExportMode] = useState(false);

  // 前端 detectionStatus 映射到后端 task_status
  const mapDetectionStatusToTaskStatus = (status: string): string | undefined => {
    if (status === 'all') return undefined;
    if (status === 'completed') return 'review_completed'; // 前端的 completed 对应后端的 review_completed
    return status; // uploaded, processing, failed, pending_review 直接返回
  };

  // 前端 status 映射到后端 compliance_status
  const mapStatusToComplianceStatus = (status: string): string | undefined => {
    if (status === 'all') return undefined;
    if (status === 'true') return '有违规';
    if (status === 'false') return '正常';
    if (status === 'pending') return '未质检完成';
    return undefined;
  };

  // 获取视频列表数据
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', currentPage, pageSize, filters],
    queryFn: async () => {
      const response = await videosApi.getVideos({
        student_id: filters.studentId || undefined,
        teacher_name: filters.teacherName || undefined,
        class_time_start: filters.dateRange[0]?.toISOString(),
        class_time_end: filters.dateRange[1]?.toISOString(),
        task_status: mapDetectionStatusToTaskStatus(filters.detectionStatus),
        compliance_status: mapStatusToComplianceStatus(filters.status),
        page: currentPage,
        page_size: pageSize,
      });
      return response.data;
    },
  });

  // 转换后端数据为前端格式
  const records = useMemo(() => {
    return data?.data?.map(transformVideoResponse) || [];
  }, [data]);

  // 前端筛选（违规分类等后端不支持的筛选）
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 违规分类筛选（前端过滤）
      if (filters.violationCategories.length > 0) {
        const recordSubCategories = record.violations.map(v => v.subCategory);
        if (recordSubCategories.length === 0 || !filters.violationCategories.some(fc => recordSubCategories.includes(fc))) {
          return false;
        }
      }
      return true;
    });
  }, [records, filters.violationCategories]);

  const totalRecords = data?.total || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const handleViewDetail = (record: QARecord) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  // 切换选中状态
  const handleToggleSelect = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // 获取检测状态显示文本
  const getDetectionStatusText = (status: QARecord['detectionStatus']): string => {
    switch (status) {
      case 'uploaded':
        return '已上传';
      case 'processing':
        return '处理中';
      case 'pending_review':
        return '待人工质检';
      case 'completed':
        return '质检完成';
      case 'failed':
        return '处理失败';
      default:
        return '未知';
    }
  };

  // 导出表格
  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一条记录');
      return;
    }

    const toastId = toast.loading('正在准备导出数据...');

    try {
      // 获取选中的记录
      const selectedRecords = filteredRecords.filter(r => selectedIds.has(r.id));
      
      toast.loading(`正在获取 ${selectedRecords.length} 条记录的详细信息...`, { id: toastId });
      
      // 获取详细信息（包含分析记录）
      const recordsWithDetails = await Promise.all(
        selectedRecords.map(async (record) => {
          try {
            const detailResponse = await videosApi.getVideoDetail(record.id);
            const detail = detailResponse.data;
            
            // 提取分析记录（只提取预警标签对应的违规项分析记录）
            const analysisComments = detail.evaluations
              ?.filter((e: any) => e.is_compliant === false && e.analysis_comment)
              .map((e: any) => e.analysis_comment)
              .join('；') || '';
            
            return {
              ...record,
              analysisComment: analysisComments,
            };
          } catch (error) {
            // 如果获取详情失败，使用基本信息
            return {
              ...record,
              analysisComment: '',
            };
          }
        })
      );

      // 准备导出数据
      const exportData = recordsWithDetails.map(record => ({
        '视频id': record.id,
        '教师姓名': record.teacherName,
        '学员ID': record.studentId,
        '上课时间': record.classTime,
        '课程时长': record.classDuration,
        '检测状态': getDetectionStatusText(record.detectionStatus),
        '原视频url': record.videoLink,
        '是否违规': record.isViolation ? '是' : '否',
        'AI预警标签': record.violations.length > 0 
          ? record.violations.map(v => getSubCategoryLabel(v.subCategory)).join('、')
          : '无',
        '分析记录': record.analysisComment || '无',
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 20 }, // 视频id
        { wch: 12 }, // 教师姓名
        { wch: 15 }, // 学员ID
        { wch: 20 }, // 上课时间
        { wch: 12 }, // 课程时长
        { wch: 12 }, // 检测状态
        { wch: 40 }, // 原视频url
        { wch: 10 }, // 是否违规
        { wch: 20 }, // AI预警标签
        { wch: 50 }, // 分析记录
      ];
      ws['!cols'] = colWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '质检记录');

      toast.loading('正在生成Excel文件...', { id: toastId });
      
      // 导出文件
      const fileName = `质检记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`已导出 ${selectedIds.size} 条记录`, { id: toastId });
      
      // 重置选中状态和导出模式
      setSelectedIds(new Set());
      setIsExportMode(false);
    } catch (error: any) {
      toast.error(`导出失败: ${error.message}`, { id: toastId });
    }
  };

  // 切换导出模式
  const handleToggleExportMode = () => {
    if (isExportMode) {
      // 确认导出
      handleExport();
    } else {
      // 进入导出模式
      setIsExportMode(true);
      setSelectedIds(new Set());
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">加载失败</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

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
                <h1 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  质检看板
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative hover:bg-secondary">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive-foreground">3</span>
                  </span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {/* Filter Bar */}
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetFilters}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  共 <span className="font-semibold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{totalRecords}</span> 条记录
                </div>
                {isExportMode && selectedIds.size > 0 && (
                  <div className="text-sm text-muted-foreground">
                    已选择 <span className="font-semibold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{selectedIds.size}</span> 条
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={isExportMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleExportMode}
                  disabled={isExportMode && selectedIds.size === 0}
                  className={`
                    btn-hover transition-all duration-300
                    ${isExportMode
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md'
                      : 'hover:bg-secondary'
                    }
                    ${isExportMode && selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {isExportMode ? (
                    <>
                      <Check className="h-4 w-4 mr-2 animate-pulse" />
                      确认导出
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      导出表格
                    </>
                  )}
                </Button>
                {isExportMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsExportMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="hover:bg-secondary transition-colors"
                  >
                    取消
                  </Button>
                )}
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                {/* Data View */}
                {viewMode === 'list' ? (
                  <ListView 
                    records={filteredRecords} 
                    onViewDetail={handleViewDetail}
                    isExportMode={isExportMode}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                  />
                ) : (
                  <CardView 
                    records={filteredRecords} 
                    onViewDetail={handleViewDetail}
                    isExportMode={isExportMode}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                  />
                )}

                {/* Pagination */}
                {totalRecords > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalRecords}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </main>
        </div>

        {/* Modals */}
        <RecordDetailModal
          record={selectedRecord}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
