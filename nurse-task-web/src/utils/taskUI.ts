// utils/taskUI.ts
import type { ExtendedTask } from '../types/types';

export const getGroupingButtonStatus = (task: ExtendedTask, groupingMode: string | null) => {
  const isHighPriority = task.priority === 'high';
  
  // 💡 【ここを修正】単体のID比較だけでなく、グループ内の子タスク（children）のIDも一斉チェックする
  const isSelected = 
    groupingMode === task.task_id || 
    (task.isGroup && task.children?.some(child => child.task_id === groupingMode));

  return {
    disabled: isHighPriority,
    label: isHighPriority ? '制限中' : (isSelected ? '選択中' : 'グループ化'),
    className: isHighPriority
      ? '!bg-gray-400 !cursor-not-allowed opacity-60'
      : (isSelected ? '!bg-orange-500 !text-white' : '!bg-blue-500 !text-white')
  };
};