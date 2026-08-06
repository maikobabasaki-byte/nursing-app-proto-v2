import { useState, useRef } from 'react';
import type { ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
import { TimelineControls} from './TimelineControls';
import { TimelineRow } from './TimelineRow';
import { LiveCurrentTimeLine } from './LiveCurrentTimeLine';
import { TimelinePopup } from '../Timeline/TimelinePopup';
import { MemoManager } from './MemoManager'; 
import { TimelineToast } from './TimelineToast';
import { TimelinePopupButtons } from './TimelinePopupButtons';
import { UnexecutedReasonModal } from './UnexecutedReasonModal';
import { PendingTray } from './PendingTray';
import { useTimelineStore } from '../../stores/useTimelineStore'; // ★追加
import { updateTask } from '../../hooks/useTaskUpdate';
import { useUserName } from '../../hooks/useUserName';
import { normalizeToHHMM, normalizeTeamName } from '../../utils/taskLogic';


export default function TimelineMain({ 
  selectedPatients
}: TimelineMainProps) {
  const userName = useUserName();
  const handleUpdateStatus = useTimelineStore((state) => state.handleUpdateStatus);
  const storeAllTasks = useTimelineStore((state) => state.allTasks);
  const nurseMaster = useTimelineStore((state) => state.nurseMaster);
  const currentUser = useTimelineStore((state) => state.currentUser);
  const showLowPriority = useTimelineStore((state) => state.showLowPriority);
  const toggleShowLowPriority = useTimelineStore((state) => state.toggleShowLowPriority);

  const isLeader = currentUser?.is_leader === true;
  const leaderTeam = currentUser?.team || 'Aチーム';
  
  // 🎯 【Single Source of Truth】ストアの全タスクから評価（リーダー参照モード時は自チーム全患者・全重要タスクを網羅集約）
  const extendedTasks = storeAllTasks.filter((task) => {
    if (!task || task.status === 'deleted' || !task.display_period?.includes(':')) {
      return false;
    }

    // 💡 リーダー参照モード (isLeader === true) の場合
    if (isLeader) {
      // 1. 優先度「high」のタスクは漏れなく最優先で表示（完全網羅を保証）
      const isHighPriority = task.priority === 'high';

      // 2. showLowPriority が false の場合のみ、優先度「low」のタスクを除外
      if (!isHighPriority && !showLowPriority && task.priority === 'low') {
        return false;
      }

      // 3. チーム判定：チーム名の表記揺れ（"A" と "Aチーム" 等）を統一正規化して比較
      const normalizedLeaderTeam = normalizeTeamName(leaderTeam);
      const normalizedTaskTeam = normalizeTeamName(task.team);

      // タスク側にチーム指定があり、それがリーダーのチームと明確に異なる場合は除外（ただし high 優先度は除く）
      if (normalizedTaskTeam !== '' && normalizedLeaderTeam !== '' && normalizedTaskTeam !== normalizedLeaderTeam && !isHighPriority) {
        return false;
      }

      // 担当看護師が明示的に指定されている場合の所属チームチェック
      const tNurseName = (task.nurse_name || '').replace(/[\s　]+/g, '');
      const tNurseId = (task.nurse_id || task.staff_id || task.assigned_nurse_id || '').trim();
      if (tNurseName || tNurseId) {
        const assignedNurse = nurseMaster.find(n => {
          const nName = (n.name || '').replace(/[\s　]+/g, '');
          const nId = (n.nurse_id || '').trim();
          return (
            (nId !== '' && (nId === tNurseId || nId === tNurseName)) ||
            (nName !== '' && (nName === tNurseName || nName === tNurseId || tNurseName.includes(nName) || nName.includes(tNurseName)))
          );
        });

        // 看護師が見つかり、そのチームがリーダーチームと異なり、かつ high 優先度でない場合のみ除外
        if (assignedNurse && assignedNurse.team) {
          const normalizedNurseTeam = normalizeTeamName(assignedNurse.team);
          if (normalizedNurseTeam !== '' && normalizedLeaderTeam !== '' && normalizedNurseTeam !== normalizedLeaderTeam && !isHighPriority) {
            return false;
          }
        }
      }

      return true;
    }

    // 💡 通常の受け持ち選択モードの場合：受け持ち患者リスト（selectedPatients）でフィルタリング
    return selectedPatients.includes(task.patient_id);
  });

  // 🎯 表示に使うメモは、100%ストア（Zustand）側が管理しているものだけに一本化！
  // （これで親との間でピンポン感染のようなデータ再レンダリングループが発生しなくなります）
  const storeMemos = useTimelineStore((state) => state.memos);

  // 🎯 ポップアップの開閉状態もZustandから一本釣り
  const activePopupTaskId = useTimelineStore((state) => state.activePopupTaskId);
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);

  // 🎯 ストアの全タスクから親・子問わず安全に現在詳細を開いているタスクを深掘り特定
  const activePopupTask = (() => {
    if (!activePopupTaskId) return null;
    const findTask = (list: ExtendedTask[]): ExtendedTask | null => {
      for (const t of list) {
        if (t.task_id === activePopupTaskId) return t;
        if (t.children && t.children.length > 0) {
          const found = findTask(t.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findTask(storeAllTasks);
  })();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  const [timelineMode, setTimelineMode] = useState<15 | 30 | 60>(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [toast, setToast] = useState<{ message: string; visible: boolean; status: ExtendedTaskStatus | null }>({
    message: '', visible: false, status: null,
  });

  const timelineStartTime = useTimelineStore((state) => state.timelineStartTime);
  const timelineEndTime = useTimelineStore((state) => state.timelineEndTime);
  const setTimelineTimeRange = useTimelineStore((state) => state.setTimelineTimeRange);

  const isPastTime = (targetTime: string): boolean => {
    if (!targetTime || !targetTime.includes(':')) return false;
    const now = new Date();
    const [h, m] = targetTime.split(':').map(Number);
    return (now.getHours() * 60 + now.getMinutes()) > (h * 60 + m);
  };

  const parseTimeToMinutes = (tStr: string): number => {
    if (!tStr || !tStr.includes(':')) return -1;
    const normalized = normalizeToHHMM(tStr);
    const [h, m] = normalized.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const startMins = parseTimeToMinutes(timelineStartTime) >= 0 ? parseTimeToMinutes(timelineStartTime) : 480;
  const rawEndMins = parseTimeToMinutes(timelineEndTime) >= 0 ? parseTimeToMinutes(timelineEndTime) : 1050;

  // 💡 日またぎ判定 (例: 夜勤 17:00 〜 翌09:00 のように startMins > rawEndMins の場合)
  const isCrossDay = startMins > rawEndMins;
  const effectiveEndMins = isCrossDay ? rawEndMins + 24 * 60 : rawEndMins;

  // 💡 ユーザーが選択した表示時間幅（開始〜終了・日またぎ対応）に基づく動的目盛り生成
  const timeSlots = (() => {
    const slots: string[] = [];
    for (let m = startMins; m <= effectiveEndMins; m += timelineMode) {
      const h = String(Math.floor(m / 60) % 24).padStart(2, '0');
      const minute = String(m % 60).padStart(2, '0');
      slots.push(`${h}:${minute}`);
    }
    return slots;
  })();

  // 💡 時間幅の範囲外（指定時間帯より前／後）に予定されているタスクの抽出
  const outOfBoundsBeforeTasks = extendedTasks.filter((t) => {
    const tMins = parseTimeToMinutes(t.display_period);
    if (tMins < 0) return false;
    if (!isCrossDay) {
      return tMins < startMins;
    } else {
      // 日またぎ時（例: 17:00〜翌09:00）は、09:00超 かつ 17:00未満 が範囲外
      return tMins > rawEndMins && tMins < startMins;
    }
  });

  const outOfBoundsAfterTasks = extendedTasks.filter((t) => {
    const tMins = parseTimeToMinutes(t.display_period);
    if (tMins < 0) return false;
    if (!isCrossDay) {
      return tMins > effectiveEndMins;
    } else {
      return false; // 日またぎ時は before 側に集約
    }
  });

  const pendingTasks = (() => {
    const list: ExtendedTask[] = [];
    extendedTasks.forEach(task => {
      if (task.status === 'pending') {
        list.push(task);
      }
      if (task.isGroup && task.children && Array.isArray(task.children)) {
        task.children.forEach(child => {
          if (child.status === 'pending') {
            list.push({
              ...child,
              parent_id: task.task_id
            });
          }
        });
      }
    });
    return list;
  })();

  const [unexecutedModalTask, setUnexecutedModalTask] = useState<ExtendedTask | null>(null);

  const handleConfirmUnexecuted = (task: ExtendedTask, reason: string) => {
    setActivePopupTaskId(null);
    setUnexecutedModalTask(null);

    setToast({
      message: '未実施に設定しました',
      visible: true,
      status: 'unexecuted',
    });

    handleUpdateStatus(task.task_id, 'unexecuted', reason);
    updateTask(task.task_id, { status: 'unexecuted', unexecuted_reason: reason, nurse_name: userName });

    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-4 select-none">
      {/* 👑 リーダー参照モードコントロールヘッダー */}
      {isLeader && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white p-3 rounded-xl mb-3 flex items-center justify-between shadow-md border border-indigo-700/60 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👑</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs bg-indigo-700 text-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-500">
                  リーダー参照モード（自チーム進捗監督）
                </span>
                <span className="text-xs font-extrabold text-indigo-200">
                  所属: {leaderTeam}
                </span>
              </div>
              <p className="text-[11px] text-indigo-300 mt-0.5">
                自チームメンバーナースのタスク実施・記録・SOS状況をリアルタイム俯瞰中
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 💡 低優先度タスク表示トグルボタン */}
            <button
              type="button"
              onClick={toggleShowLowPriority}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showLowPriority
                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-105'
                  : 'bg-indigo-950/80 text-indigo-200 hover:text-white border-indigo-700'
              }`}
            >
              <span>{showLowPriority ? '👁️ 低優先度タスク: 表示中' : '🙈 低優先度タスク: 非表示'}</span>
            </button>
          </div>
        </div>
      )}

      <TimelineControls 
        timelineMode={timelineMode} 
        setTimelineMode={setTimelineMode}
      />

      <div 
        ref={containerRef} 
        className="relative flex-1 overflow-y-auto border border-gray-200 rounded-2xl bg-white shadow-xs"
      >
        <LiveCurrentTimeLine timelineMode={timelineMode} containerRef={containerRef} rowRefs={rowRefs} />

        {/* ⚠️ 指定開始時間より前に予定されている枠外タスク通知インジケーター */}
        {outOfBoundsBeforeTasks.length > 0 && (
          <div className="sticky top-0 z-20 bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm border-b border-amber-600">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                表示開始時刻（<strong>{timelineStartTime}</strong>）より前に <strong>{outOfBoundsBeforeTasks.length} 件</strong> の予定ケアタスクがあります
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTimelineTimeRange('06:00', timelineEndTime)}
              className="!px-3 !py-1 !bg-white hover:!bg-amber-50 !text-amber-950 !rounded-lg !text-xs !font-extrabold cursor-pointer border-none shadow-xs transition-colors"
            >
              早出・全時間表示にする (06:00〜)
            </button>
          </div>
        )}

        {timeSlots.map((time) => {
          const currentRows = extendedTasks.filter(t => {
            if (!t.display_period || !t.display_period.includes(':')) {
              return false;
            }
            const periodTime = normalizeToHHMM(t.display_period);
            return periodTime === time;
          });

          const isPlaceholderStatus = (status: string) => 
            status === 'pending' || status === 'progressing' || status === 'record_start' || status === 'record_pending';

          const filteredRowTasks = currentRows.filter(t => {
            if (!t.isGroup && isPlaceholderStatus(t.status)) return false;
            if (t.isGroup && isPlaceholderStatus(t.status)) return false;   
            if (t.isChild && !t.isGroup) return false;              
            return true;
          });

          const filteredPlaceholders = currentRows.filter(t => !t.isGroup && isPlaceholderStatus(t.status));

          return (
            <TimelineRow 
              key={time}
              id={time}
              time={time}
              isCurrentRow={false}
              rowTasks={filteredRowTasks}         
              placeholders={filteredPlaceholders} 
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              setRowRef={(time, el) => rowRefs.current[time] = el}
              timeMemos={storeMemos}
              isPastTime={isPastTime}
            />
          );
        })}

        {/* ⚠️ 指定終了時間より後に予定されている枠外タスク通知インジケーター */}
        {outOfBoundsAfterTasks.length > 0 && (
          <div className="sticky bottom-0 z-20 bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm border-t border-amber-600">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                表示終了時刻（<strong>{timelineEndTime}</strong>）以降に <strong>{outOfBoundsAfterTasks.length} 件</strong> の予定ケアタスクがあります
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTimelineTimeRange(timelineStartTime, '23:00')}
              className="!px-3 !py-1 !bg-white hover:!bg-amber-50 !text-amber-950 !rounded-lg !text-xs !font-extrabold cursor-pointer border-none shadow-xs transition-colors"
            >
              遅出・全時間表示にする (〜23:00)
            </button>
          </div>
        )}
      </div>

      <PendingTray pendingTasks={pendingTasks} onTaskClick={setActivePopupTaskId} />
      
      {/* メモ管理ポップアップ */}
      <MemoManager />

      {/* タスク詳細ポップアップ */}
      {activePopupTask && (
        <TimelinePopup 
          task={activePopupTask}
          onClose={() => setActivePopupTaskId(null)} 
          renderPopupButtons={(task) => (
            <TimelinePopupButtons 
              task={task} 
              onStatusChange={(t, s) => {
                if (s === 'unexecuted') {
                  setUnexecutedModalTask(t);
                  return;
                }

                const messages: Record<ExtendedTaskStatus, string> = {
                  progressing: '実施を開始しました',
                  pending: '中断・保留しました',
                  completed: '実施を完了しました',
                  record_start: '記録を開始しました',
                  record_pending: '記録を一時中断しました',
                  record_complete: '記録を完了しました',
                  unexecuted: '未実施に設定しました',
                  initial: '初期状態に戻しました',
                  untouched: '未着手に設定しました',
                  deleted: '削除しました',
                };

                setActivePopupTaskId(null); 
                
                setToast({ 
                  message: messages[s] || 'ステータスを更新しました', 
                  visible: true, 
                  status: s 
                });
                
                handleUpdateStatus(t.task_id, s);
                // Firestoreにステータス変更を保存（未実施から別ステータスへ変わる場合は理由もクリア）
                const firestoreUpdate: { status: typeof s; unexecuted_reason?: string; nurse_name?: string } = { 
                  status: s,
                  nurse_name: userName 
                };
                if (t.status === 'unexecuted') {
                  firestoreUpdate.unexecuted_reason = '';
                }
                updateTask(t.task_id, firestoreUpdate);

                setTimeout(() => {
                  setToast(prev => ({ ...prev, visible: false }));
                }, 1500);
              }}
            />
          )}
        />
      )}

      {/* 未実施理由入力モーダル */}
      {unexecutedModalTask && (
        <UnexecutedReasonModal
          task={unexecutedModalTask}
          onConfirm={(reason) => handleConfirmUnexecuted(unexecutedModalTask, reason)}
          onClose={() => setUnexecutedModalTask(null)}
        />
      )}

      <TimelineToast toast={toast} />
    </div>
  );
}