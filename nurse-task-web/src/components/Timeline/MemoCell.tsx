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
    console.log("🖐️ MemoCell: ポインターダウン検知！");
  }}
  onDragStart={(e) => {
    console.log("🚫 ブラウザのデフォルトドラッグ検知！");
    e.preventDefault();
  }}
        className="w-full text-[10px] bg-yellow-100 p-1.5 rounded shadow-sm border border-yellow-300 mb-1 flex items-start gap-1 select-none hover:bg-yellow-200 transition-colors"
        >
        {/* ⠿ ハンドルを掴んで移動 */}
        <div className="cursor-grab active:cursor-grabbing text-yellow-500 font-bold px-0.5 text-xs">
            ⠿
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(memo); }}>
            <div className="font-bold border-b border-yellow-300/60 mb-0.5">{memo.time}</div>
            <div className="truncate font-medium text-gray-800">{memo.text}</div>
        </div>
        </div>
    );
    };