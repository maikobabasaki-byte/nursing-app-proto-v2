import { useState, useRef } from 'react';
import type { ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
import { TimelineControls} from './TimelineControls';
import { TimelineRow } from './TimelineRow';
import { LiveCurrentTimeLine } from './LiveCurrentTimeLine';
import { TimelinePopup } from '../Timeline/TimelinePopup';
import { MemoManager } from './MemoManager'; 
import { TimelineToast } from './TimelineToast';
import { TimelinePopupButtons } from './TimelinePopupButtons';
import { PendingTray } from './PendingTray';
import { useTimelineStore } from '../../stores/useTimelineStore'; // ★追加

export default function TimelineMain({ 
  timedTasks, 
  groupingMode,     
  setGroupingMode,
  memos, // ★ この4つだけでスッキリ受け取る
}: TimelineMainProps) {

  const handleUpdateStatus = useTimelineStore((state) => state.handleUpdateStatus);
  
  const extendedTasks = timedTasks as ExtendedTask[];

  // 🎯 表示に使うメモは、100%ストア（Zustand）側が管理しているものだけに一本化！
  // （これで親との間でピンポン感染のようなデータ再レンダリングループが発生しなくなります）
  const storeMemos = useTimelineStore((state) => state.memos);

  // 🎯 ポップアップの開閉状態もZustandから一本釣り
  const activePopupTaskId = useTimelineStore((state) => state.activePopupTaskId);
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);

  // 現在詳細を開いているタスクオブジェクトを特定
  const activePopupTask = extendedTasks.find(t => t.task_id === activePopupTaskId) || 
    extendedTasks.flatMap(t => t.children || []).find(c => c.task_id === activePopupTaskId);

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
      if (task.status === 'pending') {
        list.push(task);
      }
      if (task.isGroup && task.children) {
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

          const filteredRowTasks = currentRows.filter(t => {
            if (!t.isGroup && t.status === 'pending') return false;
            if (t.isGroup && t.status === 'pending') return false;   
            if (t.isChild && !t.isGroup) return false;              
            return true;
          });

          const filteredPlaceholders = currentRows.filter(t => !t.isGroup && t.status === 'pending');

          return (
            <TimelineRow 
              key={time}
              id={time}
              time={time}
              isCurrentRow={false} // 💡型エラー対策。現在時刻行の変数があればここに割り当ててください
              rowTasks={filteredRowTasks}         
              placeholders={filteredPlaceholders} 
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              setRowRef={(time, el) => rowRefs.current[time] = el}
              timeMemos={storeMemos} // ✅ ストアの独立したメモデータを渡す
              isPastTime={isPastTime}
            />
          );
        })}
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

                setActivePopupTaskId(null); 
                
                setToast({ 
                  message: messages[s] || 'ステータスを更新しました', 
                  visible: true, 
                  status: s 
                });
                
                handleUpdateStatus(t.task_id, s);

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