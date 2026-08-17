import React, { useState } from 'react';
import type { ExtendedTask, ExtendedTaskStatus } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { CharCounter } from '../CharCounter';

interface TimelinePopupProps {
  task: ExtendedTask;
  onClose: () => void;
  renderPopupButtons: (task: ExtendedTask) => React.ReactNode;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00'
];

export const TimelinePopup: React.FC<TimelinePopupProps> = ({ task, onClose, renderPopupButtons }) => {
  const duplicateTask = useTimelineStore((state) => state.duplicateTask);
  const deleteTask = useTimelineStore((state) => state.deleteTask);
  const handleUpdatePriority = useTimelineStore((state) => state.handleUpdatePriority);
  const isReadOnly = useTimelineStore((state) => state.isReadOnly);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatePeriod, setDuplicatePeriod] = useState(
    TIME_OPTIONS.includes(task.display_period || '') ? task.display_period : '14:00'
  );
  const [duplicateNote, setDuplicateNote] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchPatients = async () => {
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${basePath}data/patients.json`.replace(/\/+/g, '/'));
        if (res.ok) {
          const data = await res.json();
          setPatientsList(data);
        }
      } catch (e) {
        console.error("患者マスターデータ読み込みエラー:", e);
      }
    };
    fetchPatients();
  }, []);

  const handleAssignPatient = async (patientId: string, patientName: string, roomId: string) => {
    // 1. Zustand ローカルストアを即座に更新
    const store = useTimelineStore.getState();
    const updatedTasks = store.allTasks.map((t) => {
      if (t.task_id === task.task_id) {
        return {
          ...t,
          patient_id: patientId,
          patient_name: patientName,
          room_id: roomId,
        };
      }
      return t;
    });
    store.setTasks(updatedTasks);

    // 2. Firestore を非同期更新
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      const taskRef = doc(db, 'tasks', task.task_id);
      await updateDoc(taskRef, {
        patient_id: patientId,
        patient_name: patientName,
        room_id: roomId,
      });
    } catch (e) {
      console.error("患者割り当て更新エラー:", e);
    }
  };

  const handleDeleteTask = async () => {
    const isConfirmed = window.confirm(`「${task.title}」を画面上から削除しますか？\n（※この操作は取り消せません）`);
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await deleteTask(task.task_id);
      onClose();
    } catch (e) {
      console.error("タスク削除失敗:", e);
      alert("タスクの削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  // ステータスカラーの定義はここに移動（または constants.ts に抽出）
  const statusColors: Record<ExtendedTaskStatus, { bg: string; border: string; text: string }> = {
    initial: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' },
    untouched: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' },
    progressing: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900' },
    pending: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
    record_start: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
    record_pending: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
    record_complete: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
    unexecuted: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
    deleted: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500' },
  };

  // ステータスラベルのロジック
  const statusLabels: Partial<Record<ExtendedTaskStatus, string>> = {
    progressing: '実施中', pending: '中断中', completed: '実施完了',
    record_start: '記録中', record_pending: '記録中断', record_complete: '記録完了',
    unexecuted: '未実施'
  };

  const statusBgClasses: Partial<Record<ExtendedTaskStatus, string>> = {
    progressing: 'bg-cyan-600 text-white', pending: 'bg-orange-500 text-white',
    completed: 'bg-green-600 text-white', record_start: 'bg-blue-600 text-white',
    record_pending: 'bg-orange-500 text-white', record_complete: 'bg-purple-600 text-white',
    unexecuted: 'bg-red-600 text-white'
  };

  const currentStatus = task.status;
  const colorSet = statusColors[currentStatus] || { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900' };

  const handleExecuteDuplicate = async () => {
    if (!duplicatePeriod) {
      alert("実施予定時間を選択してください。");
      return;
    }
    if (duplicateNote.trim().length > 200) {
      alert("⚠️ 看護判断理由・備考は200文字以内で入力してください。");
      return;
    }

    setIsDuplicating(true);
    try {
      await duplicateTask(task.task_id, duplicatePeriod, duplicateNote);
      alert(`✨ 「${task.patient_name} 様」のケア（${task.title}）を看護判断による追加タスクとして複製生成しました！`);
      setShowDuplicateModal(false);
      onClose();
    } catch (e) {
      console.error("タスク複製エラー:", e);
      alert("タスクの複製生成に失敗しました。");
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div 
        id={task.task_id === 'demo-task-tutorial' ? 'tour-status-modal' : undefined}
        className={`relative ${colorSet.bg} ${colorSet.border} ${colorSet.text} border-2 rounded-xl shadow-2xl p-6 w-[380px]`}
      >
        <div className="absolute top-4 right-14 flex items-center gap-1.5">
          {task.is_additional && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              臨時追加
            </span>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow-sm ${statusBgClasses[currentStatus] || 'bg-gray-200 text-gray-700'}`}>
            {statusLabels[currentStatus] || '未着手'}
          </span>
        </div>
        <button 
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer border-none bg-transparent" 
          onClick={onClose}
        >
          &times;
        </button>
        <div className="pr-6">
          {(() => {
            const isInterruptTask = Boolean(task.title?.includes('ナースコール') || task.title?.includes('SOS') || task.task_id?.startsWith('CALL_INTERRUPT_'));
            return (
              <>
                {task.room_id && task.room_id.trim() !== '' && (
                  <div className="text-xs font-bold opacity-70 mb-0.5">{task.room_id}号室</div>
                )}
                {task.patient_name && task.patient_name.trim() !== '' && (
                  <div className="text-xl font-black mb-2">{task.patient_name} 様</div>
                )}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="text-sm font-bold opacity-80">指示時間: {task.display_period}</div>
                  {task.instruction_type === '看護指示' ? (
                    <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                      看護指示
                    </span>
                  ) : task.instruction_type === '医師指示' && !isInterruptTask ? (
                    <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold opacity-90">
                      医師指示
                    </span>
                  ) : null}
                </div>
              </>
            );
          })()}
          {/* 👤 患者の割り当て・変更ドロップダウン */}
          <div className="mb-3 bg-sky-50/90 p-2.5 rounded-xl border border-sky-200 flex flex-col gap-1 text-left shadow-xs">
            <label className="text-[11px] font-black text-sky-900 flex items-center justify-between">
              <span>👤 対象患者の選択・変更</span>
              {task.patient_name ? (
                <span className="text-[10px] bg-sky-200 text-sky-900 font-bold px-1.5 py-0.5 rounded">
                  現在: {task.patient_name} ({task.room_id ? `${task.room_id}号室` : ''})
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  未指定 (フリー応援)
                </span>
              )}
            </label>
            <select
              value={task.patient_id || ''}
              onChange={(e) => {
                const targetVal = e.target.value;
                if (!targetVal) {
                  handleAssignPatient('', '', '');
                  return;
                }
                const selectedP = patientsList.find((p) => p.patient_id === targetVal);
                if (selectedP) {
                  handleAssignPatient(selectedP.patient_id, selectedP.name, selectedP.room_id || '');
                }
              }}
              className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="">（患者指定なし / フリー応援・ナースコール対応）</option>
              {patientsList.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.room_id ? `${p.room_id}号室 ` : ''}{p.name} 様 ({p.patient_id})
                </option>
              ))}
            </select>
          </div>

          <div className="text-base font-black mb-1">{task.title}</div>
          <div className="text-xs opacity-80 mb-3 min-h-[40px] whitespace-pre-wrap text-left">{task.details || '詳細はありません'}</div>
          
          {task.status === 'unexecuted' && task.unexecuted_reason && (
            <div className="bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg p-2.5 mb-4 text-left font-bold">
              <div className="text-[10px] opacity-70 mb-0.5">⚠️ 未実施理由</div>
              <div>{task.unexecuted_reason}</div>
            </div>
          )}

          {/* 1. 主な実施・記録アクションボタン群 */}
          <div className="mb-4">
            {renderPopupButtons(task)} 
          </div>

          {/* 🚨 優先度変更バー */}
          <div className="!flex !items-center !justify-between !bg-white/70 !p-2 !rounded-lg !border !border-gray-300/70 !mb-3 !text-xs !shadow-xs">
            <span className="!font-extrabold !text-gray-700">優先度設定:</span>
            <div className="!flex !items-center !gap-3">
              <button
                type="button"
                onClick={() => handleUpdatePriority(task.task_id, 'high')}
                className={`!px-2.5 !py-1 !rounded-full !font-bold !cursor-pointer !transition-all !border ${
                  task.priority === 'high'
                    ? '!bg-red-600 !text-white !border-red-700 !shadow-sm !scale-105'
                    : '!bg-gray-100 !text-gray-600 !border-gray-300 hover:!bg-red-50'
                }`}
              >
                高
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePriority(task.task_id, 'medium')}
                className={`!px-2.5 !py-1 !rounded-full !font-bold !cursor-pointer !transition-all !border ${
                  task.priority === 'medium'
                    ? '!bg-emerald-600 !text-white !border-emerald-700 !shadow-sm !scale-105'
                    : '!bg-gray-100 !text-gray-600 !border-gray-300 hover:!bg-emerald-50'
                }`}
              >
                中
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePriority(task.task_id, 'low')}
                className={`!px-2.5 !py-1 !rounded-full !font-bold !cursor-pointer !transition-all !border ${
                  task.priority === 'low'
                    ? '!bg-blue-600 !text-white !border-blue-700 !shadow-sm !scale-105'
                    : '!bg-gray-100 !text-gray-600 !border-gray-300 hover:!bg-blue-50'
                }`}
              >
                低
              </button>
            </div>
          </div>
          
          {/* 2. 看護判断・管理用アクションセクション（実施ボタン群と明確に視覚分離） */}
          <div className="pt-3 border-t border-gray-300/80 flex flex-col gap-2">
            <div className="text-[11px] font-extrabold text-gray-500 text-left px-0.5 flex items-center gap-1">
              <span>⚙️ 看護判断・タスク管理</span>
            </div>

            {/* 🩺 看護判断複製追加ボタン (ReadOnlyモード時は非表示) */}
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 !py-2 !px-3 !bg-emerald-50 hover:!bg-emerald-100 !text-emerald-800 border border-emerald-400 !font-bold !text-xs !rounded-lg shadow-xs cursor-pointer transition-all active:scale-98"
                >
                  <span>看護判断で追加・再実施（複製生成）</span>
                </button>

                {/* 臨時追加・手動追加タスク削除ボタン */}
                {(Boolean(task.is_additional) || String(task.task_id).startsWith('dup-task-') || String(task.task_id).startsWith('copied-')) && (
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-1.5 !py-2 !px-3 !bg-rose-50 hover:!bg-rose-100 !text-rose-700 border border-rose-300 !font-bold !text-xs !rounded-lg shadow-xs cursor-pointer transition-all disabled:opacity-50 active:scale-98"
                  >
                    <span>この追加タスクを削除</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🩺 看護判断複製追加設定モーダル */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-[360px] border-2 border-emerald-500 text-gray-800">
            <h3 className="font-extrabold text-base text-emerald-900 mb-1 flex items-center gap-1.5">
              <span>看護判断による追加ケア生成</span>
            </h3>
            <p className="text-xs text-gray-600 mb-3.5 text-left leading-relaxed">
              患者の状態変化（バイタル変動・呼吸苦など）に応じて、このケアを看護師の判断で臨時追加・再実施します。
            </p>

            <div className="flex flex-col gap-3.5 text-left text-xs mb-4">
              <div>
                <label className="font-extrabold block mb-1 text-gray-700">対象患者 / ケア</label>
                <div className="bg-gray-100 p-2.5 rounded-xl text-xs font-bold text-gray-800 border border-gray-200">
                  {task.patient_name ? `${task.patient_name} 様` : ''}{task.room_id ? `（${task.room_id}号室）` : ''}{task.patient_name || task.room_id ? ' / ' : ''}{task.title}
                </div>
              </div>

              <div>
                <label className="font-extrabold block mb-1 text-gray-800 text-xs">
                  追加実施予定時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={duplicatePeriod}
                  onChange={(e) => setDuplicatePeriod(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold block text-gray-700">看護判断理由・備考（任意）</label>
                  <CharCounter current={duplicateNote.length} max={200} />
                </div>
                <textarea
                  maxLength={200}
                  value={duplicateNote}
                  onChange={(e) => setDuplicateNote(e.target.value)}
                  placeholder="例: SpO2低下に伴い吸引を追加実施 / バイタル変動のため再測定"
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="!py-2 !px-3.5 !bg-gray-200 hover:!bg-gray-300 !text-gray-700 !font-bold !text-xs !rounded-xl cursor-pointer border-none transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExecuteDuplicate}
                disabled={isDuplicating}
                className="!py-2 !px-4 !bg-emerald-600 hover:!bg-emerald-700 !text-white !font-bold !text-xs !rounded-xl !shadow-md cursor-pointer border-none transition-colors disabled:opacity-50"
              >
                {isDuplicating ? '生成中...' : '追加タスクとして複製生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};