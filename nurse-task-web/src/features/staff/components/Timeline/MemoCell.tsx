import React from 'react';
import type { Memo } from '../../../../types/types';
import { useDraggable } from '@dnd-kit/core';
import { useTimelineStore } from '../../../../stores/useTimelineStore';

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
  const isRed = memo.priority === 'red' || Boolean(memo.is_anchor);
  const isHigh = memo.priority === 'high';

  const cardBgClass = isCompleted
    ? '!bg-emerald-50 !border-emerald-300 !text-emerald-900'
    : isRed
      ? '!bg-rose-100 !border-rose-400 !text-rose-950 ring-2 ring-rose-400 shadow-md'
      : isHigh
        ? '!bg-amber-100 !border-amber-400 !text-amber-950 ring-1 ring-amber-300'
        : '!bg-yellow-100 !border-yellow-300 !text-gray-900';

  const customStyle: React.CSSProperties = {
    touchAction: 'none',
    ...(isRed && !isCompleted
      ? { backgroundColor: '#ffe4e6', borderColor: '#f43f5e', color: '#881337' }
      : isHigh && !isCompleted
        ? { backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#78350f' }
        : {}),
  };

  return (
    <div 
      ref={setNodeRef}
      style={customStyle}
      {...(isCardDrag ? listeners : {})}
      {...(isCardDrag ? attributes : {})}
      className={`w-full text-[12px] p-1.5 rounded shadow-sm border mb-1 flex items-start gap-1 select-none transition-all ${cardBgClass} ${
        isDragging
          ? 'opacity-0 pointer-events-none shadow-none'
          : isCardDrag 
            ? 'touch-none cursor-grab active:cursor-grabbing border-amber-400 ring-2 ring-amber-300 shadow-md' 
            : isCompleted
              ? 'hover:!bg-emerald-100'
              : isRed
                ? 'hover:!bg-rose-200'
                : isHigh
                  ? 'hover:!bg-amber-200'
                  : 'hover:!bg-yellow-200'
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
            isCompleted ? '!text-emerald-500' : isRed ? '!text-rose-600' : isHigh ? '!text-amber-600' : '!text-yellow-500'
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
          isCompleted 
            ? '!border-emerald-200 !text-emerald-900' 
            : isRed 
              ? '!border-rose-300 !text-rose-950' 
              : isHigh 
                ? '!border-amber-300 !text-amber-950' 
                : '!border-yellow-300/60 !text-gray-900'
        }`}>
          <div className="flex items-center gap-1">
            {isRed && <span className="animate-pulse">🚨</span>}
            {isHigh && <span>⚠️</span>}
            <span>{memo.time}</span>
            {isRed && (
              <span className=" !bg-rose-600 !text-white !font-extrabold !px-1.5 !py-0.2 !rounded-full !shrink-0 !shadow-xs">
                絶対約束
              </span>
            )}
            {isHigh && (
              <span className=" !bg-amber-500 !text-white !font-extrabold !px-1.5 !py-0.2 !rounded-full !shrink-0 !shadow-xs">
                優先
              </span>
            )}
          </div>
          {isCompleted && (
            <span className="text-[10px] !bg-emerald-600 !text-white !font-extrabold !px-1.5 !py-0.2 !rounded-full !flex !items-center !gap-0.5 !shrink-0 !shadow-xs">
              ✓ 完了
            </span>
          )}
        </div>
        {formattedDate && (
          <div className={`text-[11px] mb-0.5 ${
            isCompleted ? '!text-emerald-700' : isRed ? '!text-rose-800' : '!text-gray-600'
          }`}>
            実施予定：{formattedDate}
          </div>
        )}
        <div className={`truncate font-bold ${
          isCompleted ? 'line-through !text-gray-400 font-normal' : isRed ? '!text-rose-950' : '!text-gray-800'
        }`}>
          {memo.text}
        </div>
      </div>
    </div>
  );
};