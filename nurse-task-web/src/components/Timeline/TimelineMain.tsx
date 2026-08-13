import { useState, useRef, useEffect } from 'react';
import type { ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
import { TimelineControls } from './TimelineControls';
import { TimelineRow } from './TimelineRow';
import { LiveCurrentTimeLine } from './LiveCurrentTimeLine';
import { TimelinePopup } from '../Timeline/TimelinePopup';
import { MemoManager } from './MemoManager'; 
import { TimelineToast } from './TimelineToast';
import { TimelinePopupButtons } from './TimelinePopupButtons';
import { UnexecutedReasonModal } from './UnexecutedReasonModal';
import { PendingTray } from './PendingTray';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { updateTask } from '../../hooks/useTaskUpdate';
import { useUserName } from '../../hooks/useUserName';
import { PoolTaskCard } from './PoolTaskCard';
import { normalizeToHHMM, normalizeTeamName, extractUserProgressingTasks } from '../../utils/taskLogic';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function TimelineMain({ 
  selectedPatients
}: TimelineMainProps) {
  const isMobile = useIsMobile();
  const userName = useUserName();
  const handleUpdateStatus = useTimelineStore((state) => state.handleUpdateStatus);
  const storeAllTasks = useTimelineStore((state) => state.allTasks);
  const nurseMaster = useTimelineStore((state) => state.nurseMaster);
  const currentUser = useTimelineStore((state) => state.currentUser);
  const showLowPriority = useTimelineStore((state) => state.showLowPriority);
  const toggleShowLowPriority = useTimelineStore((state) => state.toggleShowLowPriority);
  const setActiveMemoTime = useTimelineStore((state) => state.setActiveMemoTime);
  const groupingMode = useTimelineStore((state) => state.groupingMode);
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);
  const activeId = useTimelineStore((state) => state.activeId);

  const [isPoolExpanded, setIsPoolExpanded] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);

  const isLeader = currentUser?.is_leader === true;
  const leaderTeam = currentUser?.team || 'Aチーム';

  // 💡 有効な選択患者リスト（props または ストアから算出）
  const storeSelectedPatients = useTimelineStore((state) => state.selectedPatients);
  const effectiveSelectedPatients = (selectedPatients && selectedPatients.length > 0)
    ? selectedPatients
    : storeSelectedPatients;

  // 💡 判定関数：患者が指定されていない（0件）場合は全タスクを表示し、PC画面消失を自動防止
  const isPatientSelected = (patientId: string) => {
    if (!effectiveSelectedPatients || effectiveSelectedPatients.length === 0) {
      return true;
    }
    return effectiveSelectedPatients.includes(patientId);
  };

  // モバイル用未配置タスクプール算出
  const poolTasks = storeAllTasks.filter(task => {
    if (!task || task.status === 'deleted' || task.display_period?.includes(':')) {
      return false;
    }
    if (isLeader) {
      const isHighPriority = task.priority === 'high';
      if (!isHighPriority && !showLowPriority && task.priority === 'low') {
        return false;
      }
      return true;
    }
    return isPatientSelected(task.patient_id);
  });

  // 🎯 【Single Source of Truth】ストアの全タスクから評価
  const extendedTasks = storeAllTasks.filter((task) => {
    if (!task || task.status === 'deleted' || !task.display_period?.includes(':')) {
      return false;
    }

    // 💡 リーダー参照モード (isLeader === true) の場合
    if (isLeader) {
      const isHighPriority = task.priority === 'high';

      if (!isHighPriority && !showLowPriority && task.priority === 'low') {
        return false;
      }

      const normalizedLeaderTeam = normalizeTeamName(leaderTeam);
      const normalizedTaskTeam = normalizeTeamName(task.team);

      if (normalizedTaskTeam !== '' && normalizedLeaderTeam !== '' && normalizedTaskTeam !== normalizedLeaderTeam && !isHighPriority) {
        return false;
      }

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

        if (assignedNurse && assignedNurse.team) {
          const normalizedNurseTeam = normalizeTeamName(assignedNurse.team);
          if (normalizedNurseTeam !== '' && normalizedLeaderTeam !== '' && normalizedNurseTeam !== normalizedLeaderTeam && !isHighPriority) {
            return false;
          }
        }
      }

      return true;
    }

    // 💡 通常の受け持ち選択モード：受け持ち指定なし（0件）の場合は全患者タスクを表示
    return isPatientSelected(task.patient_id);
  });

  const storeMemos = useTimelineStore((state) => state.memos);
  const activePopupTaskId = useTimelineStore((state) => state.activePopupTaskId);
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);

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

  const isCrossDay = startMins > rawEndMins;
  const effectiveEndMins = isCrossDay ? rawEndMins + 24 * 60 : rawEndMins;

  const timeSlots = (() => {
    const slots: string[] = [];
    for (let m = startMins; m <= effectiveEndMins; m += timelineMode) {
      const h = String(Math.floor(m / 60) % 24).padStart(2, '0');
      const minute = String(m % 60).padStart(2, '0');
      slots.push(`${h}:${minute}`);
    }
    return slots;
  })();

  const outOfBoundsBeforeTasks = extendedTasks.filter((t) => {
    const tMins = parseTimeToMinutes(t.display_period);
    if (tMins < 0) return false;
    if (!isCrossDay) {
      return tMins < startMins;
    } else {
      return tMins > rawEndMins && tMins < startMins;
    }
  });

  const outOfBoundsAfterTasks = extendedTasks.filter((t) => {
    const tMins = parseTimeToMinutes(t.display_period);
    if (tMins < 0) return false;
    if (!isCrossDay) {
      return tMins > effectiveEndMins;
    } else {
      return false;
    }
  });

  const pendingTasks = (() => {
    const list: ExtendedTask[] = [];
    extendedTasks.forEach(task => {
      if (task.status === 'pending' || task.status === 'record_pending') {
        list.push(task);
      }
      if (task.isGroup && task.children && Array.isArray(task.children)) {
        task.children.forEach(child => {
          if (child.status === 'pending' || child.status === 'record_pending') {
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

  // 🎈 下部トレイ（実施中・中断中）の表示・段数に応じたメモ追加FABの動的bottom位置算出
  const progressingTasks = isMobile ? extractUserProgressingTasks(storeAllTasks, userName) : [];
  const hasProgressing = progressingTasks.length > 0;
  const hasPending = pendingTasks.length > 0;

  const fabBottomStyle = (() => {
    if (hasProgressing && hasPending) {
      // 2段トレイ出現時：トレイの上に十分なマージンを空けて明確に高く退避 (bottom: 18.5rem = 296px)
      return { bottom: '18.5rem' };
    }
    if (hasProgressing || hasPending) {
      // 1段トレイ出現時：トレイの上に十分なマージンを空けて明確に高く退避 (bottom: 13.5rem = 216px)
      return { bottom: '13.5rem' };
    }
    // トレイ非表示時：下部ナビゲーションの直上 (bottom: 5.5rem = 88px)
    return { bottom: '5.5rem' };
  })();

  const [unexecutedModalTask, setUnexecutedModalTask] = useState<ExtendedTask | null>(null);
  const [isBeforeTasksDismissed, setIsBeforeTasksDismissed] = useState(false);
  const [isAfterTasksDismissed, setIsAfterTasksDismissed] = useState(false);

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

  useEffect(() => {
    if (isSortMode) {
      document.body.style.touchAction = 'none';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
    };
  }, [isSortMode]);

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col p-2 md:p-4 select-none overflow-hidden">
      {/* 👑 リーダー参照モードコントロールヘッダー */}
      {isLeader && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white p-2.5 md:p-3 rounded-xl mb-3 flex items-center justify-between shadow-md border border-indigo-700/60 animate-fade-in">
          {/* 📱 タブレット・モバイル表示時：所属チームと低優先度トグルボタンのみの簡潔表示 */}
          {isMobile ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold bg-indigo-800/80 text-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-600 font-mono">
                所属: {leaderTeam}
              </span>
            </div>
          ) : (
            /* 💻 PC表示時：従来のフル表示（アイコン・タイトル・説明文付き）をそのまま維持 */
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
          )}

          {/* 低優先度タスク表示切り替えボタン（共通） */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleShowLowPriority}
              className={`px-3 py-1 md:px-3.5 md:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showLowPriority
                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-102'
                  : 'bg-indigo-950/80 text-indigo-200 hover:text-white border-indigo-700'
              }`}
            >
              <span>{showLowPriority ? '👁️ 低優先度: 表示中' : '🙈 低優先度: 非表示'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 📱 モバイル時（isMobile === true）のみ上部ツールバー & タスクプールアコーディオンをマウント */}
      {isMobile && (
        <>
          <div className="flex lg:hidden items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200 gap-2 mb-1.5 rounded-xl shadow-2xs">
            {/* 左側：ハンバーガーボタン（表示設定ドロワー開閉） */}
            <button
              type="button"
              onClick={() => setIsControlsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-extrabold cursor-pointer shadow-2xs transition-all"
            >
              <span className="material-symbols-outlined text-base text-indigo-600">menu</span>
              <span>表示設定</span>
            </button>

            {/* 右側：並び替えモードボタン */}
            <button
              type="button"
              onClick={() => setIsSortMode(!isSortMode)}
              title={isSortMode ? '並び替えモード ON (D&D有効)' : '並び替えモード OFF'}
              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all border cursor-pointer ${
                isSortMode 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSortMode ? (
                <>
                  <span className="text-sm font-bold leading-none">⠿</span>
                  <span className="text-[11px]">並び替え中</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">swap_vert</span>
                  <span className="text-[11px]">並び替え</span>
                </>
              )}
            </button>
          </div>

          {poolTasks.length > 0 && (
            <div className="block md:hidden bg-sky-50 border border-sky-200 mb-2 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsPoolExpanded(!isPoolExpanded)}
                className="w-full px-4 py-2.5 bg-sky-100/90 text-sky-900 font-bold text-xs flex items-center justify-between cursor-pointer border-none"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">inbox</span>
                  <span>未配置タスクプール</span>
                  <span className="bg-sky-600 text-white text-[11px] px-2 py-0.5 rounded-full font-extrabold">
                    {poolTasks.length}件
                  </span>
                </div>
                <span className="material-symbols-outlined text-base transition-transform duration-200">
                  {isPoolExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isPoolExpanded && (
                <div className="p-2 flex flex-col gap-2 max-h-48 overflow-y-auto bg-white/90">
                  {poolTasks.map(task => (
                    <PoolTaskCard 
                      key={task.task_id} 
                      task={task} 
                      groupingMode={groupingMode} 
                      onStartGrouping={handleStartGrouping} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 📱 タブレット・モバイル用 ドロワー (1024px未満) */}
      {isControlsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* バックドロップ（タップで閉じる） */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in" 
            onClick={() => setIsControlsDrawerOpen(false)}
          />
          
          {/* スライドイン ドロワー本体 */}
          <div className="relative w-84 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col p-4 overflow-y-auto border-r border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 font-black text-sm text-slate-800">
                <span className="material-symbols-outlined text-indigo-600">tune</span>
                <span>タイムライン表示設定</span>
              </div>
              <button
                type="button"
                onClick={() => setIsControlsDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1">
              <TimelineControls 
                timelineMode={timelineMode} 
                setTimelineMode={setTimelineMode}
              />
            </div>
          </div>
        </div>
      )}

      {/* 💻 PC版（1024px以上）: インライン常時表示 */}
      <div className="hidden lg:block">
        <TimelineControls 
          timelineMode={timelineMode} 
          setTimelineMode={setTimelineMode}
        />
      </div>

      <div 
        ref={containerRef} 
        className="relative flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-2xl bg-white shadow-xs pb-72 scrollbar-thin"
      >
        <LiveCurrentTimeLine timelineMode={timelineMode} containerRef={containerRef} rowRefs={rowRefs} />

        {outOfBoundsBeforeTasks.length > 0 && !isBeforeTasksDismissed && (
          <div className="my-2 mx-2 bg-amber-500/95 backdrop-blur-md text-white p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-md border border-amber-600 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                表示開始時刻（<strong>{timelineStartTime}</strong>）より前に <strong>{outOfBoundsBeforeTasks.length} 件</strong> の予定ケアタスクがあります
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimelineTimeRange('06:00', timelineEndTime)}
                className="!px-3 !py-1 !bg-white hover:!bg-amber-50 !text-amber-950 !rounded-lg !text-xs !font-extrabold cursor-pointer border-none shadow-xs transition-colors"
              >
                早出・全時間表示にする (06:00〜)
              </button>
              <button
                type="button"
                onClick={() => setIsBeforeTasksDismissed(true)}
                className="p-1 text-white/80 hover:text-white hover:bg-amber-600/60 rounded-full transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                title="この通知を閉じる"
                aria-label="閉じる"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
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
              isSortMode={isSortMode}
              activeId={activeId}
              timelineMode={timelineMode}
            />
          );
        })}

        {outOfBoundsAfterTasks.length > 0 && !isAfterTasksDismissed && (
          <div className="my-3 mx-2 bg-amber-500/95 backdrop-blur-md text-white p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-md border border-amber-600 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                表示終了時刻（<strong>{timelineEndTime}</strong>）以降に <strong>{outOfBoundsAfterTasks.length} 件</strong> の予定ケアタスクがあります
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimelineTimeRange(timelineStartTime, '24:00')}
                className="!px-3 !py-1 !bg-white hover:!bg-amber-50 !text-amber-950 !rounded-lg !text-xs !font-extrabold cursor-pointer border-none shadow-xs transition-colors"
              >
                全時間表示にする (〜24:00)
              </button>
              <button
                type="button"
                onClick={() => setIsAfterTasksDismissed(true)}
                className="p-1 text-white/80 hover:text-white hover:bg-amber-600/60 rounded-full transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                title="この通知を閉じる"
                aria-label="閉じる"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        )}

        {/* 🚀 最下部タイムラインが下部ドックおよび逃げたFABボタンの裏に隠れないための十分なボトムスペーサー */}
        <div className="h-96 shrink-0 pointer-events-none" />
      </div>

      <PendingTray 
        progressingTasks={isMobile ? extractUserProgressingTasks(storeAllTasks, userName) : []}
        pendingTasks={pendingTasks} 
        onTaskClick={setActivePopupTaskId} 
      />
      
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

                // 🎯 【病棟業務ルール：実施中は1つのみ】
                // 新しいタスクを実施中(progressing)にする場合、既存の実施中タスクを自動的に「中断・保留(pending)」へ移動
                if (s === 'progressing') {
                  const existingProgressing = storeAllTasks.find(
                    (other) => other.task_id !== t.task_id && other.status === 'progressing'
                  );
                  if (existingProgressing) {
                    handleUpdateStatus(existingProgressing.task_id, 'pending');
                    updateTask(existingProgressing.task_id, { status: 'pending', nurse_name: userName });
                  }
                }

                const messages: Record<ExtendedTaskStatus, string> = {
                  progressing: '実施を開始しました（前タスクは自動で中断・保留へ移動）',
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

      {/* 📱 モバイル時（isMobile === true）のみメモ追加FABをマウント */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setActiveMemoTime(new Date().toTimeString().slice(0, 5))}
          className="fixed right-4 z-[60] md:hidden bg-amber-400 hover:bg-amber-500 text-amber-950 p-3.5 rounded-full shadow-2xl flex items-center justify-center font-black active:scale-95 transition-all duration-300 ease-in-out border-2 border-amber-300 cursor-pointer"
          style={fabBottomStyle}
          title="メモを追加"
        >
          <span className="material-symbols-outlined text-2xl">add_notes</span>
        </button>
      )}

      {/* 📝 メモ作成・編集ポップアップマネージャー */}
      <MemoManager />

      <TimelineToast toast={toast} />
    </div>
  );
}