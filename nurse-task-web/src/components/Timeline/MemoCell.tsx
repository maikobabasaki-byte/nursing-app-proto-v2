import React from 'react';
import type { Memo } from '../../types/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTimelineStore } from '../../stores/useTimelineStore'; // ★追加

interface MemoCellProps {
  memo: Memo;
}

export const MemoCell = ({ memo }: MemoCellProps) => {
  // 🎯 ストアから、メモ編集ポップアップを開くためのアクションを一本釣り
  const setEditingMemo = useTimelineStore((state) => state.setEditingMemo);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `memo-${memo.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dateObj = memo.scheduledAt ? new Date(memo.scheduledAt) : null;
  const formattedDate = dateObj && !isNaN(dateObj.getTime()) 
        ? `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
        : null;

  // 💡 あなたが実装したポインターイベントのマージ関数（そのまま完全流用）
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
      style={{
        ...style,
        touchAction: 'none'
      }}
      className="w-full text-[12px] bg-yellow-100 p-1.5 rounded shadow-sm border border-yellow-300 mb-1 flex items-start gap-1 select-none hover:bg-yellow-200 transition-colors"
    >
      {/* ⠿ ハンドル部分 */}
      <div 
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="cursor-grab active:cursor-grabbing text-yellow-500 font-bold px-0.5 text-xs select-none"
      >
        ⠿
      </div>

      {/* 💡 クリックで直接ストアの編集用ステートへこのメモを叩き込む */}
      <div 
        className="flex-1 min-w-0 cursor-pointer" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setEditingMemo(memo); // ⚡親を経由せず、直接エディタを起動！
        }}
      >
        <div className="font-bold border-b border-yellow-300/60 mb-0.5">{memo.time}</div>
        {formattedDate && (
          <div className="text-[12px] text-gray-600 mb-0.5">
            実施予定：{formattedDate}
          </div>
        )}
        <div className="truncate font-medium text-gray-800">{memo.text}</div>
      </div>
    </div>
  );
};