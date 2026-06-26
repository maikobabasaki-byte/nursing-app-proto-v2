// components/Timeline/GroupingButton.tsx
import type { GroupingProps } from '../../types/types'
import { getGroupingButtonStatus } from '../../utils/taskUI'; // 先ほどの計算ロジック


export const GroupingButton = ({ task, groupingMode, onClick }: GroupingProps) => {
  const { disabled, label, className } = getGroupingButtonStatus(task, groupingMode);
  
  return (
    <button 
      onClick={onClick} // 親から渡された関数を実行
      disabled={disabled}
      className={`!text-xs !px-1 !rounded transition-colors ${className}`}
    >
      {label}
    </button>
  );
};