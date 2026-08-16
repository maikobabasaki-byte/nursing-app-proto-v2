import { useState, useEffect } from 'react'; // ★ useEffect を追加
import { useTimelineStore } from '../../stores/useTimelineStore';
import { CharCounter } from '../CharCounter';

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
  const [targetRoomId, setTargetRoomId] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [roomOptions, setRoomOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const candidatePaths = [
      `/app/data/rooms.json`,
      `${import.meta.env.BASE_URL || '/app/'}data/rooms.json`.replace(/\/+/g, '/'),
      `/data/rooms.json`,
    ];
    const loadData = async () => {
      for (const path of candidatePaths) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const data = await res.json();
            const options: { id: string; name: string }[] = [];
            if (data.rooms) {
              data.rooms.forEach((r: any) => options.push({ id: r.room_id, name: r.name || `${r.room_id}号室` }));
            }
            if (data.facilities) {
              data.facilities.forEach((f: any) => options.push({ id: f.room_id, name: f.name }));
            }
            setRoomOptions(options);
            return;
          }
        } catch (e) {}
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (editingMemo) {
      setEditingText(editingMemo.text);
      setScheduledAt(editingMemo.scheduledAt || "");
      setMemoTime(editingMemo.time);
      setTargetRoomId(editingMemo.target_room_id || "");
      setIsCompleted(!!editingMemo.is_completed);
    } else {
      setEditingText("");
      setScheduledAt("");
      setMemoTime(activeMemoTime || "");
      setTargetRoomId("");
      setIsCompleted(false);
    }
  }, [editingMemo, activeMemoTime]); // 開く対象が変わったら強制同期

  const currentText = editingMemo ? editingText : newMemoText;

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
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800 font-bold cursor-pointer"
          />
        </div>

        {/* 紐づけ部屋選択 */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-600 mb-1">📍 対象の部屋/施設（通知用）：</label>
          <select
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
            className="w-full !p-2 !border !rounded-lg !bg-gray-50 !text-sm focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
          >
            <option value="">-- 部屋を指定しない --</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
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
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700">メモ内容：</label>
            <CharCounter current={currentText.length} max={200} />
          </div>
          <textarea
            maxLength={200}
            className="w-full !h-24 !p-3 !bg-gray-50 !border !rounded-lg focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
            placeholder="メモ内容を入力... (例: 手袋補充)"
            value={currentText}
            onChange={(e) => editingMemo ? setEditingText(e.target.value) : setNewMemoText(e.target.value)}
          />
        </div>

        {/* 完了フラグ */}
        <div className="mb-6 flex items-center gap-2">
          <input 
            type="checkbox"
            id="memo-completed"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="memo-completed" className="text-sm font-bold text-gray-700 cursor-pointer">
            完了済みにする
          </label>
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
              const textToSave = editingMemo ? editingText : newMemoText;
              if (!textToSave.trim()) {
                alert("⚠️ メモ内容を入力してください。");
                return;
              }
              if (textToSave.trim().length > 200) {
                alert("⚠️ メモ内容は200文字以内で入力してください。");
                return;
              }
              const memoToSave = editingMemo 
                ? { 
                    ...editingMemo, 
                    time: memoTime, 
                    text: textToSave.trim(), 
                    scheduledAt: scheduledAt,
                    target_room_id: targetRoomId || undefined,
                    is_completed: isCompleted
                  }
                : { 
                    id: Date.now().toString(), 
                    time: memoTime, 
                    text: textToSave.trim(), 
                    scheduledAt: scheduledAt,
                    target_room_id: targetRoomId || undefined,
                    is_completed: isCompleted
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