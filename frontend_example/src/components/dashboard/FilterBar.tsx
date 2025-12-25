import React, { useState } from 'react';
import { Search, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { violationCategories } from '@/data/violationCategories';
import { FilterState } from '@/types/qa';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  onSearch?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onReset, onSearch }) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [violationExpanded, setViolationExpanded] = useState(false);

  const handleCategoryToggle = (categoryId: string, isParent: boolean = false) => {
    let newCategories = [...filters.violationCategories];

    if (isParent) {
      const category = violationCategories.find(c => c.id === categoryId);
      if (!category) return;

      const childIds = category.children.map(c => c.id);
      const allChildrenSelected = childIds.every(id => newCategories.includes(id));

      if (allChildrenSelected) {
        newCategories = newCategories.filter(id => !childIds.includes(id));
      } else {
        childIds.forEach(id => {
          if (!newCategories.includes(id)) {
            newCategories.push(id);
          }
        });
      }
    } else {
      if (newCategories.includes(categoryId)) {
        newCategories = newCategories.filter(id => id !== categoryId);
      } else {
        newCategories.push(categoryId);
      }
    }

    onFilterChange({ ...filters, violationCategories: newCategories });
  };

  const getParentCheckState = (categoryId: string): 'checked' | 'unchecked' | 'indeterminate' => {
    const category = violationCategories.find(c => c.id === categoryId);
    if (!category) return 'unchecked';

    const childIds = category.children.map(c => c.id);
    const selectedCount = childIds.filter(id => filters.violationCategories.includes(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === childIds.length) return 'checked';
    return 'indeterminate';
  };

  const activeFilterCount = [
    filters.studentId,
    filters.teacherName,
    filters.dateRange[0] || filters.dateRange[1],
    filters.status !== 'all',
    filters.detectionStatus !== 'all',
    filters.violationCategories.length > 0,
  ].filter(Boolean).length;

  // 清除单个筛选项
  const clearDateRange = () => onFilterChange({ ...filters, dateRange: [null, null] });
  const clearTeacherName = () => onFilterChange({ ...filters, teacherName: '' });
  const clearStudentId = () => onFilterChange({ ...filters, studentId: '' });
  const clearDetectionStatus = () => onFilterChange({ ...filters, detectionStatus: 'all' });
  const clearStatus = () => onFilterChange({ ...filters, status: 'all' });
  const clearViolationCategories = () => onFilterChange({ ...filters, violationCategories: [] });

  return (
    <div className="bg-card rounded-xl shadow-card p-4 mb-6 animate-fade-in">
      {/* 第一行：基础筛选 */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {/* 时间范围 */}
        <div className="relative">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start h-10 pr-8">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {filters.dateRange[0] && filters.dateRange[1] ? (
                  <span>
                    {format(filters.dateRange[0], 'MM/dd')} - {format(filters.dateRange[1], 'MM/dd')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">时间范围</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{
                  from: filters.dateRange[0] || undefined,
                  to: filters.dateRange[1] || undefined,
                }}
                onSelect={(range) => {
                  onFilterChange({
                    ...filters,
                    dateRange: [range?.from || null, range?.to || null],
                  });
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {(filters.dateRange[0] || filters.dateRange[1]) && (
            <button
              onClick={clearDateRange}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 教师姓名 */}
        <div className="relative min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="教师姓名"
            value={filters.teacherName}
            onChange={(e) => onFilterChange({ ...filters, teacherName: e.target.value })}
            className="pl-9 pr-8 h-10"
          />
          {filters.teacherName && (
            <button
              onClick={clearTeacherName}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 学员ID */}
        <div className="relative min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="学员ID"
            value={filters.studentId}
            onChange={(e) => onFilterChange({ ...filters, studentId: e.target.value })}
            className="pl-9 pr-8 h-10"
          />
          {filters.studentId && (
            <button
              onClick={clearStudentId}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 第二行：业务标签筛选 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 检测状态 */}
        <div className="relative">
          <Select
            value={filters.detectionStatus}
            onValueChange={(value: 'all' | 'uploaded' | 'processing' | 'pending_review' | 'completed') =>
              onFilterChange({ ...filters, detectionStatus: value })
            }
          >
            <SelectTrigger className={cn("w-[150px] h-10", filters.detectionStatus !== 'all' && "pr-8")}>
              <SelectValue placeholder="检测状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">视频检测状态</SelectItem>
              <SelectItem value="uploaded">已上传</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="processing_failed">处理失败</SelectItem>
              <SelectItem value="pending_review">待人工质检</SelectItem>
              <SelectItem value="completed">质检完成</SelectItem>
            </SelectContent>
          </Select>
          {filters.detectionStatus !== 'all' && (
            <button
              onClick={clearDetectionStatus}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted z-10"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 是否违规 */}
        <div className="relative">
          <Select
            value={filters.status}
            onValueChange={(value: 'all' | 'true' | 'false') =>
              onFilterChange({ ...filters, status: value })
            }
          >
            <SelectTrigger className={cn("w-[130px] h-10", filters.status !== 'all' && "pr-8")}>
              <SelectValue placeholder="是否违规" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="true">违规</SelectItem>
              <SelectItem value="false">正常</SelectItem>
            </SelectContent>
          </Select>
          {filters.status !== 'all' && (
            <button
              onClick={clearStatus}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted z-10"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 违规分类筛选 - 下拉展开 */}
        <div className="relative">
          <Button
            variant="outline"
            className={cn("h-10 gap-2", filters.violationCategories.length > 0 && "pr-8")}
            onClick={() => setViolationExpanded(!violationExpanded)}
          >
            违规分类筛选
            {filters.violationCategories.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {filters.violationCategories.length}
              </span>
            )}
            {violationExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          {filters.violationCategories.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearViolationCategories();
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted z-10"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* 搜索按钮 */}
        <Button onClick={onSearch} className="h-10 gap-2">
          <Search className="h-4 w-4" />
          搜索
        </Button>

        {/* 清除所有筛选 */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            清除全部
          </Button>
        )}
      </div>

      {/* 违规分类展开区域 */}
      <Collapsible open={violationExpanded} onOpenChange={setViolationExpanded}>
        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center">
              {violationCategories.map((category) => {
                const checkState = getParentCheckState(category.id);
                return (
                  <div key={category.id} className="space-y-1">
                    {/* 一级分类 */}
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleCategoryToggle(category.id, true)}
                    >
                      <Checkbox
                        checked={checkState === 'checked'}
                        className={cn(
                          checkState === 'indeterminate' && 'data-[state=checked]:bg-primary/50'
                        )}
                      />
                      <span className="font-medium text-sm">{category.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {category.children.filter(c => filters.violationCategories.includes(c.id)).length}/{category.children.length}
                      </span>
                    </div>
                    
                    {/* 二级分类 */}
                    <div className="ml-5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {category.children.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleCategoryToggle(sub.id)}
                        >
                          <Checkbox
                            checked={filters.violationCategories.includes(sub.id)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs">{sub.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};