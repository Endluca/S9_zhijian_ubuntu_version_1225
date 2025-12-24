import React, { useState, useMemo } from 'react';
import { Bell, Menu } from 'lucide-react';
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
          <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
            <div className="px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <h1 className="text-lg font-semibold">质检看板</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
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
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                共 <span className="font-medium text-foreground">{totalRecords}</span> 条记录
              </div>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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
                  <ListView records={filteredRecords} onViewDetail={handleViewDetail} />
                ) : (
                  <CardView records={filteredRecords} onViewDetail={handleViewDetail} />
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
