import type { TaskCardPropsInner } from "../../types/types";
import { useDraggable,useDroppable } from '@dnd-kit/core';

export const TaskCard = (props: TaskCardPropsInner) => {
  // ここでデフォルト値を設定すれば、プロパティが渡されなくても絶対にエラーにならない
  const { 
    task, 
    onStartGrouping,
    groupingMode,
    cardColorClass = 'bg-white border-gray-200',
    borderStyle = 'border-solid',
    originalTime, 
    onEdit,
    style, 
    className = '' ,
  } = props;
  // 3. ドラッグの設定
  const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
    id: task.task_id,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: task.task_id, // 自分のIDをドロップ先IDとして登録
  });

  const setCombinedRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };
  // ドラッグ中のスタイル
  const dndStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleGroupingClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // 発火を止める
  
  // 💡 【追加】もし onEdit が渡されていない（＝DragOverlay側の身代わりカードである）場合は、処理を完全にスルーする
  if (!onEdit) {
    console.log("⚠️ DragOverlay側のカードがクリックされたため無視します");
    return;
  }

  console.log("🚨 [TaskCard] 正真正銘のプール側/タイムライン側のボタンがクリックされました！タスクID:", task?.task_id);
  
  if (onStartGrouping) {
    onStartGrouping(task.task_id);
  } else {
    console.error("❌ [TaskCard] onStartGrouping 関数が Props から渡されていません！");
  }
};

  // 🔥 グループ化モード中で、自分がそのモードの起点（ボタンが押されたタスク）ではない場合、
  // ドロップ対象であることを示すために背景色を黄色にする
  const isDropTarget = groupingMode !== null && groupingMode !== task.task_id;

  return (
    <div 
      ref={setCombinedRef}
      style={{ ...dndStyle, ...style }}
      className={`relative w-55 p-2 m-2 rounded shadow-sm font-bold transition-all select-none flex items-start gap-2 ${cardColorClass} ${borderStyle} ${className}`}
    >
      {/* 1. ドラッグハンドル（左端） */}
      <div 
        {...listeners} 
        {...attributes} 
        className=" cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 pt-1"
      >
        ⠿
      </div>
      {/* 2. カードの内容（クリックで onEdit） */}
      <div className="flex-1 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-size-sm font-bold">{task.display_period}</span>
            {originalTime && originalTime !== task.display_period && (
              <span className="bg-gray-700 text-white text-[12px] px-1.5 py-0.5 rounded font-normal opacity-90">
                指示: {originalTime}
              </span>
            )}
          </div>
          <button 
            onClick={handleGroupingClick}
            // 優先度が高い時はボタンを無効化（disabled）
            disabled={task.priority === 'high'} 
            className={`!text-xs !px-1 !rounded transition-colors ${
              task.priority === 'high'
                ? '!bg-gray-400 !cursor-not-allowed opacity-60' // 無効時のスタイル
                : (groupingMode === task.task_id 
                    ? '!bg-orange-500 !text-white' 
                    : '!bg-blue-500 !text-white') // 通常時のスタイル
            }`}
          >
            {task.priority === 'high' 
              ? '制限中' 
              : (groupingMode === task.task_id ? '選択中' : 'グループ化')
            }
          </button>
          {/* ステータスアイコン */}
          {task.status === 'completed' && <span className="text-blue-500 text-xs" title="記録未完了">🔵</span>}
          {task.status === 'record_start' && <span className="text-green-500 text-xs" title="記録中">🟢</span>}
          {task.status === 'record_pending' && <span className="text-orange-500 text-xs" title="記録中断中">🟠</span>}
        </div>
        
        <div className="grid grid-cols-3 gap-1 mb-1 text-sm">
          <span>{task.room_id}号室</span>
          <span className='col-span-2 text-left'>{task.patient_name}様</span>
        </div>
        
        <div className="text-sm text-left">{task.title}</div>
        
        {task.details && (
          <div className="text-[11px] font-normal mt-0.5 border-t border-dashed border-current/20 pt-0.5 opacity-80 text-left">
            {task.details}
          </div>
        )}
        </div>
    </div>
  );
};