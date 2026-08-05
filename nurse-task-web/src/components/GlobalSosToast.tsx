import React, { useState, useEffect } from 'react';
import { useTimelineStore } from '../stores/useTimelineStore';
import { useUserName } from '../hooks/useUserName';
import { respondToNurseSosWithTransaction, respondToTaskSosWithTransaction } from '../lib/firebase';
import type { ExtendedTask } from '../types/types';

// 📡 近接端末・別タブ間での0秒リアルタイムブロードキャスト通信チャンネル
const sosBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nurse_app_sos_sync')
  : null;

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

  const myId = String(currentUser?.nurse_id || currentUser?.staff_id || sessionStorage.getItem('nurse_id') || '').trim();
  const myName = String(currentUser?.name || currentUserName || sessionStorage.getItem('nurse_name') || '').trim().replace(/[\s　]+/g, '');

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

  // 💡 他のタブ・端末で「要請に応じた」シグナルを0秒でリアルタイム同期受信
  useEffect(() => {
    if (!sosBroadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'NURSE_SOS_RESPONDED' && data.nurseId) {
        respondToNurseSos(data.nurseId, data.responderName || '他スタッフ');
        setDismissedIds((prev) => [...prev, String(data.nurseId)]);
      } else if (data.type === 'TASK_SOS_RESPONDED' && data.taskId) {
        respondToTaskSos(data.taskId, data.responderName || '他スタッフ');
        setDismissedIds((prev) => [...prev, String(data.taskId)]);
      }
    };

    sosBroadcastChannel.addEventListener('message', handleMessage);
    return () => {
      sosBroadcastChannel.removeEventListener('message', handleMessage);
    };
  }, [respondToNurseSos, respondToTaskSos]);

  // 💡 FirestoreのSOS状態クリア（is_sos === false）を検知して dismissedIds を自動クリーンアップ
  useEffect(() => {
    const activeNurseSosIds = new Set(nurses.filter((n) => n.is_sos).map((n) => String(n.nurse_id)));
    const activeTaskSosIds = new Set(flattenTasks(allTasks).filter((t) => t.is_sos).map((t) => String(t.task_id)));

    setDismissedIds((prev) => prev.filter((id) => activeNurseSosIds.has(id) || activeTaskSosIds.has(id)));
  }, [nurses, allTasks]);

  // 1. 自分以外の「他スタッフからの看護師SOS」を抽出
  const activeSosNurses = nurses.filter((nurse) => {
    if (nurse.is_sos !== true) return false;
    if (dismissedIds.includes(String(nurse.nurse_id))) return false;

    const targetId = String(nurse.nurse_id || '').trim();
    const targetName = String(nurse.name || '').trim().replace(/[\s　]+/g, '');

    if (myId !== '' && targetId === myId) return false;
    if (myName !== '' && targetName === myName) return false;

    return true;
  });

  // 2. フラット化した全タスクからアクティブな「タスクSOS」を抽出（自分発信を除外）
  const activeSosTasks = flattenTasks(allTasks).filter((task) => {
    if (dismissedIds.includes(String(task.task_id))) return false;

    const reqId = String(task.requested_by_id || '').trim();
    const reqName = String(task.requested_by_name || '').trim().replace(/[\s　]+/g, '');
    const taskId = String(task.nurse_id || task.staff_id || '').trim();
    const taskName = String(task.nurse_name || '').trim().replace(/[\s　]+/g, '');

    if (reqId !== '' && reqId === myId) return false;
    if (reqName !== '' && reqName === myName) return false;
    if (taskId !== '' && taskId === myId) return false;
    if (taskName !== '' && taskName === myName) return false;

    return true;
  });

  // 💡 修正：ボタンを押した瞬間に0秒でUIを更新（楽観的更新）し、全端末へブロードキャスト送信
  const handleRespondNurse = async (nurseId: string) => {
    // 1. 即座にローカルストアと画面表示をクリア（0秒で反応）
    respondToNurseSos(nurseId, responderName);
    setDismissedIds((prev) => [...prev, nurseId]);

    // 2. 近接端末・他タブへ0秒即時ブロードキャスト送信
    if (sosBroadcastChannel) {
      sosBroadcastChannel.postMessage({
        type: 'NURSE_SOS_RESPONDED',
        nurseId,
        responderName,
      });
    }

    // 3. バックグラウンドで Firestore トランザクション通信
    try {
      const result = await respondToNurseSosWithTransaction(nurseId, responderName);
      if (result && result.alreadyResponded) {
        const responder = result.responderName || '別のスタッフ';
        setConflictNotice(`🚨 【対応重複】すでに ${responder} さんが対応に向かっています！`);
        setTimeout(() => setConflictNotice(null), 4000);
      }
    } catch (error) {
      console.error("看護師SOS対応エラー:", error);
    }
  };

  const handleRespondTask = async (taskId: string) => {
    // 1. 即座にローカルストアと画面表示をクリア（0秒で反応）
    respondToTaskSos(taskId, responderName);
    setDismissedIds((prev) => [...prev, taskId]);

    // 2. 近接端末・他タブへ0秒即時ブロードキャスト送信
    if (sosBroadcastChannel) {
      sosBroadcastChannel.postMessage({
        type: 'TASK_SOS_RESPONDED',
        taskId,
        responderName,
      });
    }

    // 3. バックグラウンドで Firestore トランザクション通信
    try {
      const result = await respondToTaskSosWithTransaction(taskId, responderName);
      if (result && result.alreadyResponded) {
        const responder = result.responderName || '別のスタッフ';
        setConflictNotice(`🚨 【対応重複】すでに ${responder} さんがこのタスクのサポートに入っています！`);
        setTimeout(() => setConflictNotice(null), 4000);
      }
    } catch (error) {
      console.error("タスクSOS対応エラー:", error);
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
              className="!bg-red-600 hover:!bg-red-700 !text-white !font-bold !text-xs !px-4 !py-2 !rounded-lg !shadow-md hover:!shadow-lg !transition-all !transform active:!scale-95 !flex !items-center !gap-1.5 !cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};