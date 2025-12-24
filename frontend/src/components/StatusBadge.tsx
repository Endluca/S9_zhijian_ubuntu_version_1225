import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  isViolation: boolean;
  complianceStatus?: string;  // 合规状态：正常/有违规/未质检完成
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  isViolation, 
  complianceStatus,
  label,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  // 优先使用 complianceStatus
  if (complianceStatus === '未质检完成') {
    return (
      <span 
        className={cn(
          "inline-flex items-center font-medium rounded-full",
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          sizeClasses[size]
        )}
      >
        {label || '未质检完成'}
      </span>
    );
  }

  if (complianceStatus === '有违规' || isViolation) {
    return (
      <span 
        className={cn(
          "inline-flex items-center font-medium rounded-full",
          "bg-accent text-accent-foreground",
          sizeClasses[size]
        )}
      >
        {label || '有违规'}
      </span>
    );
  }

  return (
    <span 
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "bg-sky-light text-primary",
        sizeClasses[size]
      )}
    >
      {label || '正常'}
    </span>
  );
};
