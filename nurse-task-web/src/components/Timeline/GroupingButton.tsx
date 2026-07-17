// components/Timeline/GroupingButton.tsx
import { getGroupingButtonStatus } from '../../utils/taskUI';
import type { ExtendedTask } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';

// onClick を Props から削除します
interface GroupingButtonProps {
  task: ExtendedTask;
}

export const GroupingButton = ({ task }: GroupingButtonProps) => {
  // ストアから必要な関数と状態を取得
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);
  const groupingMode = useTimelineStore((state) => state.groupingMode);

  // 表示ロジック（そのまま利用）
  const { disabled, label, className } = getGroupingButtonStatus(task, groupingMode);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 親への伝播を確実に止める
    handleStartGrouping(task.task_id);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className={`!text-xs !px-1 !rounded transition-colors ${className}`}
    >
      {label}
    </button>
  );
};