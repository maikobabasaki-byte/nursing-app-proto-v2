import type { Memo } from '../../types/types';
import { useDraggable } from '@dnd-kit/core'; // 追加
import { CSS } from '@dnd-kit/utilities';    // 追加

interface MemoCellProps {
  memo: Memo;
  onEdit: (memo: Memo) => void;
}

export const MemoCell = ({ memo, onEdit }: MemoCellProps) => {
    // ドラッグの準備（IDを割り当てるのがポイント！）
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: memo.id, 
    });

    // 移動のスタイルを作成
    const style = {
        transform: CSS.Translate.toString(transform),
    };
    // 1. 日付のフォーマット処理 (mapの外に出しました)
    const dateObj = memo.scheduledAt ? new Date(memo.scheduledAt) : null;
    const formattedDate = dateObj && !isNaN(dateObj.getTime()) 
        ? `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
        : null;

  return (
    <div 
      ref={setNodeRef}           // ドラッグ開始点を指定
      style={style}              // スタイルを適用
      {...listeners}             // ドラッグイベントを紐付け
      {...attributes}            // 属性を付与
      className="... (既存のクラス)"
      onClick={() => onEdit(memo)}
    >
        <div 
        className="text-[10px] bg-yellow-200 p-1 rounded shadow-sm border border-yellow-300 mb-1 cursor-pointer hover:bg-yellow-300 transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            onEdit(memo);
        }}
        >
        <div className="font-bold border-b border-yellow-400/50 mb-0.5">
            {memo.time}
        </div>
        
        {formattedDate && (
            <div className="text-[9px] text-gray-600 mb-0.5">
            実施予定：{formattedDate}
            </div>
        )}
        
        <div className="truncate">{memo.text}</div>
        </div>
    </div>
  );
};