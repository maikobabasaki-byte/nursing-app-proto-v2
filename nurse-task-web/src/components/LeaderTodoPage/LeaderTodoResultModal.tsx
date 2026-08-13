import React, { useState } from 'react';
import type { LeaderTodo } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface Props {
  todo: LeaderTodo;
  onClose: () => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: LeaderTodo['status']; label: string }[] = [
  { value: 'completed', label: '🟢 実施完了（対応・記録完了で右画面へ移動）' },
  { value: 'in_progress', label: '🔵 進行中（現在対応・調整中）' },
  { value: 'pending', label: '🟣 要保留・確認（指示・結果待ち）' },
  { value: 'untouched', label: '⚪️ 未実施（対応着手前）' },
];

export const LeaderTodoResultModal: React.FC<Props> = ({ todo, onClose, onSuccess }) => {
  const updateLeaderTodo = useTimelineStore((state) => state.updateLeaderTodo);
  const currentUser = useTimelineStore((state) => state.currentUser);

  const [status, setStatus] = useState<LeaderTodo['status']>(
    todo.status === 'untouched' ? 'completed' : todo.status
  );
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [resultOutcome, setResultOutcome] = useState<string>(todo.result_outcome || '');
  const [doctorInstructions, setDoctorInstructions] = useState<string>(todo.doctor_instructions || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateLeaderTodo(todo.todo_id, {
        status,
        result_outcome: resultOutcome.trim(),
        doctor_instructions: doctorInstructions.trim(),
        updated_by: currentUser?.name || 'リーダー',
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('対応結果の保存エラー:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 w-[94vw] sm:w-full sm:max-w-lg max-h-[92vh] overflow-hidden animate-fade-in flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <div>
              <h2 className="font-black text-base sm:text-lg leading-tight">TODO対応結果 ＆ 方向性記録</h2>
              <p className="text-[10px] sm:text-[11px] text-indigo-200">対応完了ステートへの更新・結果方針の登録</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 flex flex-col gap-4 overflow-y-auto">
          {/* 対象TODO概要カード */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950">
                🏥 {todo.patient_name} 様 ({todo.room_id}号室)
              </span>
              <span className="text-[11px] font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-xs">
                ⏰ {todo.scheduled_at || '随時'}
              </span>
            </div>
            <div className="text-xs font-bold text-gray-800 bg-white/70 p-2 rounded-lg border border-indigo-100/60">
              📌 {todo.title}
            </div>
          </div>

          {/* 実施ステータス選択 */}
          <div className="relative">
            <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
              <span>⚡️ 実施ステータス</span>
              <span className="text-red-500">*</span>
            </label>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="w-full bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 flex items-center justify-between transition-all shadow-xs text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="truncate pr-2">
                {STATUS_OPTIONS.find((s) => s.value === status)?.label || status}
              </span>
              <span className={`text-[10px] text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* 🎯 浮動ドロップダウンメニュー枠（親要素の幅を超えない w-full max-w-full left-0 right-0 ＆ 複数行折り返し whitespace-normal break-words） */}
            {isStatusOpen && (
              <>
                <div className="fixed inset-0 z-[101]" onClick={() => setIsStatusOpen(false)} />
                <ul className="absolute left-0 right-0 top-full mt-1.5 w-full max-w-full bg-white border border-indigo-200 rounded-xl shadow-xl z-[102] max-h-56 overflow-y-auto py-1 animate-fade-in list-none p-0 m-0">
                  {STATUS_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => {
                          setStatus(opt.value);
                          setIsStatusOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-normal break-words leading-relaxed border-b border-gray-100 last:border-none flex items-center justify-between ${
                          status === opt.value
                            ? 'bg-indigo-50 text-indigo-900 font-extrabold'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="whitespace-normal break-words">{opt.label}</span>
                        {status === opt.value && <span className="text-indigo-600 font-black ml-1 shrink-0">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* 方向性（方針）入力フォーム */}
          <div>
            <label className="block text-xs font-black text-gray-800 mb-1">
              どのような方向性（方針）になったか
            </label>
            <textarea
              rows={4}
              placeholder="例: 主治医相談の結果、明日朝より降圧剤を1錠追加変更。ICはご家族到着を待って15時開始決定。"
              value={resultOutcome}
              onChange={(e) => setResultOutcome(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* 医師指示・申し送りメモ */}
          <div>
            <label className="block text-xs font-black text-gray-800 mb-1">
              医師からの指示・補足申し送りメモ
            </label>
            <textarea
              rows={3}
              placeholder="例: Dr.佐藤より指示あり。SpO2 93%未満の場合は酸素1L開始のこと。"
              value={doctorInstructions}
              onChange={(e) => setDoctorInstructions(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* フッターアクションボタン */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="!bg-indigo-700 hover:!bg-indigo-800 disabled:!opacity-50 !text-white !font-extrabold !text-xs !px-5 !py-2.5 !rounded-lg !shadow-md hover:!shadow-lg !transition-all !cursor-pointer !flex !items-center !gap-1.5"
            >
              <span>{isSubmitting ? '保存中...' : '対応結果を保存する'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
