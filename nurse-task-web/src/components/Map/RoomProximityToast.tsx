import React from 'react';
import type { NotificationToastItem } from '../../hooks/useRoomProximityNotification';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface Props {
  toasts: NotificationToastItem[];
  onDismiss: (id: string) => void;
}

export const RoomProximityToast: React.FC<Props> = ({ toasts, onDismiss }) => {
  const handleSaveMemo = useTimelineStore((state) => state.handleSaveMemo);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-[999999] flex flex-col gap-4 max-w-md w-[420px] pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-5 rounded-2xl shadow-2xl ring-4 ring-amber-300/50 border-2 border-amber-600/60 flex flex-col gap-3 transition-all duration-300 relative animate-fade-in"
        >
          {/* ヘッダーエリア */}
          <div className="flex items-start justify-between border-b border-white/20 pb-3 pr-8">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl animate-bounce drop-shadow">📍</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-950/40 text-amber-100 text-[11px] font-black px-2 py-0.5 rounded tracking-wide border border-amber-300/30">
                    エリア接近検知
                  </span>
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    未完了 {toast.memoCount} 件
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-wide text-white mt-1 drop-shadow-sm">
                  {toast.roomName} に到着・接近中
                </h3>
              </div>
            </div>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
              title="通知を閉じる"
            >
              ✕
            </button>
          </div>

          <p className="text-xs font-extrabold text-amber-100 flex items-center gap-1.5">
            <span>📌</span>
            <span>この場所に関する伝言・注意事項があります：</span>
          </p>

          {/* メモ一覧カードリスト */}
          <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
            {toast.memos.map((memo) => (
              <div
                key={memo.id}
                className="bg-white text-slate-800 p-3.5 rounded-xl border border-amber-200/80 shadow-md hover:shadow-lg transition-shadow flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    🕒 {memo.time || '指定なし'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {memo.target_room_id ? `${memo.target_room_id}号室` : '全体メモ'}
                  </span>
                </div>

                <div className="text-sm font-black text-slate-900 leading-snug bg-amber-50/60 p-2.5 rounded-lg border border-amber-100/80">
                  💬 「 {memo.text} 」
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveMemo({ ...memo, is_completed: true });
                    }}
                    className="!bg-emerald-600 hover:!bg-emerald-700 active:!bg-emerald-800 !text-white !font-bold !text-xs !px-4 !py-1.5 !rounded-lg !shadow hover:!shadow-md !transition-all !flex !items-center !gap-1.5 !cursor-pointer"
                  >
                    <span>✓ 伝言・メモを完了する</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
