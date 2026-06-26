import { useState, useEffect, useRef } from 'react';
import type { Memo, ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
import { useTimelinePopup } from '../../hooks/useTimelinePopup';
import { TimelineControls} from './TimelineControls';
import { TimelineRow } from './TimelineRow';
import { TimelinePopup } from '../Timeline/TimelinePopup';
import { MemoManager } from './MemoManager';
import { TimelineToast } from './TimelineToast';
import { TimelinePopupButtons } from './TimelinePopupButtons';
import { PendingTray } from './PendingTray';
import type { DragEndEvent } from '@dnd-kit/core';

export default function TimelineMain({ 
  timedTasks, 
  onUpdateTaskStatus,
  onUpdateTaskPeriod,
  onUngroupTask,
  groupingMode,     
  setGroupingMode,
  onStartGrouping,
  memos,
  onSaveMemo,
  onDeleteMemo
}: TimelineMainProps) {
  const extendedTasks = timedTasks as ExtendedTask[];

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
  
   const { activePopupTask, setActivePopupTaskId, closePopup } = useTimelinePopup(extendedTasks);
  const [activeMemoTime, setActiveMemoTime] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null); 
  const [newMemoText, setNewMemoText] = useState("");
  const [toast, setToast] = useState<{ message: string; visible: boolean; status: ExtendedTaskStatus | null }>({
    message: '', visible: false, status: null,
  });


  const isPastTime = (targetTime: string): boolean => {
    if (!targetTime || !targetTime.includes(':')) return false;
    const now = new Date();
    const [h, m] = targetTime.split(':').map(Number);
    return (now.getHours() * 60 + now.getMinutes()) > (h * 60 + m);
  };

  const timeSlots = Array.from({ length: 24 * (60 / timelineMode) }, (_, i) => {
    const h = String(Math.floor(i / (60 / timelineMode))).padStart(2, '0');
    const m = String((i % (60 / timelineMode)) * timelineMode).padStart(2, '0');
    return `${h}:${m}`;
  });
  const pendingTasks = (() => {
    const list: ExtendedTask[] = [];
    extendedTasks.forEach(task => {
      // 1. 通常の単体タスク、または親グループ自体が保留の場合
      if (task.status === 'pending') {
        list.push(task);
      }
      // 2. グループの中の「子タスク」に保留がいる場合もトレイに送る
      if (task.isGroup && task.children) {
        task.children.forEach(child => {
          if (child.status === 'pending') {
            list.push({
              ...child,
              parent_id: task.task_id // トレイからポップアップを開いたときのために親IDを保証
            });
          }
        });
      }
    });
    return list;
  })();

  
  return (
    <div className="flex flex-col h-full p-4 select-none">
      <TimelineControls 
        timelineMode={timelineMode} 
        setTimelineMode={setTimelineMode}
        groupingMode={groupingMode}        
        setGroupingMode={setGroupingMode}  
      />

      <div 
      ref={containerRef} 
      className="relative flex-1 overflow-y-auto border border-gray-200 rounded bg-white"
      >
        <LiveCurrentTimeLine timelineMode={timelineMode} containerRef={containerRef} rowRefs={rowRefs} />

        {timeSlots.map((time) => {
          const currentRows = extendedTasks.filter(t => t.display_period === time);

          // 📋 通常のタスク（グループはそのまま通し、子タスクも保持する）
          const filteredRowTasks = currentRows.filter(t => {
            if (!t.isGroup && t.status === 'pending') return false; // 単体の保留はトレイへ
            if (t.isGroup && t.status === 'pending') return false;   // 親全体の保留はトレイへ
            if (t.isChild && !t.isGroup) return false;              // 通常の子タスク単体はスキップ
            return true;
          });

          // ⏳ 【ここを修正】ここには「単体タスクの保留」だけを渡す（子タスクの保留は入れない）
          const filteredPlaceholders = currentRows.filter(t => !t.isGroup && t.status === 'pending');

          return (
            <TimelineRow 
              key={time}
              id={time}
              time={time}
              rowTasks={filteredRowTasks}         
              placeholders={filteredPlaceholders} 
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              onEdit={(t) => {
                if (t.isGroup) setExpandedGroups(prev => ({...prev, [t.task_id]: !prev[t.task_id]}));
                else setActivePopupTaskId(t.task_id);
              }}
              onChildClick={setActivePopupTaskId}
              onUngroup={onUngroupTask}
              setRowRef={(time, el) => rowRefs.current[time] = el}
              timeMemos={memos}
              onMemoClick={setActiveMemoTime}
              onEditMemo={setEditingMemo}
              isPastTime={isPastTime}
              groupingMode={groupingMode}
              onStartGrouping={onStartGrouping}
            />
          );
        })}
      </div>

      <PendingTray pendingTasks={pendingTasks} onTaskClick={setActivePopupTaskId} />
      
      <MemoManager
        activeMemoTime={activeMemoTime}
        editingMemo={editingMemo}
        newMemoText={newMemoText}
        setNewMemoText={setNewMemoText}
        onClose={() => { setActiveMemoTime(null); setEditingMemo(null); }}
        onSave={(data) => {
          onSaveMemo(data);
          setActiveMemoTime(null); 
          setEditingMemo(null);
        }}
        onDelete={(id) => { 
          onDeleteMemo(id); 
          setEditingMemo(null); 
        }}
      />

      {activePopupTask && (
        <TimelinePopup 
          task={activePopupTask}
          onClose={closePopup} // closePopup は useTimelinePopup から来ているはずです
          renderPopupButtons={(task) => (
            <TimelinePopupButtons 
              task={task} 
              onStatusChange={(t, s) => {
                // ステータスに応じたメッセージの定義
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
                };

                // 1. まず確実に閉じる
                closePopup(); 
                
                // 2. ステータスに応じたメッセージを表示
                setToast({ 
                  message: messages[s] || 'ステータスを更新しました', 
                  visible: true, 
                  status: s 
                });
                
                // 3. データ更新
                if (onUpdateTaskStatus) onUpdateTaskStatus(t.task_id, s);

                // 4. 1.5秒後にトーストを非表示にする
                setTimeout(() => {
                  setToast(prev => ({ ...prev, visible: false }));
                }, 1500);
              }}
            />
          )}
        />
      )}

      <TimelineToast toast={toast} />
    </div>
  );
}
// 💡 タイマーによる再レンダリングをこの中だけに閉じ込める
function LiveCurrentTimeLine({ timelineMode, containerRef, rowRefs }: { 
  timelineMode: number; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  rowRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const [time, setTime] = useState(new Date());
  const [top, setTop] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current || !rowRefs.current) return;
      const now = new Date();
      const currentKey = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / timelineMode) * timelineMode).padStart(2, '0')}`;
      const targetRow = rowRefs.current[currentKey];
      if (!targetRow) return;

      const offset = ((now.getMinutes() % timelineMode) * 60 + now.getSeconds()) / (timelineMode * 60) * targetRow.offsetHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      setTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
    };

    updatePosition();
    const timerId = setInterval(updatePosition, 1000);
    return () => clearInterval(timerId);
  }, [timelineMode, containerRef, rowRefs, time]); // 1秒ごとにここだけが静かに動く

  return (
    <div className="absolute left-0 right-0 !border-t-2 !border-red-500 z-10 pointer-events-none" style={{ top: `${top}px`, transition: 'top 0.5s ease' }}>
      <span className="absolute left-0 -top-2.5 !bg-red-500 text-white text-[10px] px-1 rounded shadow">
        {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
      </span>
    </div>
  );
}
