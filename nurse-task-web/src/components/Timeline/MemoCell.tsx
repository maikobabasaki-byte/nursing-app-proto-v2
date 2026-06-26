// ⭕ MemoCell.tsx を Sortable 仕様に書き換え
import type { Memo } from '../../types/types';
import { useSortable } from '@dnd-kit/sortable'; // 🔥 useDraggable から変更
import { CSS } from '@dnd-kit/utilities';

interface MemoCellProps {
  memo: Memo;
  onEdit: (memo: Memo) => void;
}

export const MemoCell = ({ memo, onEdit }: MemoCellProps) => {
  // 🔥 useSortable に変更
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: memo.id, 
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

  return (
    <div 
        ref={setNodeRef}
        style={{
            ...style,
            touchAction: 'none'
        }}
        {...attributes}
        {...listeners}
        onPointerDown={(e) => {
    console.log("① ポインター押した");
  }}
  onPointerMove={(e) => {
    console.log("② ポインター動かした");
  }}
  onPointerUp={(e) => {
    console.log("③ ポインター離した");
  }}
        className="w-full text-[12px] bg-yellow-100 p-1.5 rounded shadow-sm border border-yellow-300 mb-1 flex items-start gap-1 select-none hover:bg-yellow-200 transition-colors"
        >
        {/* ⠿ ハンドルを掴んで移動 */}
        <div className="cursor-grab active:cursor-grabbing text-yellow-500 font-bold px-0.5 text-xs">
            ⠿
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(memo); }}>
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