import { useDraggable, useDroppable } from '@dnd-kit/core'; 
import type { ExtendedTask } from '../../types/types';
import type { GroupParentCardProps } from '../../types/types';
import { GroupingButton } from './GroupingButton';
import { useTimelineStore } from '../../stores/useTimelineStore';


export const GroupParentCard = ({ 
  task, 
  isExpanded, 
  onClick
}: GroupParentCardProps) => {
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping); // ストアから取得
  const childCount = task.children?.length || 0;

  // 全ての子タスクが完了、またはこの親グループ自体が完了状態か判定
  const isCompleted = task.status === 'record_complete';

  // ドラッグ＆ドロップ設定
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

  // ドラッグ時の位置移動スタイル
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isPatientMode = task.groupType === 'patient';

  // 両方のRefを1つのdivに適用するための統合関数
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // 🎨 ステータスと開閉状態による背景色のトリアージ
  const getBackgroundColorClass = () => {
    if (isCompleted) {
      return 'bg-slate-700/50 border-slate-500/50 text-white/60';
    }
    return isExpanded 
      ? 'bg-indigo-700 border-indigo-400 text-white' 
      : 'bg-blue-950 border-indigo-200 text-white';
  };

  return (
    <div 
      ref={setCombinedRef} 
      style={style}
      onClick={onClick}
      className={`
        w-60 p-3 rounded-xl border-2 transition-all cursor-pointer shadow-sm flex gap-2 items-start
        ${getBackgroundColorClass()}
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
          
          {/* 💡 引数は task だけでOK（中で自力でストアを見に行きます） */}
          <GroupingButton task={task} />
        </div>
        
        {/* 中段：モード別によるタイトル切り替え表示 */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 w-full">
            {task.status === 'completed' && <span className="text-xs select-none" title="記録未完了">🔵</span>}
            {task.status === 'record_start' && <span className="text-xs select-none" title="記録中">🟢</span>}
            {task.status === 'record_pending' && <span className="text-xs select-none" title="記録中断中">🟠</span>}
            {task.status === 'record_complete' && <span className="text-xs select-none" title="記録完了">✅</span>}
            <span className="text-base font-bold block truncate">
              {isPatientMode ? `${task.patient_name} 様` : `${task.title}`}
            </span>
          </div>
        </div>

        {/* 下段：件数バッジ */}
        <div className="flex justify-end">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isCompleted ? 'bg-white/10 text-white/40' : 'bg-white/20'
          }`}>
            {childCount} 件
          </span>
        </div>
      </div>
    </div>
  );
};