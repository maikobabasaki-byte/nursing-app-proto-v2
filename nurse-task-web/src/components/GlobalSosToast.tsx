import React, { useState } from 'react';
import { useTimelineStore } from '../stores/useTimelineStore';
import { useUserName } from '../hooks/useUserName';
import { respondToNurseSosWithTransaction, respondToTaskSosWithTransaction } from '../lib/firebase';
import type { ExtendedTask } from '../types/types';

export const GlobalSosToast: React.FC = () => {
  const nurses = useTimelineStore((state) => state.nurses);
  const allTasks = useTimelineStore((state) => state.allTasks);
  const respondToNurseSos = useTimelineStore((state) => state.respondToNurseSos);
  const respondToTaskSos = useTimelineStore((state) => state.respondToTaskSos);
  const currentUser = useTimelineStore((state) => state.currentUser);
  const currentUserName = useUserName();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const responderName = currentUserName || '自分';
  const normalizedCurrent = currentUserName ? currentUserName.replace(/[\s　]+/g, '') : '';

  // 1. 自分以外の「他スタッフからの看護師SOS」を抽出
  const activeSosNurses = nurses.filter((nurse) => {
    if (nurse.is_sos !== true) return false;
    if (dismissedIds.includes(nurse.nurse_id)) return false;

    const normalizedNurseName = nurse.name ? nurse.name.replace(/[\s　]+/g, '') : '';
    const isMe = currentUser
      ? (nurse.nurse_id === currentUser.nurse_id ||
         nurse.email === currentUser.email ||
         (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName))
      : (nurse.nurse_id.includes('nurse-me') ||
         nurse.nurse_id.includes('me') ||
         nurse.role === '担当看護師(自分)' ||
         (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName));

    return !isMe;
  });

  // 2. フラット化した全タスクからアクティブな「タスクSOS」を抽出
  const flattenTasks = (tasks: ExtendedTask[]): ExtendedTask[] => {
    let result: ExtendedTask[] = [];
    tasks.forEach((t) => {
      if (t.is_sos) result.push(t);
      if (t.children && t.children.length > 0) {
        result = result.concat(flattenTasks(t.children as ExtendedTask[]));
      }
    });
    return result;
  };

  const activeSosTasks = flattenTasks(allTasks).filter((task) => {
    if (dismissedIds.includes(task.task_id)) return false;

    // 担当看護師が自分であるタスクのSOSはポップアップ通知から除外
    const isMyTask = task.nurse_name && (
      (currentUser && task.nurse_name.includes(currentUser.name)) ||
      (normalizedCurrent !== '' && task.nurse_name.replace(/[\s　]+/g, '').includes(normalizedCurrent))
    );

    return !isMyTask;
  });

  const handleRespondNurse = async (nurseId: string) => {
    const result = await respondToNurseSosWithTransaction(nurseId, responderName);
    if (result.alreadyResponded) {
      const responder = result.responderName || '別のスタッフ';
      setConflictNotice(`🚨 【対応重複】すでに ${responder} さんが対応に向かっています！`);
      setTimeout(() => setConflictNotice(null), 4000);
      setDismissedIds((prev) => [...prev, nurseId]);
    } else {
      respondToNurseSos(nurseId, responderName);
    }
  };

  const handleRespondTask = async (taskId: string) => {
    const result = await respondToTaskSosWithTransaction(taskId, responderName);
    if (result.alreadyResponded) {
      const responder = result.responderName || '別のスタッフ';
      setConflictNotice(`🚨 【対応重複】すでに ${responder} さんがこのタスクのサポートに入っています！`);
      setTimeout(() => setConflictNotice(null), 4000);
      setDismissedIds((prev) => [...prev, taskId]);
    } else {
      respondToTaskSos(taskId, responderName);
    }
  };

  if (activeSosNurses.length === 0 && activeSosTasks.length === 0 && !conflictNotice) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-auto select-none animate-bounce-short">
      {/* 重複検知通知トースト */}
      {conflictNotice && (
        <div className="bg-amber-500 border-2 border-amber-700 text-amber-950 font-extrabold rounded-xl p-3.5 shadow-2xl flex items-center justify-between animate-fade-in text-xs">
          <span>{conflictNotice}</span>
          <button
            onClick={() => setConflictNotice(null)}
            className="text-amber-950 hover:bg-amber-600/30 w-5 h-5 rounded-full flex items-center justify-center font-black ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 看護師SOS要請トースト一覧 */}
      {activeSosNurses.map((nurse) => (
        <div
          key={`toast-nurse-${nurse.nurse_id}`}
          className="bg-white border-2 border-red-600 rounded-xl p-4 shadow-2xl ring-4 ring-red-100 flex flex-col gap-2 transition-all duration-300 relative"
        >
          <button
            onClick={() => setDismissedIds((prev) => [...prev, nurse.nurse_id])}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-red-100 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-600" />
              <span>🚨 緊急応援要請 (看護師SOS)</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              要対応
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <span className="font-bold text-gray-900 text-sm">{nurse.name}</span> さんが緊急アシストを要請しています。
            {nurse.sos_reason && (
              <div className="mt-1 text-[11px] text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                💬 {nurse.sos_reason}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              onClick={() => handleRespondNurse(nurse.nurse_id)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}

      {/* タスクSOS要請トースト一覧 */}
      {activeSosTasks.map((task) => (
        <div
          key={`toast-task-${task.task_id}`}
          className="bg-white border-2 border-red-500 rounded-xl p-4 shadow-2xl ring-4 ring-red-100 flex flex-col gap-2 transition-all duration-300 relative"
        >
          <button
            onClick={() => setDismissedIds((prev) => [...prev, task.task_id])}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-red-100 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500" />
              <span>🚨 タスク応援要請 ({task.room_id}号室)</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              タスクSOS
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <div className="font-bold text-gray-900 text-sm">
              {task.patient_name} 様 ({task.room_id}号室)
            </div>
            <div className="text-red-700 font-semibold text-xs mt-0.5">
              📌 {task.title}
            </div>
            {task.sos_reason && (
              <div className="mt-1 text-[11px] text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                💬 {task.sos_reason}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              onClick={() => handleRespondTask(task.task_id)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
