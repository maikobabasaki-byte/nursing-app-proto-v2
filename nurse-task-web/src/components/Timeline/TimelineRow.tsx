import { useTimelineStore } from '../../stores/useTimelineStore'; // ★追加
import { TaskCard } from './TaskCard';
import { GroupParentCard } from './GroupParentCard';
import { GroupAccordion } from './GroupAccordion';
import { MemoCell } from './MemoCell';
import { getTaskStyles } from '../../utils/taskStyles';
import { handleCardClick } from '../../utils/taskLogic';
import { useDroppable } from '@dnd-kit/core';
import type { ExtendedTask, Memo } from '../../types/types';

// 💡 必要な最小限のPropsだけに絞り込みました！
interface TimelineRowProps {
  id: string;
  time: string;
  isCurrentRow: boolean;
  rowTasks: ExtendedTask[];
  placeholders: ExtendedTask[];
  expandedGroups: Record<string, boolean>;
  toggleGroup: (taskId: string) => void;
  setRowRef: (time: string, el: HTMLDivElement | null) => void;
  timeMemos: Memo[];
  isPastTime: (targetTime: string) => boolean;
  isSortMode?: boolean;
  activeId?: string | null;
  timelineMode?: number;
}

const isMemoInSlot = (memoTimeStr?: string, slotTimeStr?: string, modeMinutes: number = 30) => {
  if (!memoTimeStr || !slotTimeStr) return false;
  const memoMatch = String(memoTimeStr).match(/(\d{1,2}):(\d{2})/);
  const slotMatch = String(slotTimeStr).match(/(\d{1,2}):(\d{2})/);
  if (!memoMatch || !slotMatch) return memoTimeStr === slotTimeStr;

  const memoMins = parseInt(memoMatch[1], 10) * 60 + parseInt(memoMatch[2], 10);
  const slotMins = parseInt(slotMatch[1], 10) * 60 + parseInt(slotMatch[2], 10);

  return memoMins >= slotMins && memoMins < slotMins + modeMinutes;
};

export function TimelineRow({ 
  id, time, isCurrentRow, rowTasks, placeholders, expandedGroups, toggleGroup,
  setRowRef, timeMemos, isPastTime, isSortMode, activeId, timelineMode = 30,
}: TimelineRowProps) {
  
  // 🎯 ストアからアクションや状態を一本釣り
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);
  const setActiveMemoTime = useTimelineStore((state) => state.setActiveMemoTime);

  const { setNodeRef: setRowNodeRef, isOver } = useDroppable({ id: id });
  const { setNodeRef: setMemoDropRef, isOver: isMemoOver } = useDroppable({ id: `memo-drop-${time}` });

  const isDraggingActive = Boolean(activeId);

  return (
    <div
      ref={(el) => {
        setRowNodeRef(el);
        setRowRef(time, el); 
      }}
      className={`
        grid grid-cols-12 min-h-[60px] !border-b border-gray-200
        ${isOver 
          ? 'bg-amber-100/90 border-2 border-amber-500 shadow-md ring-2 ring-amber-300/80' 
          : isDraggingActive 
            ? 'bg-sky-50/40 border-dashed border-sky-300/80' 
            : (isCurrentRow ? 'bg-amber-50/50' : '')
        }
      `}
    >
      {/* 左端の時間軸ラベル (1/12) */}
      <div className="col-span-1 border-r border-gray-100 flex items-center justify-center font-bold text-gray-500 bg-gray-50 text-xs sm:text-sm select-none py-2">
        {time}
      </div>

      {/* 中央：タスクカード配置エリア (8/12 - 横3つ並び) */}
      <div className="col-span-8 p-1.5 min-h-[60px] grid grid-cols-1 md:grid-cols-3 gap-1.5 items-start content-start min-w-0">
        {placeholders.map(task => {
          const isProgressing = task.status === 'progressing';
          const isRecordStart = task.status === 'record_start';
          const isRecordPending = task.status === 'record_pending';

          const isInterruptTask = Boolean(
            task.title?.includes('ナースコール') || 
            task.title?.includes('SOS') || 
            task.task_id?.startsWith('CALL_INTERRUPT_')
          );

          let borderBgStyle = "border-gray-300 bg-gray-50 text-gray-500";
          let statusBadge = "【中断・保留中】";
          let statusIcon = "🟠";

          if (isInterruptTask) {
            borderBgStyle = "border-rose-500 bg-rose-50/95 text-rose-950 ring-2 ring-rose-300 shadow-md";
            statusBadge = "【⚡ 突発コール対応中】";
            statusIcon = "📞";
          } else if (isProgressing) {
            borderBgStyle = "border-sky-400 bg-sky-50/80 text-sky-900";
            statusBadge = "【実施中】";
            statusIcon = "🔵";
          } else if (isRecordStart) {
            borderBgStyle = "border-blue-400 bg-blue-50/80 text-blue-900";
            statusBadge = "【記録中】";
            statusIcon = "🟢";
          } else if (isRecordPending) {
            borderBgStyle = "border-orange-400 bg-orange-50/80 text-orange-900";
            statusBadge = "【記録一時中断】";
            statusIcon = "🟠";
          }

          return (
            <div 
              key={`placeholder-${task.task_id}`} 
              id={task.task_id === 'demo-task-tutorial' ? 'dummy-task-inprogress-pool' : undefined}
              onClick={() => setActivePopupTaskId(task.task_id)}
              className={`w-full min-w-0 border-2 border-dashed ${borderBgStyle} p-2.5 rounded shadow-sm flex flex-col justify-between font-bold text-xs min-h-[80px] cursor-pointer hover:shadow-md select-none`}
            >
              <div className="flex justify-between items-center w-full text-[10px]">
                <span className="font-extrabold flex items-center gap-1">
                  <span>{statusIcon}</span>
                  <span>{statusBadge}</span>
                </span>
                <span className="opacity-75">{task.room_id && task.room_id.trim() !== '' ? `${task.room_id}号室` : ''}</span>
              </div>
              <div className="text-xs truncate text-left font-black">
                {task.patient_name && task.patient_name.trim() !== '' ? `${task.patient_name}様` : isInterruptTask ? '📞 ナースコール対応' : ''}
              </div>
              <div className="text-[11px] truncate text-left opacity-90">{task.title}</div>
            </div>
          );
        })}
        
        {/* 中央：タスク専用エリア */}
        {rowTasks.map(task => {
          const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);

          return (
            <div key={task.task_id} className="relative w-full min-w-0 flex-shrink-0">
              {task.isGroup ? (
                // 💡 引数がスッキリ！
                <GroupParentCard 
                  task={task}
                  isExpanded={!!expandedGroups[task.task_id]}
                  onClick={() => toggleGroup(task.task_id)}
                  isSortMode={isSortMode}
                />
              ) : (
                // 💡 中継Propsをすべて排除。詳細表示は直接ストアを叩く
                <TaskCard 
                  task={task} 
                  cardColorClass={cardColorClass} 
                  borderStyle={borderStyle}
                  originalTime={task.initial_period}
                  onEdit={() => setActivePopupTaskId(task.task_id)} // ⚡ストア直結
                  onClick={() => handleCardClick(task)}
                  isSortMode={isSortMode}
                />
              )}

              {/* グループアコーディオン */}
              {task.isGroup && expandedGroups[task.task_id] && (
                <GroupAccordion 
                  task={task} 
                  isExpanded={true}
                  onChildClick={(childTaskId) => {
                    setActivePopupTaskId(childTaskId);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 右端：メモ配置エリア (3/12 - 横幅完全固定) */}
      <div 
        ref={setMemoDropRef}
        className={`col-span-3 border-l !border-gray-200 p-1 group relative min-h-[60px] flex flex-col gap-1 ${
          isMemoOver ? 'bg-yellow-100/50 border-yellow-400' : '!bg-yellow-50/10'
        }`}
        onClick={() => {
          if (useTimelineStore.getState().isReadOnly) return;
          // ⚡ タブレット・モバイル表示（768px未満）の時は、行クリックによるメモ追加ポップアップ起動を無効化
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return;
          }
          setActiveMemoTime(time);
        }}
      >
        {/* 💡 あらかじめこの時間軸に一致するメモを抽出 */}
        {(() => {
          const currentMemos = timeMemos.filter(m => isMemoInSlot(m.time, time, timelineMode));
          const isReadOnly = useTimelineStore.getState().isReadOnly;
          
          if (currentMemos.length === 0) {
            if (isReadOnly) return null;
            return (
              <span className="hidden md:flex !bg-yellow-100 text-xs text-yellow-700 font-bold opacity-0 group-hover:opacity-100 absolute inset-0 items-center justify-center pointer-events-none">
                  + メモを追加
              </span>
            );
          }

          return currentMemos.map(memo => (
            <MemoCell key={memo.id} memo={memo} isSortMode={isSortMode} />
          ));
        })()}
      </div>
    </div>
  );
}