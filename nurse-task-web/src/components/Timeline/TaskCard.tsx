import type { TaskCardPropsInner } from "../../types/types";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GroupingButton } from "./GroupingButton";
import { useTimelineStore } from "../../stores/useTimelineStore";

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
  const isReadOnly = useTimelineStore((state) => state.isReadOnly);

  // 3. ドラッグの設定（isOverlayがtrueまたはisReadOnlyがtrueの時はフック登録を完全無効化）
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: task.task_id,
    disabled: Boolean(props.isOverlay || isReadOnly),
  });

  const { setNodeRef: setDroppableRef} = useDroppable({
    id: task.task_id, // 自分のIDをドロップ先IDとして登録
    disabled: Boolean(props.isOverlay || isReadOnly),
  });

  const setCombinedRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  let elementId: string | undefined = undefined;
  if (task.task_id === 'demo-task-tutorial') {
    if (task.status === 'untouched') {
      elementId = 'dummy-task-step1-untouched';
    } else if (task.status === 'completed') {
      elementId = 'dummy-task-step5-completed-timeline';
    } else if (task.status === 'progressing') {
      elementId = 'dummy-task-inprogress-timeline';
    }
  }

  const isCardDrag = Boolean(props.isSortMode);

  const isInterruptTask = Boolean(
    task.title?.includes('ナースコール') || 
    task.title?.includes('SOS') || 
    task.task_id?.startsWith('CALL_INTERRUPT_')
  );

  const effectiveColorClass = isInterruptTask
    ? 'bg-rose-50/90 border-rose-500 text-rose-950 ring-2 ring-rose-200 shadow-md'
    : cardColorClass;

  return (
    <div 
      id={elementId}
      ref={setCombinedRef}
      style={style}
      {...(isCardDrag ? listeners : {})}
      {...(isCardDrag ? attributes : {})}
      className={`relative w-full min-w-0 flex-shrink-0 p-2.5 rounded shadow-sm font-bold select-none flex items-start gap-2 ${effectiveColorClass} ${borderStyle} ${className} ${
        isDragging
          ? 'opacity-0 pointer-events-none shadow-none'
          : isCardDrag 
            ? 'touch-none cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-300 shadow-md' 
            : ''
      }`}
    >
      {/* 💡 左端エリア：ドラッグハンドルとステータスアイコンを綺麗に縦並びにする */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-5 select-none pt-0.5">
        
        {/* 1. ドラッグハンドル（上段: PC表示時かつ通常モード・可読可能時のみ表示） */}
        {!isCardDrag && !isReadOnly && (
          <div 
            {...listeners} 
            {...attributes} 
            className="hidden md:block cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-base"
          >
            ⠿
          </div>
        )}
        
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
        className={`flex-1 min-w-0 ${isCardDrag ? '' : 'cursor-pointer'}`}
        onClick={(e) => {
          if (isCardDrag) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if ((e.target as HTMLElement).closest('button')) return;
          onEdit?.();
        }}
      >
        <div className="flex items-center justify-between mb-1 gap-1 min-w-0 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-sm font-bold whitespace-nowrap flex-shrink-0">
              {task.display_period || task.scheduled_at || ''}
            </span>
            {isInterruptTask ? (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                ⚡ 突発割り込み
              </span>
            ) : task.is_additional ? (
              <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                臨時追加
              </span>
            ) : null}
            {task.instruction_type === '看護指示' ? (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                看護指示
              </span>
            ) : task.instruction_type === '医師指示' && !isInterruptTask ? (
              <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap flex items-center gap-0.5 opacity-90">
                医師指示
              </span>
            ) : null}
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
        
        {(() => {
          const hasRoom = Boolean(task.room_id && String(task.room_id).trim() !== '');
          const hasPatient = Boolean(task.patient_name && String(task.patient_name).trim() !== '');

          if (isInterruptTask && !hasRoom && !hasPatient) {
            return (
              <div className="py-1 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-black text-rose-950 flex items-center gap-1.5 bg-rose-600/10 border border-rose-300 px-3 py-1 rounded-full shadow-2xs">
                  <span>ナースコール対応</span>
                </div>
                {task.details && (
                  <div className="text-[11px] font-normal text-rose-900/80 mt-1 text-left truncate max-w-full">
                    {task.details}
                  </div>
                )}
              </div>
            );
          }

          return (
            <>
              {(hasRoom || hasPatient) && (
                <div className="grid grid-cols-3 gap-1 mb-1 text-sm">
                  <span>{hasRoom ? `${task.room_id}号室` : ''}</span>
                  <span className="col-span-2 text-left">{hasPatient ? `${task.patient_name}様` : ''}</span>
                </div>
              )}

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
            </>
          );
        })()}
      </div>
    </div>
  );
};