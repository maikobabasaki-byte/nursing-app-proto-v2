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

  return (
    <div 
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      {...(isCardDrag ? listeners : {})}
      {...(isCardDrag ? attributes : {})}
      className={`w-full text-[12px] bg-yellow-100 p-1.5 rounded shadow-sm border border-yellow-300 mb-1 flex items-start gap-1 select-none ${
        isDragging
          ? 'opacity-0 pointer-events-none shadow-none'
          : isCardDrag 
            ? 'touch-none cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-300 shadow-md' 
            : 'hover:bg-yellow-200'
      }`}
    >
      {!isCardDrag && (
        <div 
          {...attributes}
          {...listeners}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="hidden md:block cursor-grab active:cursor-grabbing text-yellow-500 font-bold px-0.5 text-xs select-none"
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
        <div className="font-bold border-b border-yellow-300/60 mb-0.5">{memo.time}</div>
        {formattedDate && (
          <div className="text-[11px] text-gray-600 mb-0.5">
            実施予定：{formattedDate}
          </div>
        )}
        <div className="truncate font-medium text-gray-800">{memo.text}</div>
      </div>
    </div>
  );
};