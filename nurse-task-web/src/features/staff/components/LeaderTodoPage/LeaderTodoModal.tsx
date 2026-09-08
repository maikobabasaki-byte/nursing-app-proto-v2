import React, { useState } from 'react';
import type { LeaderTodo, LeaderTodoCategory, LeaderTodoPriority, ProgressLog } from '../../../../types/types';
import { useTimelineStore } from '../../../../stores/useTimelineStore';
import { CharCounter } from '../CharCounter';

interface Props {
  patient?: {
    patient_id: string;
    name: string;
    room_id: string;
    team?: string;
  };
  todoToEdit?: LeaderTodo;
  onClose: () => void;
  onSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

const CATEGORY_OPTIONS: { value: LeaderTodoCategory; label: string }[] = [
  { value: '患者対応', label: '👤 患者対応（身体ケア・処置）' },
  { value: '家族対応', label: '👨‍👩‍👧 家族対応（説明・IC同席）' },
  { value: '医師への連絡', label: '🩺 医師への連絡（報告・指示確認）' },
  { value: '検査・処置', label: '💉 検査・処置（結果・搬送）' },
  { value: 'その他', label: '📝 その他（申し送り・調整）' },
];

const PRIORITY_OPTIONS: { value: LeaderTodoPriority; label: string }[] = [
  { value: 'highest', label: '🔴 最優先（至急・即時対応）' },
  { value: 'high', label: '🟧 高（本日シフト内優先）' },
  { value: 'medium', label: '🟨 中（通常時間内対応）' },
  { value: 'low', label: '🟦 低（経過観察・随時）' },
];

const STATUS_OPTIONS: { value: LeaderTodo['status']; label: string }[] = [
  { value: 'untouched', label: '⚪️ 未実施（未対応TODOリストへ配置）' },
  { value: 'in_progress', label: '🔵 進行中（現在対応・調整中）' },
  { value: 'pending', label: '🟣 要保留・確認（指示・結果待ち）' },
  { value: 'completed', label: '🟢 実施完了（完了履歴へ移動）' },
];

export const LeaderTodoModal: React.FC<Props> = ({ patient, todoToEdit, onClose, onSuccess, onDeleteSuccess }) => {
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

  const getCurrentTimeHHMM = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [category, setCategory] = useState<LeaderTodoCategory>(todoToEdit?.category || '患者対応');
  const [priority, setPriority] = useState<LeaderTodoPriority>(todoToEdit?.priority || 'high');
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>(todoToEdit?.scheduled_at || getCurrentTimeHHMM());
  const [title, setTitle] = useState<string>(todoToEdit?.title || '');
  const [requiresDoubleCheck, setRequiresDoubleCheck] = useState<boolean>(todoToEdit?.requires_double_check || false);
  const [status, setStatus] = useState<LeaderTodo['status']>(todoToEdit?.status || 'untouched');
  
  // 💡 入力フォーム欄は全権編集可能とし、新規テキストエリアは空（""）でリセット。前回の内容はポップアップ下部に表示
  const [resultOutcome, setResultOutcome] = useState<string>('');
  const [doctorInstructions, setDoctorInstructions] = useState<string>('');
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

    if (title.trim().length > 30) {
      alert('⚠️ TODO件名は30文字以内で入力してください。');
      return;
    }
    if (resultOutcome.trim().length > 200) {
      alert('⚠️ 対応結果・方針は200文字以内で入力してください。');
      return;
    }
    if (doctorInstructions.trim().length > 200) {
      alert('⚠️ 医師指示・補足メモは200文字以内で入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const author = currentUser?.name || 'リーダー';

      if (isEditMode && todoToEdit) {
        const updatedLogs: ProgressLog[] = [...(todoToEdit.progressLogs || [])];

        if (resultOutcome.trim()) {
          updatedLogs.push({
            id: `log-${Date.now()}-res-${Math.random().toString(36).substring(2, 5)}`,
            time: timeStr,
            author: author,
            text: `💡 対応結果: ${resultOutcome.trim()}`,
          });
        }

        if (doctorInstructions.trim()) {
          updatedLogs.push({
            id: `log-${Date.now()}-doc-${Math.random().toString(36).substring(2, 5)}`,
            time: timeStr,
            author: author,
            text: `🩺 医師指示: ${doctorInstructions.trim()}`,
          });
        }

        await updateLeaderTodo(todoToEdit.todo_id, {
          category,
          title: title.trim(),
          scheduled_at: scheduledAt,
          priority,
          requires_double_check: requiresDoubleCheck,
          status,
          result_outcome: resultOutcome.trim() || todoToEdit.result_outcome || '',
          doctor_instructions: doctorInstructions.trim() || todoToEdit.doctor_instructions || '',
          progressLogs: updatedLogs,
          updated_by: author,
        });
      } else {
        const currentSelectedDate = useTimelineStore.getState().selectedDate;
        const nowStr = new Date().toISOString().split('T')[0];
        const targetDateVal = currentSelectedDate || nowStr;
        const initialLogs: ProgressLog[] = [];

        if (resultOutcome.trim()) {
          initialLogs.push({
            id: `log-${Date.now()}-res-${Math.random().toString(36).substring(2, 5)}`,
            time: timeStr,
            author: author,
            text: `💡 対応結果: ${resultOutcome.trim()}`,
          });
        }

        if (doctorInstructions.trim()) {
          initialLogs.push({
            id: `log-${Date.now()}-doc-${Math.random().toString(36).substring(2, 5)}`,
            time: timeStr,
            author: author,
            text: `🩺 医師指示: ${doctorInstructions.trim()}`,
          });
        }

        const patientTeam = (patient as any)?.team || todoToEdit?.team || (currentUser?.team ? currentUser.team.replace(/チーム/g, '') : undefined);

        await addLeaderTodo({
          nurse_id: currentUser?.nurse_id || currentUser?.email || '',
          user_id: currentUser?.nurse_id || currentUser?.email || '',
          patient_id: targetPatient.patient_id,
          patient_name: targetPatient.name,
          room_id: targetPatient.room_id,
          team: patientTeam,
          category,
          title: title.trim(),
          scheduled_at: scheduledAt,
          priority,
          requires_double_check: requiresDoubleCheck,
          status: 'untouched',
          result_outcome: resultOutcome.trim(),
          doctor_instructions: doctorInstructions.trim(),
          updated_by: author,
          targetDate: targetDateVal,
          target_date: targetDateVal,
          isHandover: false,
          progressLogs: initialLogs,
          assignee: null,
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('TODO保存エラー:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 w-[94vw] sm:w-full sm:max-w-lg max-h-[92vh] overflow-hidden animate-fade-in flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">{isEditMode ? '✏️' : '📋'}</span>
            <h2 className="font-extrabold text-base sm:text-lg">{isEditMode ? 'リーダーTODO全項目編集' : 'リーダーTODO新規作成'}</h2>
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
          {/* 患者基本情報カード */}
          <div className="!bg-indigo-50/70 !border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                対象患者
              </span>
              <div className="font-extrabold text-gray-900 text-base mt-1">
                {targetPatient.name} 様
              </div>
            </div>
            <div className="bg-white border border-indigo-200 px-3 py-1 rounded-lg text-xs font-extrabold text-indigo-900 shadow-sm">
              {targetPatient.room_id}号室
            </div>
          </div>

          {/* 大項目カテゴリー & 優先度 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 📂 大項目カテゴリー */}
            <div className="relative">
              <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
                <span>📂 大項目カテゴリー</span>
                <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsCategoryOpen(!isCategoryOpen);
                  setIsPriorityOpen(false);
                  setIsStatusOpen(false);
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 flex items-center justify-between transition-all shadow-xs text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="truncate pr-2">
                  {CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category}
                </span>
                <span className={`text-[10px] text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isCategoryOpen && (
                <>
                  <div className="fixed inset-0 z-[101]" onClick={() => setIsCategoryOpen(false)} />
                  <ul className="absolute left-0 right-0 top-full mt-1.5 w-full max-w-full bg-white border border-indigo-200 rounded-xl shadow-xl z-[102] max-h-56 overflow-y-auto py-1 animate-fade-in list-none p-0 m-0">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => {
                            setCategory(opt.value);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-normal break-words leading-relaxed border-b border-gray-100 last:border-none flex items-center justify-between ${
                            category === opt.value
                              ? 'bg-indigo-50 text-indigo-900 font-extrabold'
                              : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span className="whitespace-normal break-words">{opt.label}</span>
                          {category === opt.value && <span className="text-indigo-600 font-black ml-1 shrink-0">✓</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* 優先度 */}
            <div className="relative">
              <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
                <span>優先度</span>
                <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsPriorityOpen(!isPriorityOpen);
                  setIsCategoryOpen(false);
                  setIsStatusOpen(false);
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 flex items-center justify-between transition-all shadow-xs text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="truncate pr-2">
                  {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || priority}
                </span>
                <span className={`text-[10px] text-gray-500 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isPriorityOpen && (
                <>
                  <div className="fixed inset-0 z-[101]" onClick={() => setIsPriorityOpen(false)} />
                  <ul className="absolute left-0 right-0 top-full mt-1.5 w-full max-w-full bg-white border border-indigo-200 rounded-xl shadow-xl z-[102] max-h-56 overflow-y-auto py-1 animate-fade-in list-none p-0 m-0">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => {
                            setPriority(opt.value);
                            setIsPriorityOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-normal break-words leading-relaxed border-b border-gray-100 last:border-none flex items-center justify-between ${
                            priority === opt.value
                              ? 'bg-indigo-50 text-indigo-900 font-extrabold'
                              : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span className="whitespace-normal break-words">{opt.label}</span>
                          {priority === opt.value && <span className="text-indigo-600 font-black ml-1 shrink-0">✓</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* 実施予定時刻 ＆ 実施ステータス */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                実施予定時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                disabled={isSubmitting}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full max-w-full font-mono bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            {/* ⚡️ 実施ステータス */}
            <div className="relative">
              <label className="block text-xs font-black text-gray-800 mb-1 flex items-center gap-1">
                <span>⚡️ 実施ステータス</span>
                <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsStatusOpen(!isStatusOpen);
                  setIsCategoryOpen(false);
                  setIsPriorityOpen(false);
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 flex items-center justify-between transition-all shadow-xs text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="truncate pr-2">
                  {STATUS_OPTIONS.find((s) => s.value === status)?.label || status}
                </span>
                <span className={`text-[10px] text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

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
          </div>

          {/* TODO件名 / メモフォーム */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                TODO件名・具体内容 <span className="text-red-500">*</span>
              </label>
              <CharCounter current={title.length} max={30} />
            </div>
            <textarea
              required
              disabled={isSubmitting}
              maxLength={30}
              rows={2}
              placeholder="例: IC同席後の経過観察および主治医指示確認メモ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* ダブルチェック有無（操作可能なトグルカード） */}
          <div 
            onClick={() => setRequiresDoubleCheck(!requiresDoubleCheck)}
            className={`p-3.5 rounded-xl border transition-all select-none flex items-center justify-between ${
              requiresDoubleCheck
                ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300 shadow-sm cursor-pointer'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="modal_double_check"
                disabled={isSubmitting}
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

          {/* 新規 対応結果・方向性の入力フォーム */}
          <div className="pt-2 border-t border-gray-200 flex flex-col gap-3">
            <h3 className="font-extrabold text-xs text-indigo-900 flex items-center gap-1.5">
              <span>✍️ 対応結果・方針の記録追記</span>
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  どのような方向性（方針）になったか
                </label>
                <CharCounter current={resultOutcome.length} max={200} />
              </div>
              <textarea
                maxLength={200}
                rows={3}
                placeholder="新規の対応結果・方針を入力..."
                value={resultOutcome}
                onChange={(e) => setResultOutcome(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  医師からの指示・補足申し送りメモ
                </label>
                <CharCounter current={doctorInstructions.length} max={200} />
              </div>
              <textarea
                maxLength={200}
                rows={2}
                placeholder="新規の医師指示・連絡メモを入力..."
                value={doctorInstructions}
                onChange={(e) => setDoctorInstructions(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-2xs"
              />
            </div>
          </div>

          {/* 📜 ポップアップ下部：過去の入力内容 ＆ 経過履歴の参照エリア */}
          {todoToEdit && (todoToEdit.result_outcome || todoToEdit.doctor_instructions || (todoToEdit.progressLogs && todoToEdit.progressLogs.length > 0)) && (
            <div className="pt-3.5 border-t-2 border-indigo-100 flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>📜 過去の入力内容 ＆ 経過履歴</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                    振り返り参照用
                  </span>
                </span>
                <span className="text-[10px] text-gray-500 font-bold">過去の入力は下部に保持されます</span>
              </div>

              {/* 前回の対応結果・方針 */}
              {todoToEdit.result_outcome && (
                <div className="bg-white border border-emerald-300/80 rounded-lg p-2.5 flex flex-col gap-0.5 text-xs shadow-2xs">
                  <span className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                    <span>💡 前回の対応結果・方針:</span>
                  </span>
                  <p className="text-xs text-gray-800 font-bold leading-relaxed whitespace-pre-wrap pl-1">
                    {todoToEdit.result_outcome}
                  </p>
                </div>
              )}

              {/* 前回の医師指示メモ */}
              {todoToEdit.doctor_instructions && (
                <div className="bg-white border border-indigo-300/80 rounded-lg p-2.5 flex flex-col gap-0.5 text-xs shadow-2xs">
                  <span className="text-[10px] font-black text-indigo-800 flex items-center gap-1">
                    <span>🩺 前回の医師指示メモ:</span>
                  </span>
                  <p className="text-xs text-gray-800 font-bold leading-relaxed whitespace-pre-wrap pl-1">
                    {todoToEdit.doctor_instructions}
                  </p>
                </div>
              )}

              {/* タイムライン経過ログ一覧 */}
              {todoToEdit.progressLogs && todoToEdit.progressLogs.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-gray-600">全経過ログ ({todoToEdit.progressLogs.length}件):</span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {todoToEdit.progressLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-white border border-amber-200/90 rounded-lg p-2 flex flex-col gap-0.5 text-[11px] shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-black text-[10px]">
                          <span className="text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            👤 {log.author}
                          </span>
                          <span className="text-gray-500 font-mono">⏰ {log.time}</span>
                        </div>
                        <p className="text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-wrap pl-0.5">
                          {log.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* フッターアクションボタン */}
          <div className="pt-3 flex items-center justify-between border-t border-gray-100">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="!bg-red-50 hover:!bg-red-100 !text-red-700 border !border-red-200 !font-extrabold !text-xs !px-3.5 !py-2 !rounded-lg !transition-colors !cursor-pointer !flex !items-center !gap-1.5"
                >
                  <span>{isDeleting ? '削除中...' : 'このTODOを削除'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="!px-4 !py-2 !text-xs !font-bold !text-gray-600 hover:!bg-gray-100 !rounded-lg !transition-colors !cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || !title.trim()}
                className="!bg-indigo-700 hover:!bg-indigo-800 disabled:!opacity-50 !text-white !font-extrabold !text-xs !px-5 !py-2.5 !rounded-lg !shadow-md hover:!shadow-lg !transition-all !cursor-pointer !flex !items-center !gap-1.5"
              >
                <span>{isSubmitting ? '保存中...' : isEditMode ? '変更を保存する' : '＋ TODOを登録する'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
