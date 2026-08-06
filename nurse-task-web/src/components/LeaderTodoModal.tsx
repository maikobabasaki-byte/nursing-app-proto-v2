import React, { useState } from 'react';
import type { LeaderTodo, LeaderTodoCategory, LeaderTodoPriority } from '../types/types';
import { useTimelineStore } from '../stores/useTimelineStore';

interface Props {
  patient?: {
    patient_id: string;
    name: string;
    room_id: string;
  };
  todoToEdit?: LeaderTodo;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export const LeaderTodoModal: React.FC<Props> = ({ patient, todoToEdit, onClose, onDeleteSuccess }) => {
  const addLeaderTodo = useTimelineStore((state) => state.addLeaderTodo);
  const updateLeaderTodo = useTimelineStore((state) => state.updateLeaderTodo);
  const deleteLeaderTodo = useTimelineStore((state) => state.deleteLeaderTodo);
  const currentUser = useTimelineStore((state) => state.currentUser);

  const isEditMode = Boolean(todoToEdit);

  const targetPatient = {
    patient_id: todoToEdit?.patient_id || patient?.patient_id || '',
    name: todoToEdit?.patient_name || patient?.name || '未設定患者',
    room_id: todoToEdit?.room_id || patient?.room_id || '未設定',
  };

  const isHandled = Boolean(
    todoToEdit && (todoToEdit.status === 'completed' || (todoToEdit.result_outcome && todoToEdit.result_outcome.trim() !== ''))
  );

  const [category, setCategory] = useState<LeaderTodoCategory>(todoToEdit?.category || '患者対応');
  const [priority, setPriority] = useState<LeaderTodoPriority>(todoToEdit?.priority || 'high');
  const [scheduledAt, setScheduledAt] = useState<string>(todoToEdit?.scheduled_at || '14:00');
  const [title, setTitle] = useState<string>(todoToEdit?.title || '');
  const [requiresDoubleCheck, setRequiresDoubleCheck] = useState<boolean>(todoToEdit?.requires_double_check || false);
  const [status] = useState<LeaderTodo['status']>(todoToEdit?.status || 'untouched');
  const [resultOutcome, setResultOutcome] = useState<string>(todoToEdit?.result_outcome || '');
  const [doctorInstructions, setDoctorInstructions] = useState<string>(todoToEdit?.doctor_instructions || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!todoToEdit) return;
    const confirmed = window.confirm('このTODOを削除（画面から非表示）にしてもよろしいですか？\n※データは履歴としてデータベース内に安全に保存・保持されます。');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteLeaderTodo(todoToEdit.todo_id);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      onClose();
    } catch (err) {
      console.error('TODO削除エラー:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isEditMode && todoToEdit) {
        await updateLeaderTodo(todoToEdit.todo_id, {
          ...(isHandled
            ? {}
            : {
                category,
                title: title.trim(),
                scheduled_at: scheduledAt,
                priority,
                requires_double_check: requiresDoubleCheck,
              }),
          status,
          result_outcome: resultOutcome.trim(),
          doctor_instructions: doctorInstructions.trim(),
          updated_by: currentUser?.name || 'リーダー',
        });
      } else {
        await addLeaderTodo({
          nurse_id: currentUser?.nurse_id || currentUser?.email || '',
          user_id: currentUser?.nurse_id || currentUser?.email || '',
          patient_id: targetPatient.patient_id,
          patient_name: targetPatient.name,
          room_id: targetPatient.room_id,
          category,
          title: title.trim(),
          scheduled_at: scheduledAt,
          priority,
          requires_double_check: requiresDoubleCheck,
          status: 'untouched',
          result_outcome: resultOutcome.trim(),
          doctor_instructions: doctorInstructions.trim(),
          updated_by: currentUser?.name || 'リーダー',
        });
      }
      onClose();
    } catch (err) {
      console.error('TODO保存エラー:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 max-w-lg w-full overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{isEditMode ? '✏️' : '📋'}</span>
            <h2 className="font-extrabold text-lg">{isEditMode ? 'リーダーTODO編集' : 'リーダーTODO新規作成'}</h2>
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
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* 対応済みロック警告バナー */}
          {isHandled && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-bold text-amber-900 flex items-start gap-2 shadow-xs">
              <span className="text-base">🔒</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-black text-amber-950">このTODOは【対応済み】です</span>
                <span className="text-[11px] font-medium text-amber-800 leading-normal">
                  タスクの基本プロパティ（件名・時間・カテゴリー等）は変更できません。下の「対応結果・方針記録」のみ編集・更新が可能です。
                </span>
              </div>
            </div>
          )}

          {/* 患者基本情報カード */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                対象患者
              </span>
              <div className="font-extrabold text-gray-900 text-base mt-1">
                {targetPatient.name} 様
              </div>
            </div>
            <div className="bg-white border border-indigo-200 px-3 py-1 rounded-lg text-xs font-extrabold text-indigo-900 shadow-sm">
              🏠 {targetPatient.room_id}号室
            </div>
          </div>

          {/* 大項目カテゴリー & 優先度 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
                <span>📂 大項目カテゴリー</span>
                {!isHandled && <span className="text-red-500">*</span>}
              </label>
              <select
                disabled={isHandled || isSubmitting}
                value={category}
                onChange={(e) => setCategory(e.target.value as LeaderTodoCategory)}
                className="w-full bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
              >
                <option value="患者対応">👤 患者対応（身体ケア・処置）</option>
                <option value="家族対応">👨‍👩‍👧 家族対応（説明・IC同席）</option>
                <option value="医師への連絡">🩺 医師への連絡（報告・指示確認）</option>
                <option value="検査・処置">💉 検査・処置（結果・搬送）</option>
                <option value="その他">📝 その他（申し送り・調整）</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
                <span>🔥 優先度</span>
                {!isHandled && <span className="text-red-500">*</span>}
              </label>
              <select
                disabled={isHandled || isSubmitting}
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeaderTodoPriority)}
                className="w-full bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
              >
                <option value="highest">🔴 最優先（至急・即時対応）</option>
                <option value="high">🟧 高（本日シフト内優先）</option>
                <option value="medium">🟨 中（通常時間内対応）</option>
                <option value="low">🟦 低（経過観察・随時）</option>
              </select>
            </div>
          </div>

          {/* 実施予定時刻 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              実施予定時間 {!isHandled && <span className="text-red-500">*</span>}
            </label>
            <input
              type="time"
              required={!isHandled}
              disabled={isHandled || isSubmitting}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-gray-300 rounded-lg p-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* TODO件名 / メモフォーム */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              TODO件名・具体内容 {!isHandled && <span className="text-red-500">*</span>}
            </label>
            <textarea
              required={!isHandled}
              disabled={isHandled || isSubmitting}
              rows={3}
              placeholder="例: IC同席後の経過観察および主治医指示確認メモ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 💡 ダブルチェック有無（操作可能なトグルカード） */}
          <div 
            onClick={() => !isHandled && setRequiresDoubleCheck(!requiresDoubleCheck)}
            className={`p-3.5 rounded-xl border transition-all select-none flex items-center justify-between ${
              isHandled
                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                : requiresDoubleCheck
                ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300 shadow-sm cursor-pointer'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="modal_double_check"
                disabled={isHandled || isSubmitting}
                checked={requiresDoubleCheck}
                onChange={(e) => setRequiresDoubleCheck(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 accent-amber-600 disabled:cursor-not-allowed"
              />
              <label 
                htmlFor="modal_double_check" 
                onClick={(e) => e.stopPropagation()} 
                className={`text-xs font-extrabold ${
                  requiresDoubleCheck ? 'text-amber-950' : 'text-gray-700'
                }`}
              >
                {requiresDoubleCheck ? '⚠️ 実施時にダブルチェックが必要（ON）' : 'ダブルチェックが必要'}
              </label>
            </div>
            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
              requiresDoubleCheck ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
            }`}>
              {requiresDoubleCheck ? '要ダブルチェック' : '不要'}
            </span>
          </div>

          {/* 💡 対応結果・方向性の編集フォーム（常に編集可能） */}
          <div className="pt-2 border-t border-gray-200 flex flex-col gap-3">
            <h3 className="font-extrabold text-xs text-indigo-900 flex items-center gap-1.5">
              <span>✍️ 対応結果・方針の記録</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                いつでも編集可能
              </span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                どのような方向性（方針）になったか
              </label>
              <textarea
                rows={3}
                placeholder="例: 主治医相談の結果、明日朝より降圧剤を1錠追加変更。"
                value={resultOutcome}
                onChange={(e) => setResultOutcome(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                医師からの指示・補足申し送りメモ
              </label>
              <textarea
                rows={2}
                placeholder="例: Dr.佐藤より指示あり。SpO2 93%未満の場合は酸素1L開始のこと。"
                value={doctorInstructions}
                onChange={(e) => setDoctorInstructions(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          {/* フッターアクションボタン */}
          <div className="pt-3 flex items-center justify-between border-t border-gray-100">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>{isDeleting ? '削除中...' : 'このTODOを削除'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || (!isHandled && !title.trim())}
                className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{isSubmitting ? '保存中...' : isEditMode ? '💾 変更を保存する' : '＋ TODOを登録する'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
