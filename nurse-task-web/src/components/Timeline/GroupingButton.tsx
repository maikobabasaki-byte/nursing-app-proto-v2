// components/Timeline/GroupingButton.tsx
import { getGroupingButtonStatus } from '../../utils/taskUI'; // 先ほどの計算ロジック
import type { ExtendedTask } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface GroupingButtonProps {
  task: ExtendedTask;
  onClick: () => void;
}

export const GroupingButton = ({ task, onClick }: GroupingButtonProps) => {
  const groupingMode = useTimelineStore((state) => state.groupingMode);

  const { disabled, label, className } = getGroupingButtonStatus(task, groupingMode);
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`!text-xs !px-1 !rounded transition-colors ${className}`}
    >
      {label}
    </button>
  );
};