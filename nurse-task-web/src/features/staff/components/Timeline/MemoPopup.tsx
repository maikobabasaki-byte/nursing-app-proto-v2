import { useState, useEffect } from 'react'; // ★ useEffect を追加
import { useTimelineStore } from '../../../../stores/useTimelineStore';
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
  const currentUser = useTimelineStore((state) => state.currentUser);
  
  // ⚡ 解決策：ポップアップが開いたタイミングで、ローカル状態を確実にリセット・同期する！
  const [editingText, setEditingText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [memoTime, setMemoTime] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [priority, setPriority] = useState<'red' | 'high' | 'medium' | 'low'>('medium');
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
      setPriority(editingMemo.priority || 'medium');
    } else {
      setEditingText("");
      setScheduledAt("");
      setMemoTime(activeMemoTime || "");
      setTargetRoomId("");
      setIsCompleted(false);
      setPriority('medium');
    }
  }, [editingMemo, activeMemoTime]); // 開く対象が変わったら強制同期

  const currentText = editingMemo ? editingText : newMemoText;

  return (
    <div className="fixed inset-0 !bg-black/60 flex items-center justify-center z-50 p-3">
      <div className="bg-yellow-200 p-4 sm:p-5 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="!text-base sm:!text-lg !font-bold !mb-2.5 !border-b !pb-1.5 text-gray-800">
          {editingMemo ? 'メモの編集' : 'メモの追加'}
        </h2>

        {/* 優先度・メモ種別選択 */}
        <div className="mb-2.5">
          <label className="block text-xs font-bold text-gray-700 mb-1">優先度・約束種別：</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPriority('red')}
              className={`!py-1 !px-1.5 !rounded-lg !text-xs !font-bold !border !flex !items-center !justify-center !gap-1 !transition-all ${
                priority === 'red'
                  ? '!bg-rose-600 !text-white !border-rose-700 shadow-md ring-2 ring-rose-400'
                  : '!bg-white !text-rose-700 !border-rose-300 hover:!bg-rose-50'
              }`}
            >
              🚨 レッドメモ
            </button>
            <button
              type="button"
              onClick={() => setPriority('high')}
              className={`!py-1 !px-1.5 !rounded-lg !text-xs !font-bold !border !flex !items-center !justify-center !gap-1 !transition-all ${
                priority === 'high'
                  ? '!bg-amber-500 !text-white !border-amber-600 shadow-md ring-2 ring-amber-300'
                  : '!bg-white !text-amber-700 !border-amber-300 hover:!bg-amber-50'
              }`}
            >
              ⚠️ 優先
            </button>
            <button
              type="button"
              onClick={() => setPriority('medium')}
              className={`!py-1 !px-1.5 !rounded-lg !text-xs !font-bold !border !flex !items-center !justify-center !gap-1 !transition-all ${
                priority === 'medium' || priority === 'low'
                  ? '!bg-gray-700 !text-white !border-gray-800 shadow'
                  : '!bg-white !text-gray-700 !border-gray-300 hover:!bg-gray-50'
              }`}
            >
              通常
            </button>
          </div>
        </div>

        {/* タイムライン時間入力 */}
        <div className="mb-2.5">
          <label className="block text-xs font-bold text-gray-600 mb-0.5">タイムライン時間：</label>
          <input 
            type="time" 
            value={memoTime}
            onChange={(e) => setMemoTime(e.target.value)}
            className="w-full !p-1.5 !border !rounded-lg !bg-gray-50 focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800 font-bold text-xs cursor-pointer"
          />
        </div>

        {/* 紐づけ部屋選択 */}
        <div className="mb-2.5">
          <label className="block text-xs font-bold text-gray-600 mb-0.5">📍 対象の部屋/施設（通知用）：</label>
          <select
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
            className="w-full !p-1.5 !border !rounded-lg !bg-gray-50 !text-xs focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
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
        <div className="mb-2.5">
          <label className="block text-xs font-bold text-gray-600 mb-0.5">実施予定日時：</label>
          <input 
            type="datetime-local" 
            className="w-full !p-1.5 !border !rounded-lg !bg-gray-50 !text-xs focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* メモ内容 */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-xs font-bold text-gray-700">メモ内容：</label>
            <CharCounter current={currentText.length} max={200} />
          </div>
          <textarea
            maxLength={200}
            className="w-full !h-16 sm:!h-20 !p-2 !text-xs !bg-gray-50 !border !rounded-lg focus:!ring-2 focus:!ring-blue-400 !outline-none text-gray-800 resize-none"
            placeholder="メモ内容を入力... (例: 手袋補充)"
            value={currentText}
            onChange={(e) => editingMemo ? setEditingText(e.target.value) : setNewMemoText(e.target.value)}
          />
        </div>

        {/* 完了フラグ */}
        <div 
          onClick={() => setIsCompleted(!isCompleted)}
          className={`!mb-3 !flex !items-center !justify-between !p-2.5 !rounded-xl !border-2 !cursor-pointer !transition-all select-none ${
            isCompleted 
              ? '!bg-emerald-50 !border-emerald-500 !text-emerald-900 shadow-md' 
              : '!bg-white !border-gray-300 hover:!border-blue-400 !text-gray-800'
          }`}
        >
          <div className="!flex !items-center !gap-2.5">
            <div className={`!w-5 !h-5 !rounded-md !flex !items-center !justify-center !border-2 !transition-all ${
              isCompleted 
                ? '!bg-emerald-600 !border-emerald-600 !text-white' 
                : '!bg-gray-100 !border-gray-400'
            }`}>
              {isCompleted && (
                <svg className="!w-3.5 !h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <span className="!text-xs sm:!text-sm !font-black">
              完了済みにする
            </span>
          </div>

          <span className={`!text-[11px] !font-black !px-2 !py-0.5 !rounded-full ${
            isCompleted ? '!bg-emerald-600 !text-white' : '!bg-gray-200 !text-gray-600'
          }`}>
            {isCompleted ? '✓ 完了済み' : '未完了'}
          </span>
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
              const currentUserId = currentUser?.nurse_id || currentUser?.email || sessionStorage.getItem('nurse_id') || 'self';
              const isRed = priority === 'red';
              // 💡 優先度（red/high含め）に関わらず、メモは他ユーザーと共有せず個人のプライベート管理とする
              const memoToSave = editingMemo 
                ? { 
                    ...editingMemo, 
                    time: memoTime, 
                    text: textToSave.trim(), 
                    scheduledAt: scheduledAt,
                    target_room_id: targetRoomId || undefined,
                    is_completed: isCompleted,
                    priority: priority,
                    is_anchor: isRed,
                    created_by: editingMemo.created_by || currentUserId,
                  }
                : { 
                    id: Date.now().toString(), 
                    time: memoTime, 
                    text: textToSave.trim(), 
                    scheduledAt: scheduledAt,
                    target_room_id: targetRoomId || undefined,
                    is_completed: isCompleted,
                    priority: priority,
                    is_anchor: isRed,
                    created_by: currentUserId,
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