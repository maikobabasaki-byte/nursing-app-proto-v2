import { useState } from 'react';
import type { Memo } from '../../types/types';

// 親から受け取るデータの型定義
interface MemoPopupProps {
  editingMemo: Memo | null; // 必要に応じて厳密な型を定義してください
  activeMemoTime: string | null;
  newMemoText: string;
  setNewMemoText: (text: string) => void;
  onSave: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const MemoPopup = ({ 
  editingMemo, activeMemoTime, newMemoText, setNewMemoText, 
  onSave, onDelete, onClose 
}: MemoPopupProps) => {
  
  // 編集時のローカルな状態管理（必要に応じて）
  const [editingText, setEditingText] = useState(editingMemo?.text || "");

  const [scheduledAt, setScheduledAt] = useState(editingMemo?.scheduledAt || "");

  return (
    <div className="fixed inset-0 !bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-200 p-6 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2 className="!text-lg !font-bold !mb-4 !border-b !pb-2">
          {editingMemo ? 'メモの編集' : 'メモの追加'}
        </h2>

        {/* タイムライン時間入力 */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-600 mb-1">タイムライン時間：</label>
          <input 
            type="time" 
            defaultValue={editingMemo ? editingMemo.time : activeMemoTime!}
            disabled={!editingMemo}
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 !disabled:bg-gray-100 focus:!ring-2 focus:!ring-blue-400 !outline-none"
          />
        </div>

        {/* 実施予定日時（カレンダー＋時間） */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-600 mb-1">実施予定日時：</label>
          <input 
            type="datetime-local" 
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 !text-sm focus:!ring-2 focus:!ring-blue-400 !outline-none"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* メモ内容 */}
        <div className="mb-6">
          <textarea
            className="w-full !h-24 !p-3 !bg-gray-50 !border !rounded-lg focus:!ring-2 focus:!ring-blue-400 !outline-none"
            placeholder="メモ内容を入力..."
            value={editingMemo ? editingMemo.text : newMemoText}
            onChange={(e) => editingMemo ? /* ここは親のStateを直接更新するか、onSaveに含める */ null : setNewMemoText(e.target.value)}
          />
        </div>

        {/* ボタンエリア */}
        <div className="flex gap-3">
          {editingMemo && (
            <button 
              className="flex justify-center !px-4 !py-2 !bg-red-100 !text-red-600 !rounded-lg !font-bold" 
              onClick={() => onDelete(editingMemo.id)}
            >
              削除
            </button>
          )}
          
          <button 
            className="!flex-1 flex justify-center !py-2.5 !bg-gray-100 hover:!bg-gray-200 !rounded-lg !font-bold" 
            onClick={onClose}
          >
            キャンセル
          </button>
          
          <button 
            className="!flex-1 flex justify-center !py-2.5 !bg-blue-600 hover:!bg-blue-700 !text-white !rounded-lg !font-bold"
            onClick={() => {
              // 編集時と新規作成時で統一したオブジェクトを作成
              const memoToSave = editingMemo 
                ? { ...editingMemo, text: editingMemo.text, scheduledAt: scheduledAt } // 編集時は現在の内容を維持しつつ日時を更新
                : { 
                    id: Date.now().toString(), 
                    time: activeMemoTime || "", 
                    text: newMemoText, 
                    scheduledAt: scheduledAt // ✨ ここで必須項目を追加
                  };
              
              onSave(memoToSave);
            }}
          >
            {editingMemo ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
};