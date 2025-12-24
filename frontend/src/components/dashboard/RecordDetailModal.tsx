import React from 'react';
import { ExternalLink, Clock, User, Video, Calendar } from 'lucide-react';
import { QARecord } from '@/types/qa';
import { StatusBadge } from '@/components/StatusBadge';
import { getSubCategoryLabel } from '@/data/violationCategories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecordDetailModalProps {
  record: QARecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  open,
  onOpenChange,
}) => {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>质检详情</span>
            <StatusBadge isViolation={record.isViolation} complianceStatus={record.complianceStatus} />
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Screenshot */}
          <div
            className={cn(
              "relative rounded-xl overflow-hidden",
              record.isViolation && "violation-border"
            )}
          >
            <img
              src={record.screenshot}
              alt="课堂截图"
              className="w-full aspect-video object-cover"
            />
            {record.isViolation && record.violations.length > 0 && (
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[90%]">
                {record.violations.map((v, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white shadow-lg"
                  >
                    {getSubCategoryLabel(v.subCategory)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <span>学员ID</span>
              </div>
              <p className="font-mono font-medium">{record.studentId}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>教师姓名</span>
              </div>
              <p className="font-medium">{record.teacherName}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>上课时间</span>
              </div>
              <p className="font-medium">{record.classTime}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>上课时长</span>
              </div>
              <p className="font-medium">{record.classDuration}</p>
            </div>
          </div>

          {/* Violation Details */}
          {record.isViolation && record.violations.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <h4 className="font-medium mb-2 text-red-700">违规信息 ({record.violations.length}项)</h4>
              <div className="space-y-1">
                {record.violations.map((v, idx) => (
                  <p key={idx} className="text-sm text-red-600">
                    {idx + 1}. {getSubCategoryLabel(v.subCategory)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="default" className="flex-1" asChild>
              <a href={record.videoLink} target="_blank" rel="noopener noreferrer">
                <Video className="h-4 w-4 mr-2" />
                观看录像
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
