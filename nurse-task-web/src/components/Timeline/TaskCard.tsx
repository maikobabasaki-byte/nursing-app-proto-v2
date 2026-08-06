import type { TaskCardPropsInner } from "../../types/types";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GroupingButton } from "./GroupingButton";

export const TaskCard = (props: TaskCardPropsInner) => {
  // ここでデフォルト値を設定すれば、プロパティが渡されなくても絶対にエラーにならない
  const { 
    task, 
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
      className={`relative w-64 p-2.5 rounded shadow-sm font-bold transition-all select-none flex items-start gap-2 ${cardColorClass} ${borderStyle} ${className}`}
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
      <div 
        className="flex-1 min-w-0 cursor-pointer" 
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onEdit?.();
        }}
      >
        <div className="flex items-center justify-between mb-1 gap-1 min-w-0 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-sm font-bold whitespace-nowrap flex-shrink-0">
              {task.display_period || task.scheduled_at || ''}
            </span>
            {task.is_additional && (
              <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                臨時追加
              </span>
            )}
            {task.instruction_type === '看護指示' ? (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                看護指示
              </span>
            ) : (
              <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap flex items-center gap-0.5 opacity-90">
                医師指示
              </span>
            )}
            {originalTime &&
             originalTime !== task.display_period &&
             originalTime !== task.scheduled_at &&
             originalTime.includes(':') && (
              <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded font-normal whitespace-nowrap opacity-90 flex-shrink-0">
                指示: {originalTime}
              </span>
            )}
          </div>
          <GroupingButton task={task} />
        </div>
        
        <div className="grid grid-cols-3 gap-1 mb-1 text-sm">
          <span>{task.room_id ? `${task.room_id}号室` : ''}</span>
          <span className='col-span-2 text-left'>{task.patient_name ? `${task.patient_name}様` : '患者名未設定'}</span>
        </div>
        
        <div className="text-sm text-left">{task.title}</div>
        
        {task.details &&
         task.details.trim() !== '' &&
         task.details.trim() !== '無題タスク' &&
         task.details.trim() !== '詳細なし' &&
         task.details.trim() !== 'なし' && (
          <div className="text-[11px] font-normal mt-0.5 border-t border-dashed border-current/20 pt-0.5 opacity-80 text-left">
            {task.details}
          </div>
        )}
      </div>
    </div>
  );
};