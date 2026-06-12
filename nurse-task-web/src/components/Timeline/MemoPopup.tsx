// components/MemoPopup.tsx
import { useState, useEffect } from 'react';
import type { Memo } from '../../types/types'; // 型定義は共通ファイルに移動すると管理が楽です

interface MemoPopupProps {
  editingMemo: Memo | null;
  activeMemoTime: string | null;
  onClose: () => void;
  onSave: (memo: Memo) => void;
  onDelete: (id: string) => void;
}

export const MemoPopup = ({ editingMemo, activeMemoTime, onClose, onSave, onDelete }: MemoPopupProps) => {
  const [text, setText] = useState(editingMemo?.text || "");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">
          {editingMemo ? 'メモの編集' : 'メモの追加'}
        </h2>
        <textarea
          className="w-full h-24 p-3 border rounded-lg mb-4"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-3">
          {editingMemo && (
            <button className="px-4 py-2 bg-red-100 text-red-600 rounded-lg" onClick={() => onDelete(editingMemo.id)}>削除</button>
          )}
          <button className="flex-1 py-2.5 bg-gray-100 rounded-lg" onClick={onClose}>キャンセル</button>
          <button 
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg"
            onClick={() => onSave({ 
              id: editingMemo?.id || Date.now().toString(), 
              time: editingMemo?.time || activeMemoTime!, 
              text 
            })}
          >保存</button>
        </div>
      </div>
    </div>
  );
};