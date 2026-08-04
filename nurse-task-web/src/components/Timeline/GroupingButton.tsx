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
  const setGroupingMode = useTimelineStore((state) => state.setGroupingMode);
  const groupingMode = useTimelineStore((state) => state.groupingMode);

  // 表示ロジック（そのまま利用）
  const { disabled, label, className } = getGroupingButtonStatus(task, groupingMode);
  const isSelected = label === '選択中';
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();

    if (isSelected) {
      // 🧠 「選択中」のボタンが押された場合は無条件で100%確定のモード解除 (null)
      setGroupingMode(null);
    } else {
      handleStartGrouping(task.task_id);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <button 
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
      disabled={disabled}
      className={`!text-xs !px-1.5 !py-0.5 !rounded transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${className}`}
    >
      {label}
    </button>
  );
};