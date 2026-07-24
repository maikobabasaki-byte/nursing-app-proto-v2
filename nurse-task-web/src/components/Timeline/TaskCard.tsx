import type { TaskCardPropsInner } from "../../types/types";
import { useDraggable,useDroppable } from '@dnd-kit/core';
import { useTimelineStore } from "../../stores/useTimelineStore";
import { GroupingButton } from "./GroupingButton";

export const TaskCard = (props: TaskCardPropsInner) => {
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);
  // ここでデフォルト値を設定すれば、プロパティが渡されなくても絶対にエラーにならない
  const { 
    task, 
    groupingMode,
    onEdit,         // 必須
    style,          // 任意
    originalTime,   // 任意
    cardColorClass = 'bg-white border-gray-200',
    borderStyle = 'border-solid',
    className = '',
  } = props;
  // 3. ドラッグの設定
  const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
    id: task.task_id,
  });

  const { setNodeRef: setDroppableRef} = useDroppable({
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

  const isCurrentlySelected = 
    groupingMode === task.task_id || 
    (task.isGroup && task.children?.some(child => child.task_id === groupingMode));

  const handleGroupingClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!onEdit) return;

  // ボタンを押した時、ストアの handleStartGrouping が呼ばれる
  // ストア側で (state) => ({ groupingMode: state.groupingMode === taskId ? null : taskId }) 
  // のようなロジックになっていれば、これで自然とトグルします。
  handleStartGrouping(task.task_id);
};

if (transform) {
  console.log(`🔍 [ドラッグ中のタスク情報] ID: ${task.task_id} | ${task.title}`, {
    parent_id: task.parent_id,
    isGroup: task.isGroup,
    isChild: task.isChild,
    childrenCount: task.children?.length ?? 0,
    childrenIDs: task.children?.map(c => c.task_id) ?? [],
  });
}

  return (
    <div 
      ref={setCombinedRef}
      style={{ ...dndStyle, ...style }}
      className={`relative w-55 p-2 m-2 rounded shadow-sm font-bold transition-all select-none flex items-start gap-2 ${cardColorClass} ${borderStyle} ${className}`}
    >
      {/* 💡 左端エリア：ドラッグハンドルとステータスアイコンを綺麗に縦並びにする */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-5 select-none pt-0.5">
        
        {/* 1. ドラッグハンドル（上段） */}
        <div 
          {...listeners} 
          {...attributes} 
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-base"
        >
          ⠿
        </div>
        
        {/* 2. ステータスアイコン（下段） */}
        <div className="flex items-center justify-center h-4 text-xs">
          {task.status === 'completed' && <span className="text-blue-500" title="記録未完了">🔵</span>}
          {task.status === 'record_start' && <span className="text-green-500" title="記録中">🟢</span>}
          {task.status === 'record_pending' && <span className="text-orange-500" title="記録中断中">🟠</span>}
          {task.status === 'record_complete' && <span title="記録完了">✅</span>}
        </div>
        
      </div>

      {/* 2. カードの内容（右側エリア：クリックで onEdit） */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold">{task.display_period}</span>
            {originalTime && originalTime !== task.display_period && (
              <span className="bg-gray-700 text-white text-[12px] px-1.5 py-0.5 rounded font-normal opacity-90">
                指示: {originalTime}
              </span>
            )}
          </div>
          <GroupingButton task={task} />
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