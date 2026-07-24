import React from 'react';
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
}

export function TimelineRow({ 
  id, time, isCurrentRow, rowTasks, placeholders, expandedGroups, toggleGroup,
  setRowRef, timeMemos, isPastTime,
}: TimelineRowProps) {
  
  // 🎯 ストアからアクションや状態を一本釣り
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);
  const setActiveMemoTime = useTimelineStore((state) => state.setActiveMemoTime);

  const { setNodeRef: setRowNodeRef, isOver } = useDroppable({ id: id });
  const { setNodeRef: setMemoDropRef, isOver: isMemoOver } = useDroppable({ id: `memo-drop-${time}` });
  
  return (
    <div
      ref={(el) => {
        setRowNodeRef(el);
        setRowRef(time, el); 
      }}
      className={`
        flex !border-b border-gray-200 transition-all duration-300 ease-in-out
        ${isCurrentRow ? 'bg-amber-50/50' : ''}
        ${isOver ? 'h-[120px] bg-blue-50 border-blue-300' : 'min-h-[60px]'}
      `}
    >
      {/* 左端の時間軸ラベル */}
      <div className="w-16 text-center py-4 font-bold text-gray-500 bg-gray-50 border-r border-gray-100 select-none">
        {time}
      </div>

      {/* 中央：タスクカード配置エリア */}
      <div className="p-2 min-h-[60px] relative flex flex-wrap flex-1 gap-2">
        {placeholders.map(task => (
           <div key={`placeholder-${task.task_id}`} className="w-60 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 p-2 m-2 rounded shadow-sm flex flex-col justify-center items-center font-bold text-xs h-[84px]">
             【中断・保留中】{task.room_id}号室 {task.patient_name}様
           </div>
        ))}
        
        {rowTasks.map(task => {
          const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);

          return (
            <div key={task.task_id} className="relative">
              {task.isGroup ? (
                // 💡 引数がスッキリ！
                <GroupParentCard 
                  task={task}
                  isExpanded={!!expandedGroups[task.task_id]}
                  onClick={() => toggleGroup(task.task_id)}
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
                />
              )}

              {/* グループアコーディオン */}
              {task.isGroup && expandedGroups[task.task_id] && (
                <GroupAccordion 
                  task={task} 
                  isExpanded={true}
                  onChildClick={(childTask) => {
                    // 子タスクをクリックしたときの処理（例: モーダルを開く、選択するなど）
                    console.log("Clicked child:", childTask);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 右端：メモ配置エリア */}
      <div 
        ref={setMemoDropRef}
        className={`w-48 border-l !border-gray-200 p-1 group relative cursor-pointer min-h-[60px] transition-colors ${
          isMemoOver ? 'bg-yellow-100/50 border-yellow-400' : '!bg-yellow-50/10'
        }`}
        onClick={() => setActiveMemoTime(time)} // ⚡クリックで新規メモ作成ステートをストアに直撃
      >
        {/* 💡 あらかじめこの時間軸に一致するメモを抽出（変数化でエコに） */}
        {(() => {
          const currentMemos = timeMemos.filter(m => m.time === time);
          
          if (currentMemos.length === 0) {
            return (
              <span className="!bg-yellow-100 text-xs text-yellow-700 font-bold opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none">
                  + メモを追加
              </span>
            );
          }

          return currentMemos.map(memo => (
            <MemoCell key={memo.id} memo={memo} />
          ));
        })()}
      </div>
    </div>
  );
}