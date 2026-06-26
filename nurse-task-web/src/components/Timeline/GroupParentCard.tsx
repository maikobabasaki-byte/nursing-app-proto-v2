import { useDraggable, useDroppable } from '@dnd-kit/core'; 
import type { GroupParentCardProps } from '../../types/types';
import { GroupingButton } from './GroupingButton';

export const GroupParentCard = ({ 
  task, 
  isExpanded, 
  onClick, 
  groupingMode, 
  onStartGrouping 
}: GroupParentCardProps) => {
  console.log(`👤 親カード[ID:${task.task_id}] の groupType の中身:`, task.groupType);
  const childCount = task.children?.length || 0;

  // 1. 💡 ドラッグ用(Draggable) と ドロップ先用(Droppable) の両方をセットする
  const { 
    setNodeRef: setDragRef, 
    listeners, 
    attributes, 
    transform, 
    isDragging 
  } = useDraggable({
    id: task.task_id,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: task.task_id, 
  });

  // 💡 ドラッグ時の位置移動スタイル
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // 2. 💡 患者名グループ化モードかどうかの判定判定ロジック
  const isPatientMode = task.groupType === 'patient';

  // 両方のRefを1つのdivに適用するための統合関数
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div 
      ref={setCombinedRef} 
      style={style}
      onClick={onClick}
      className={`
        w-60 p-3 rounded-xl border-2 transition-all cursor-pointer shadow-sm flex gap-2 items-start
        ${isExpanded ? 'bg-indigo-700 border-indigo-400 text-white' : 'bg-blue-950 border-indigo-200 text-white'}
        ${isOver ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* ⠿ ドラッグハンドル */}
      <div 
        {...listeners} 
        {...attributes} 
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200 flex-shrink-0 pt-0.5 select-none"
      >
        ⠿
      </div>

      {/* カードのメインコンテンツ */}
      <div className="flex-1 min-w-0">
        {/* 上段：時間 ＆ グループ解除ボタン */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold opacity-90">{task.display_period}</span>
          
          <GroupingButton 
            task={task} 
            groupingMode={groupingMode} 
            onClick={() => {
              onStartGrouping(task.task_id);
            }}
          />
        </div>
        
        {/* 中段：【重要】モード別によるタイトル切り替え表示 */}
        <div className="mb-2">
          <span className="text-base font-bold block truncate">
            {isPatientMode 
              ? `${task.patient_name} 様`  // 👤 患者名グループの表示
              : `${task.title}`            // 📋 タスク名グループの表示（例: "バイタル測定"）
            }
          </span>
        </div>

        {/* 下段：件数バッジ */}
        <div className="flex justify-end">
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {childCount} 件
          </span>
        </div>
      </div>
    </div>
  );
};