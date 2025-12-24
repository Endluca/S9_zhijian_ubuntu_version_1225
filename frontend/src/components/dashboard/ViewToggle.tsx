import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { ViewMode } from '@/types/qa';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => onViewModeChange('list')}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          viewMode === 'list'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <LayoutList className="h-4 w-4" />
        列表
      </button>
      <button
        onClick={() => onViewModeChange('card')}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          viewMode === 'card'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        卡片
      </button>
    </div>
  );
};
