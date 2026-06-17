import { useState, useEffect, useRef } from 'react';
import type { Memo, ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
import { useTimelinePopup } from '../../hooks/useTimelinePopup';
import { TimelineControls } from './TimelineControls';
import { TimelineRow } from './TimelineRow';
import { TimelinePopup } from '../Timeline/TimelinePopup';
import { MemoManager } from './MemoManager';
import { TimelineToast } from './TimelineToast';
import { TimelinePopupButtons } from './TimelinePopupButtons';
import { PendingTray } from './PendingTray';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

export default function TimelineMain({ 
  timedTasks, 
  onUpdateTaskStatus,
  onUpdateTaskPeriod,
  onUngroupTask
}: TimelineMainProps) {
  const extendedTasks = timedTasks as unknown as ExtendedTask[];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [timelineMode, setTimelineMode] = useState<15 | 30 | 60>(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lineTop, setLineTop] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
   const { activePopupTask, setActivePopupTaskId, closePopup } = useTimelinePopup(extendedTasks);
  const [timeMemos, setTimeMemos] = useState<Memo[]>([]);
  const [activeMemoTime, setActiveMemoTime] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null); 
  const [newMemoText, setNewMemoText] = useState("");
  const [toast, setToast] = useState<{ message: string; visible: boolean; status: ExtendedTaskStatus | null }>({
    message: '', visible: false, status: null,
  });

  // 時刻関連のロジック（フック化する前の状態）
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const updateLinePosition = () => {
      if (!containerRef.current) return;
      const now = new Date();
      const currentKey = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / timelineMode) * timelineMode).padStart(2, '0')}`;
      const targetRow = rowRefs.current[currentKey];
      if (!targetRow) return;

      const offset = ((now.getMinutes() % timelineMode) * 60 + now.getSeconds()) / (timelineMode * 60) * targetRow.offsetHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      setLineTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
    };
    updateLinePosition();
    const timerId = setInterval(updateLinePosition, 1000);
    return () => clearInterval(timerId);
  }, [timelineMode]);

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

  const currentSlotKey = `${String(currentTime.getHours()).padStart(2, '0')}:${String(Math.floor(currentTime.getMinutes() / timelineMode) * timelineMode).padStart(2, '0')}`;
  const pendingTasks = extendedTasks.filter(task => task.status === 'pending');

  // TimelineMain.tsx の中
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newPeriod = over.id as string; // ここにドロップ先の「時間」が入ります

    // ここで親から渡された関数を呼び出す
    onUpdateTaskPeriod(taskId, newPeriod);
    
    console.log(`移動完了: ${taskId} を ${newPeriod} へ`);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
    <div className="flex flex-col h-full p-4 select-none">
      <TimelineControls timelineMode={timelineMode} setTimelineMode={setTimelineMode} />

      <div ref={containerRef} className="relative flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
        <div className="absolute left-0 right-0 !border-t-2 !border-red-500 z-10 pointer-events-none" style={{ top: `${lineTop}px`, transition: 'top 0.5s ease' }}>
          <span className="absolute left-0 -top-2.5 !bg-red-500 text-white text-[10px] px-1 rounded shadow">
            {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
          </span>
        </div>

        {timeSlots.map((time) => (
          <TimelineRow 
            key={time}
            time={time}
            isCurrentRow={time === currentSlotKey}
            rowTasks={extendedTasks.filter(t => t.display_period === time && t.status !== 'pending' && !t.isChild)}
            placeholders={extendedTasks.filter(t => t.display_period === time && t.status === 'pending')}
            expandedGroups={expandedGroups}
            onDrop={() => {}} 
            onDragOver={(e) => e.preventDefault()}
            onEdit={(t) => {
              if (t.isGroup) setExpandedGroups(prev => ({...prev, [t.task_id]: !prev[t.task_id]}));
              else setActivePopupTaskId(t.task_id);
            }}
            onChildClick={setActivePopupTaskId}
            onUngroup={onUngroupTask}
            setRowRef={(time, el) => rowRefs.current[time] = el}
            timeMemos={timeMemos}
            onMemoClick={setActiveMemoTime}
            onEditMemo={setEditingMemo}
            isPastTime={isPastTime}
          />
        ))}
      </div>

      <PendingTray pendingTasks={pendingTasks} onTaskClick={setActivePopupTaskId} />
      
      <MemoManager
        activeMemoTime={activeMemoTime}
        editingMemo={editingMemo}
        newMemoText={newMemoText}
        setNewMemoText={setNewMemoText}
        onClose={() => { setActiveMemoTime(null); setEditingMemo(null); }}
        onSave={(data) => {
          if (editingMemo) setTimeMemos(prev => prev.map(m => m.id === data.id ? data : m));
          else setTimeMemos(prev => [...prev, data]);
          setActiveMemoTime(null); setEditingMemo(null);
        }}
        onDelete={(id) => { setTimeMemos(prev => prev.filter(m => m.id !== id)); setEditingMemo(null); }}
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
    </DndContext>
  );
}
