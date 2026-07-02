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

  // 全ての子タスクが完了、またはこの親グループ自体が完了状態か判定
  const isCompleted = task.status === 'record_complete';

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

  // ドラッグ時の位置移動スタイル
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // 患者名グループ化モードかどうかの判定判定ロジック
  const isPatientMode = task.groupType === 'patient';

  // 両方のRefを1つのdivに適用するための統合関数
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const isCurrentlySelected = 
  groupingMode === task.task_id || 
  (task.children?.some(child => child.task_id === groupingMode));

  // 🎨 【UI変更】ステータスと開閉状態による背景色のトリアージ（仕分け）
  const getBackgroundColorClass = () => {
    if (isCompleted) {
      // ✅ 全員完了：存在感を抑えた「薄い渋めの紺（鉄紺）」にして、文字の不透明度も落とす
      return 'bg-slate-700/50 border-slate-500/50 text-white/60';
    }
    // ⏳ 未完了：既存のハッキリした紺色（展開時：明るい紺 / 折りたたみ時：濃い紺）
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
          <div className="flex items-center gap-1.5 w-full">
            {/* 📝 記録進捗に応じたステータスアイコンを最優先で左側に表示 */}
            {task.status === 'completed' && <span className="text-xs select-none" title="記録未完了">🔵</span>}
            {task.status === 'record_start' && <span className="text-xs select-none" title="記録中">🟢</span>}
            {task.status === 'record_pending' && <span className="text-xs select-none" title="記録中断中">🟠</span>}
            {task.status === 'record_complete' && <span className="text-xs select-none" title="記録完了">✅</span>}
            <span className="text-base font-bold block truncate">
              {isPatientMode 
                ? `${task.patient_name} 様`  // 👤 患者名グループの表示
                : `${task.title}`            // 📋 タスク名グループの表示（例: "バイタル測定"）
              }
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