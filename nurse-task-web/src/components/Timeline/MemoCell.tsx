import React from 'react';
import type { Memo } from '../../types/types';
import { useDraggable } from '@dnd-kit/core';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface MemoCellProps {
  memo: Memo;
  isSortMode?: boolean;
  isOverlay?: boolean;
}

export const MemoCell = ({ memo, isSortMode, isOverlay }: MemoCellProps) => {
  const setEditingMemo = useTimelineStore((state) => state.setEditingMemo);
  const isCardDrag = Boolean(isSortMode);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `memo-${memo.id}`,
    disabled: Boolean(isOverlay),
  });

  const dateObj = memo.scheduledAt ? new Date(memo.scheduledAt) : null;
  const formattedDate = dateObj && !isNaN(dateObj.getTime()) 
        ? `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
        : null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (listeners?.onPointerDown) {
      listeners.onPointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (listeners?.onPointerMove) {
      listeners.onPointerMove(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (listeners?.onPointerUp) {
      listeners.onPointerUp(e);
    }
  };

  const isCompleted = Boolean(memo.is_completed);

  return (
    <div 
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      {...(isCardDrag ? listeners : {})}
      {...(isCardDrag ? attributes : {})}
      className={`w-full text-[12px] p-1.5 rounded shadow-sm border mb-1 flex items-start gap-1 select-none transition-all ${
        isCompleted
          ? 'bg-emerald-50/90 border-emerald-300/80'
          : 'bg-yellow-100 border-yellow-300'
      } ${
        isDragging
          ? 'opacity-0 pointer-events-none shadow-none'
          : isCardDrag 
            ? 'touch-none cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-300 shadow-md' 
            : isCompleted ? 'hover:bg-emerald-100' : 'hover:bg-yellow-200'
      }`}
    >
      {!isCardDrag && (
        <div 
          {...attributes}
          {...listeners}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`hidden md:block cursor-grab active:cursor-grabbing font-bold px-0.5 text-xs select-none ${
            isCompleted ? 'text-emerald-500' : 'text-yellow-500'
          }`}
        >
          ⠿
        </div>
      )}

      <div 
        className={`flex-1 min-w-0 ${isCardDrag ? '' : 'cursor-pointer'}`} 
        onClick={(e) => { 
          if (isCardDrag) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation(); 
          setEditingMemo(memo);
        }}
      >
        <div className={`font-bold border-b mb-0.5 flex items-center justify-between gap-1 ${
          isCompleted ? 'border-emerald-200 text-emerald-900' : 'border-yellow-300/60 text-gray-900'
        }`}>
          <span>{memo.time}</span>
          {isCompleted && (
            <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0 shadow-xs">
              ✓ 完了
            </span>
          )}
        </div>
        {formattedDate && (
          <div className={`text-[11px] mb-0.5 ${isCompleted ? 'text-emerald-700' : 'text-gray-600'}`}>
            実施予定：{formattedDate}
          </div>
        )}
        <div className={`truncate font-medium ${
          isCompleted ? 'line-through text-gray-400 font-normal' : 'text-gray-800'
        }`}>
          {memo.text}
        </div>
      </div>
    </div>
  );
};