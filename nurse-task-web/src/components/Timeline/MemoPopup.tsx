import { useState, useEffect } from 'react'; // ★ useEffect を追加
import { useTimelineStore } from '../../stores/useTimelineStore';

export const MemoPopup = () => {
  // 🎯 ストアから状態とアクションをすべて一本釣り
  const editingMemo = useTimelineStore((state) => state.editingMemo);
  const activeMemoTime = useTimelineStore((state) => state.activeMemoTime);
  const newMemoText = useTimelineStore((state) => state.newMemoText);
  
  const setNewMemoText = useTimelineStore((state) => state.setNewMemoText);
  const handleSaveMemo = useTimelineStore((state) => state.handleSaveMemo);
  const handleDeleteMemo = useTimelineStore((state) => state.handleDeleteMemo);
  const closeMemoPopup = useTimelineStore((state) => state.closeMemoPopup);
  
  // ⚡ 解決策：ポップアップが開いたタイミングで、ローカル状態を確実にリセット・同期する！
  const [editingText, setEditingText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [memoTime, setMemoTime] = useState("");

  useEffect(() => {
    if (editingMemo) {
      setEditingText(editingMemo.text);
      setScheduledAt(editingMemo.scheduledAt || "");
      setMemoTime(editingMemo.time);
    } else {
      setEditingText("");
      setScheduledAt("");
      setMemoTime(activeMemoTime || "");
    }
  }, [editingMemo, activeMemoTime]); // 開く対象が変わったら強制同期

  return (
    <div className="fixed inset-0 !bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-yellow-200 p-6 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2 className="!text-lg !font-bold !mb-4 !border-b !pb-2 text-gray-800">
          {editingMemo ? 'メモの編集' : 'メモの追加'}
        </h2>

        {/* タイムライン時間入力 */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-600 mb-1">タイムライン時間：</label>
          <input 
            type="time" 
            value={memoTime}
            onChange={(e) => setMemoTime(e.target.value)}
            disabled={!editingMemo} // 新規時は行クリック時間で固定、編集時は必要なら変更可能に
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 disabled:!bg-gray-100 disabled:!text-gray-500 focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
          />
        </div>

        {/* 実施予定日時（カレンダー＋時間） */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-600 mb-1">実施予定日時：</label>
          <input 
            type="datetime-local" 
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 !text-sm focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* メモ内容 */}
        <div className="mb-6">
          <textarea
            className="w-full !h-24 !p-3 !bg-gray-50 !border !rounded-lg focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
            placeholder="メモ内容を入力..."
            value={editingMemo ? editingText : newMemoText}
            onChange={(e) => editingMemo ? setEditingText(e.target.value) : setNewMemoText(e.target.value)}
          />
        </div>

        {/* ボタンエリア */}
        <div className="flex gap-3">
          {editingMemo && (
            <button 
              type="button"
              className="flex justify-center !px-4 !py-2 !bg-red-100 hover:!bg-red-200 !text-red-600 !rounded-lg !font-bold cursor-pointer transition-colors" 
              onClick={() => handleDeleteMemo(editingMemo.id)}
            >
              削除
            </button>
          )}
          
          <button 
            type="button"
            className="!flex-1 flex justify-center !py-2.5 !bg-gray-100 hover:!bg-gray-200 !text-gray-700 !rounded-lg !font-bold cursor-pointer transition-colors" 
            onClick={closeMemoPopup}
          >
            キャンセル
          </button>
          
          <button 
            type="button"
            className="!flex-1 flex justify-center !py-2.5 !bg-blue-600 hover:!bg-blue-700 !text-white !rounded-lg !font-bold cursor-pointer transition-colors"
            onClick={() => {
              const memoToSave = editingMemo 
                ? { ...editingMemo, time: memoTime, text: editingText, scheduledAt: scheduledAt }
                : { 
                    id: Date.now().toString(), 
                    time: memoTime, 
                    text: newMemoText, 
                    scheduledAt: scheduledAt 
                  };
              
              handleSaveMemo(memoToSave);
            }}
          >
            {editingMemo ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
};