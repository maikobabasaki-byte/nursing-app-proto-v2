// utils/taskUI.ts
import type { ExtendedTask } from '../types/types';

export const getGroupingButtonStatus = (task: ExtendedTask, groupingMode: string | null) => {
  const isHighPriority = task.priority === 'high';
  const isSelected = groupingMode === task.task_id;

  return {
    disabled: isHighPriority,
    label: isHighPriority ? '制限中' : (isSelected ? '選択中' : 'グループ化'),
    className: isHighPriority
      ? '!bg-gray-400 !cursor-not-allowed opacity-60'
      : (isSelected ? '!bg-orange-500 !text-white' : '!bg-blue-500 !text-white')
  };
};