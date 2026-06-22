import React from 'react';
import type { TimelineRowProps } from '../../types/types'
import { TaskCard } from './TaskCard';
import { GroupAccordion } from './GroupAccordion';
import { MemoCell } from './MemoCell';
import { getTaskStyles } from '../../utils/taskStyles';
import { useDroppable } from '@dnd-kit/core';

// 💡 React.FC を廃止し、引数の横に直接型（TimelineRowProps）を当てる形に変更！
export function TimelineRow({ 
  id, time, isCurrentRow, rowTasks, placeholders, expandedGroups, 
  onEdit, onChildClick, onUngroup, setRowRef,
  timeMemos, onMemoClick, onEditMemo, isPastTime,
  groupingMode,
  onStartGrouping // 🔥 確実に Props から直接キャッチする
}: TimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id, 
  });

  const { setNodeRef: setMemoDropRef, isOver: isMemoOver } = useDroppable({
    id: `memo-drop-${time}`, // 例: "memo-drop-09:00"
  });
  return (
    <div
      ref={(el) => {
        setNodeRef(el);     
        setRowRef(time, el); 
      }}
      className={`
        flex !border-b border-gray-200 transition-all duration-300 ease-in-out
        ${isCurrentRow ? 'bg-amber-50/50' : ''}
        ${isOver ? 'h-[120px] bg-blue-50 border-blue-300' : 'min-h-[60px]'}
      `}
    >
      <div className="w-16 text-center py-4 font-bold text-gray-500 bg-gray-50 border-r border-gray-100 select-none">
        {time}
      </div>

      <div className="p-2 min-h-[60px] relative flex flex-wrap flex-1 gap-2">
        {placeholders.map(task => (
           <div key={`placeholder-${task.task_id}`} className="w-60 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 p-2 m-2 rounded shadow-sm flex flex-col justify-center items-center font-bold text-xs h-[84px]">
             【中断・保留中】{task.room_id}号室 {task.patient_name}様
           </div>
        ))}
        
        {rowTasks.map(task => {
          const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);

          console.log(`🔍 [Row:${time}] groupingMode:`, groupingMode, " / onStartGrouping型:", typeof onStartGrouping);
          return (
            <div key={task.task_id} className="relative">
              <TaskCard 
                task={task} 
                cardColorClass={cardColorClass} 
                borderStyle={borderStyle}
                originalTime={task.initial_period}
                onEdit={() => onEdit(task)}
                groupingMode={groupingMode}
                // 🔥 孫の TaskCard に、上で直接キャッチした関数を流し込む！
                onStartGrouping={onStartGrouping} 
              />
              {task.isGroup && (
                <GroupAccordion 
                  task={task} 
                  isExpanded={!!expandedGroups[task.task_id]}
                  onChildClick={onChildClick}
                  onUngroup={onUngroup}
                />
              )}
            </div>
          );
        })}
      </div>

      
      <div 
        ref={setMemoDropRef} // 🔥 これを接続！
        className={`w-48 border-l !border-gray-200 p-1 group relative cursor-pointer min-h-[60px] transition-colors ${
          isMemoOver ? 'bg-yellow-100/50 border-yellow-400' : '!bg-yellow-50/10'
        }`}
        onClick={() => onMemoClick(time)}
      >
        {timeMemos.filter(m => m.time === time).map(memo => (
          <MemoCell key={memo.id} memo={memo} onEdit={onEditMemo} />
        ))}

        {timeMemos.filter(m => m.time === time).length === 0 && (
          <span className="!bg-yellow-100 text-xs text-yellow-700 font-bold opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none">
              + メモを追加
          </span>
        )}
      </div>
    </div>
  );
}