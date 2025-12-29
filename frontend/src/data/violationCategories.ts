import { ViolationCategory } from '@/types/qa';

export const violationCategories: ViolationCategory[] = [
  {
    id: 'preparation',
    label: 'A. 课堂准备与规范',
    children: [
      { id: '虚拟背景使用', label: '虚拟背景使用', parentId: 'preparation' },
      { id: '网络与设备', label: '网络与设备', parentId: 'preparation' },
      { id: '课后检测', label: '课后检测', parentId: 'preparation' },
      { id: '抗遗忘预约', label: '抗遗忘预约', parentId: 'preparation' },
      { id: '课程时长达标', label: '课程时长达标', parentId: 'preparation' },
      { id: '人像清晰度和完整度', label: '人像清晰度和完整度', parentId: 'preparation' },
    ],
  },
  {
    id: 'behavior',
    label: 'B. 课堂行为与状态',
    children: [
      { id: '教学姿态规范', label: '教学姿态规范', parentId: 'behavior' },
      { id: '教学行为规范', label: '教学行为规范', parentId: 'behavior' },
      { id: '教学状态', label: '教学状态', parentId: 'behavior' },
    ],
  },
  {
    id: 'interaction',
    label: 'C. 教学互动与反馈',
    children: [
      { id: '读音纠正', label: '读音纠正', parentId: 'interaction' },
      { id: '反馈情感', label: '反馈情感', parentId: 'interaction' },
    ],
  },
];

export const getAllSubCategoryIds = (): string[] => {
  return violationCategories.flatMap(cat => cat.children.map(sub => sub.id));
};

export const getSubCategoryLabel = (id: string): string => {
  for (const cat of violationCategories) {
    const sub = cat.children.find(s => s.id === id);
    if (sub) return sub.label;
  }
  return id;
};

export const getCategoryLabel = (id: string): string => {
  const cat = violationCategories.find(c => c.id === id);
  return cat?.label || id;
};

