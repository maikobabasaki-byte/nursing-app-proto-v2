import React, { useState } from 'react';
import type { ExtendedTask } from '../../types/types';

interface UnexecutedReasonModalProps {
  task: ExtendedTask;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const REASON_OPTIONS = [
  '患者拒否',
  '状態変化・体調不良',
  'ドクターストップ・指示変更',
  '他検査・処置と重複',
  'その他',
];

export const UnexecutedReasonModal: React.FC<UnexecutedReasonModalProps> = ({
  task,
  onConfirm,
  onClose,
}) => {
  // 💡 モーダルが開くたびに初期化された状態で表示される
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customDetail, setCustomDetail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isOther = selectedCategory === 'その他';

  // バリデーション: プルダウン必須 + 「その他」の場合は詳細も必須
  const isValid = selectedCategory !== '' && (!isOther || customDetail.trim() !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) {
      setErrorMessage('未実施の理由を選択してください。');
      return;
    }
    if (isOther && !customDetail.trim()) {
      setErrorMessage('「その他」を選択した場合は詳細を入力してください。');
      return;
    }

    // 最終的な理由文字列を組み立て
    const finalReason = isOther
      ? customDetail.trim()
      : customDetail.trim()
        ? `${selectedCategory} - ${customDetail.trim()}`
        : selectedCategory;

    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-red-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600 font-black text-lg">
            <span>⚠️</span>
            <span>未実施の理由を入力</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* タスク概要 */}
        <div className="bg-red-50/50 border border-red-100 rounded-lg p-3 mb-4 text-left">
          <div className="text-xs text-gray-500 font-bold">
            {task.room_id}号室 {task.patient_name} 様
          </div>
          <div className="text-sm font-black text-gray-800 mt-0.5">
            {task.title}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* プルダウン選択 (必須) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              未実施の理由を選択 <span className="text-red-500">* 必須</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setErrorMessage('');
              }}
              required
              className="w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none cursor-pointer transition-all"
            >
              <option value="">-- 理由を選択してください --</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* 詳細・備考エリア（「その他」の場合は必須） */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              詳細・備考メモ{isOther ? <span className="text-red-500"> * 必須</span> : '（任意）'}
            </label>
            <textarea
              value={customDetail}
              onChange={(e) => {
                setCustomDetail(e.target.value);
                setErrorMessage('');
              }}
              placeholder={isOther ? '具体的な理由を入力してください' : '補足メモがあれば入力してください'}
              rows={3}
              className={`w-full p-2.5 text-sm border rounded-lg outline-none transition-all resize-none ${
                isOther
                  ? 'border-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                  : 'border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-400'
              }`}
            />
          </div>

          {/* エラーメッセージ */}
          {errorMessage && (
            <div className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* ボタンエリア */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-sm cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`!flex-1 !flex !justify-center !py-2.5 !font-bold !rounded-lg !transition-all !text-sm ${
                isValid
                  ? '!bg-blue-600 hover:!bg-blue-700 !text-white !shadow-md !cursor-pointer'
                  : '!bg-gray-300 !text-gray-500 !cursor-not-allowed'
              }`}
            >
              確定して未実施にする
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
