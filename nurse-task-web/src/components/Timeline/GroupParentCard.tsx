import { useDraggable, useDroppable } from '@dnd-kit/core'; 
import type { GroupParentCardProps } from '../../types/types';
import { GroupingButton } from './GroupingButton';


export const GroupParentCard = (props: GroupParentCardProps) => {
  const { task, isExpanded, onClick, isSortMode, isOverlay } = props;
  const childCount = task.children?.length || 0;

  // 全ての子タスクが完了、またはこの親グループ自体が完了状態か判定
  const isCompleted = task.status === 'record_complete';
  const isCardDrag = Boolean(isSortMode);

  // ドラッグ＆ドロップ設定（isOverlayがtrueの時はフック登録を完全無効化）
  const { 
    setNodeRef: setDragRef, 
    listeners, 
    attributes, 
    isDragging 
  } = useDraggable({
    id: task.task_id,
    disabled: Boolean(isOverlay),
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: task.task_id, 
    disabled: Boolean(isOverlay),
  });

  // 移動表示は DragOverlay が全て担当するため、タイムライン行内の実体は一切 transform 移動させない（位置完全固定）
  const style = undefined;

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
      onClick={(e) => {
        if (isCardDrag) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick();
      }}
      {...(isCardDrag ? listeners : {})}
      {...(isCardDrag ? attributes : {})}
      className={`
        w-full min-w-0 flex-shrink-0 p-3 rounded-xl border-2 shadow-sm flex gap-2 items-start select-none ${isCardDrag ? '' : 'cursor-pointer'}
        ${getBackgroundColorClass()}
        ${isOver ? 'ring-4 ring-yellow-400' : ''}
        ${isDragging ? 'opacity-0 pointer-events-none shadow-none' : ''}
        ${isCardDrag && !isDragging ? 'touch-none cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-300 shadow-md' : ''}
      `}
    >
      {/* ⠿ ドラッグハンドル（PCかつ通常モード時のみ表示） */}
      {!isCardDrag && (
        <div 
          {...listeners} 
          {...attributes} 
          className="hidden md:block cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200 flex-shrink-0 pt-0.5 select-none"
        >
          ⠿
        </div>
      )}

      {/* カードのメインコンテンツ */}
      <div className="flex-1 min-w-0">
        {/* 上段：時間 ＆ 指示バッジ ＆ グループ化ボタン */}
        <div className="flex items-center justify-between mb-2 gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold opacity-90 whitespace-nowrap flex-shrink-0">{task.display_period}</span>
            {task.initial_period && task.initial_period !== task.display_period && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded font-normal whitespace-nowrap opacity-90 flex-shrink-0">
                指示: {task.initial_period}
              </span>
            )}
          </div>
          
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