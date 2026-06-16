  import { useState, useEffect, useRef } from 'react';
  import type { Task, TaskStatus,Memo, ExtendedTaskStatus, ExtendedTask, TimelineMainProps } from '../../types/types';
  import { TimelineControls } from './TimelineControls';
  import { getTaskStyles } from '../../utils/taskStyles';
  import { TaskCard } from './TaskCard';
  import { GroupAccordion } from './GroupAccordion';
  import { TimelinePopup } from '../Timeline/TimelinePopup'
  import { MemoPopup } from './MemoPopup';
  import { MemoCell } from './MemoCell';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
// import { DraggableTask } from './DraggableTask'; 
// import { DroppableRow } from './DroppableRow';     



  


  export default function TimelineMain({ 
    timedTasks, 
    onUpdateTaskPeriod, 
    onUpdateTaskStatus,
    onGroupTasks,
    onUngroupTask
  }: TimelineMainProps) {
    // キャスト処理を集約させて安全に扱う
    const extendedTasks = timedTasks as unknown as ExtendedTask[];

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [timelineMode, setTimelineMode] = useState<15 | 30 | 60>(30);
    const [currentTime, setCurrentTime] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [activePopupTaskId, setActivePopupTaskId] = useState<string | null>(null);
    const [lineTop, setLineTop] = useState<number>(0);
    const [timeMemos, setTimeMemos] = useState<Memo[]>([]);
    const [activeMemoTime, setActiveMemoTime] = useState<string | null>(null);
    const [editingMemo, setEditingMemo] = useState<Memo | null>(null); 
    const [newMemoText, setNewMemoText] = useState("");

    const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newTime = over.id as string; // DroppableRow の ID に時刻を使用

    onUpdateTaskPeriod(taskId, newTime);
  };
  
    // 💡 toast の状態に status も保持
    const [toast, setToast] = useState<{ message: string; visible: boolean; status: ExtendedTaskStatus | null }>({
      message: '',
      visible: false,
      status: null,
    });

    // 修正後：親タスクだけでなく、グループの中（children）まで全探索してタスクを見つける
  const activePopupTask = (() => {
    if (!activePopupTaskId) return null;
    
    for (const task of extendedTasks) {
      // 1. 親タスク自体が一致した場合
      if (task.task_id === activePopupTaskId) return task;
      
      // 2. グループタスクの場合、その中身（children）からも探す
      if (task.isGroup && task.children) {
        const foundChild = task.children.find(c => c.task_id === activePopupTaskId);
        if (foundChild) return foundChild;
      }
    }
    return null;
  })();

    const stepsPerHour = 60 / timelineMode;
    const timeSlots = Array.from({ length: 24 * stepsPerHour }, (_, i) => {
      const h = String(Math.floor(i / stepsPerHour)).padStart(2, '0');
      const m = String((i % stepsPerHour) * timelineMode).padStart(2, '0');
      return `${h}:${m}`;
    });

    const currentSlotKey = `${String(currentTime.getHours()).padStart(2, '0')}:${String(
      Math.floor(currentTime.getMinutes() / timelineMode) * timelineMode
    ).padStart(2, '0')}`;

    // 1秒ごとの時計更新
    useEffect(() => {
      const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timerId);
    }, []);

    // 現在時刻の赤いインジケータ線の位置計算
    useEffect(() => {
      const updateLinePosition = () => {
        if (!containerRef.current) return;
        const now = new Date();
        const currentKey = `${String(now.getHours()).padStart(2, '0')}:${String(
          Math.floor(now.getMinutes() / timelineMode) * timelineMode
        ).padStart(2, '0')}`;

        const targetRow = rowRefs.current[currentKey];
        if (!targetRow) return;

        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const rowHeight = targetRow.offsetHeight;
        const offset = ((minutes % timelineMode) * 60 + seconds) / (timelineMode * 60) * rowHeight;
        const containerRect = containerRef.current.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        
        setLineTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
      };

      updateLinePosition();
      const timerId = setInterval(updateLinePosition, 1000);
      return () => clearInterval(timerId);
    }, [timelineMode]); 

    const handleStatusChange = (task: ExtendedTask, nextStatus: ExtendedTaskStatus) => {
      if (task.status === nextStatus) return;

      let message = '';
      switch (nextStatus) {
        case 'progressing':
          message = task.status === 'pending' ? '実施を再開します' : '実施を開始します';
          break;
        case 'pending':
          message = '処置を一時中断します';
          break;
        case 'completed':
          message = '実施を完了しました';
          break;
        case 'record_start':
          message = task.status === 'record_pending' ? '記録を再開します' : '記録を開始します';
          break;
        case 'record_pending':
          message = '記録を一時中断します';
          break;
        case 'record_complete':
          message = '記録を完了しました';
          break;
        case 'unexecuted':
          message = '未実施に設定しました';
          break;
        case 'initial':
        case 'untouched':
          message = 'ステータスを初期化しました';
          break;
        default:
          message = 'ステータスを更新しました';
      }

      setActivePopupTaskId(null);
      setToast({ message, visible: true, status: nextStatus });

      if (onUpdateTaskStatus) {
        onUpdateTaskStatus(task.task_id, nextStatus);
      }
    };

    // トースト自動非表示
    useEffect(() => {
      if (toast.visible) {
        const timer = setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [toast.visible]);

    const renderPopupButtons = (task: ExtendedTask) => {
      const currentStatus = task.status;

      return (
        <div className="flex flex-col gap-2">
          {(currentStatus === 'initial' || currentStatus === 'untouched') && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-cyan-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-cyan-700 transition-colors">実施開始</button>
              <button type="button" onClick={() => handleStatusChange(task, 'unexecuted')} className="w-full flex justify-center !py-2.5 !bg-red-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-red-700 transition-colors">未実施</button>
            </>
          )}
          
          {currentStatus === 'progressing' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'pending')} className="w-full flex justify-center !py-2.5 !bg-orange-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-orange-600 transition-colors">中断・保留</button>
              <button type="button" onClick={() => handleStatusChange(task, 'completed')} className="w-full flex justify-center !py-2.5 !bg-green-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-green-700 transition-colors">実施完了</button>
              <button type="button" onClick={() => handleStatusChange(task, 'unexecuted')} className="w-full flex justify-center !py-2.5 !bg-red-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-red-700 transition-colors">未実施</button>
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}
          
          {currentStatus === 'pending' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-cyan-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-cyan-700 transition-colors">再開</button>          
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}
          
          {currentStatus === 'completed' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'record_start')} className="w-full flex justify-center !py-2.5 !bg-blue-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-blue-700 transition-colors">記録開始</button>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-gray-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-500 transition-colors">実施中に戻す</button>
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}

          {currentStatus === 'record_start' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'record_complete')} className="w-full flex justify-center !py-2.5 !bg-purple-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-purple-700 transition-colors">記録完了</button>
              <button type="button" onClick={() => handleStatusChange(task, 'record_pending')} className="w-full flex justify-center !py-2.5 !bg-orange-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-orange-500 transition-colors">記録を一時中断</button>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-gray-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-500 transition-colors">実施中に戻す</button>
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}

          {currentStatus === 'record_pending' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'record_start')} className="w-full flex justify-center !py-2.5 !bg-blue-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-blue-700 transition-colors">記録を再開</button>
              <button type="button" onClick={() => handleStatusChange(task, 'record_complete')} className="w-full flex justify-center !py-2.5 !bg-purple-600 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-purple-700 transition-colors">記録完了</button>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-gray-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-500 transition-colors">実施中に戻す</button>
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}

          {currentStatus === 'record_complete' && (
            <>
              <button type="button" onClick={() => handleStatusChange(task, 'record_start')} className="w-full flex justify-center !py-2.5 !bg-purple-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-purple-500 transition-colors">記録完了を取り消す</button>
              <button type="button" onClick={() => handleStatusChange(task, 'progressing')} className="w-full flex justify-center !py-2.5 !bg-gray-400 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-500 transition-colors">実施中に戻す</button>
              <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">初期化</button>
            </>
          )}
          
          {currentStatus === 'unexecuted' && (
            <button type="button" onClick={() => handleStatusChange(task, 'initial')} className="w-full flex justify-center !py-2.5 !bg-gray-500 !text-white !font-bold !rounded-lg !text-lg !shadow cursor-pointer hover:bg-gray-600 transition-colors">未実施を取り消す</button>
          )}
        </div>
      );
    };

    const pendingTasks = extendedTasks.filter(task => task.status === 'pending');

    // 時間（"10:00" など）を比較して、target が現在時刻を過ぎているか判定する関数
    const isPastTime = (targetTime: string): boolean => {
      if (!targetTime || !targetTime.includes(':')) return false;

      const now = new Date();
      const [currentHours, currentMinutes] = [now.getHours(), now.getMinutes()];
      const [targetHours, targetMinutes] = targetTime.split(':').map(Number);

      // 時間を分単位に換算して比較
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      const targetTotalMinutes = targetHours * 60 + targetMinutes;

      return currentTotalMinutes > targetTotalMinutes;
    };

    return (
      <div className="flex flex-col h-full p-4 select-none">
        {/* コントロールエリア */}
        <TimelineControls 
      timelineMode={timelineMode} 
      setTimelineMode={setTimelineMode} 
    />
        

        {/* タイムライン本体コンテナ */}
        <div ref={containerRef} id="timeline-container" className="relative flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
          {/* 現在時刻の赤いインジケータ線 */}
          <div
            id="current-time-line"
            className="absolute left-0 right-0 !border-t-2 !border-red-500 z-10 pointer-events-none"
            style={{ top: `${lineTop}px`, transition: 'top 0.5s ease' }}
          >
            <span className="absolute left-0 -top-2.5 !bg-red-500 text-white text-[10px] px-1 rounded shadow">
              {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
            </span>
          </div>

          {/* ⏰ 縦軸の時間行を生成 */}
          {timeSlots.map((time) => {
            const isCurrentRow = time === currentSlotKey;
            const rowTasks = extendedTasks.filter(task => task.display_period === time && task.status !== 'pending' && !task.isChild);
            const placeholders = extendedTasks.filter(task => task.display_period === time && task.status === 'pending');

            return (
              <div
                key={time}
                ref={(el) => { rowRefs.current[time] = el; }}
                // 【最重要】ここでの preventDefault がドロップの鍵です
      onDragOver={(e) => {
        e.preventDefault(); 
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        console.log("Dropping into row:", time, "ID:", draggedId); // ログで確認
        handleDropAction(draggedId, time);
      }}
                className={`flex !border-b !border-gray-200 min-h-[60px] ${isCurrentRow ? 'bg-amber-50/50 is-current-row' : ''}`}
              >
                {/* 時間ラベル列 */}
                <div className="w-16 min-w-[64px] text-center py-4 font-bold text-gray-500 bg-gray-50 border-r border-gray-100 select-none">
                  {time}
                </div>

                {/* メインタスク設置グリッド */}
                <div
                  id={`task-grid-${time.replace(':', '')}`}
                  className="p-2 min-h-[60px] relative flex flex-wrap flex-1 gap-2"
                >
                  {/* 1. 看板（プレースホルダー）の描画 */}
                  {placeholders.map(task => (
                    <div
                      key={`placeholder-${task.task_id}`}
                      className="w-60 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 p-2 m-2 rounded shadow-sm flex flex-col justify-center items-center font-bold text-xs h-[84px]"
                    >
                      <span className="text-gray-500 font-bold mb-1">【中断・保留中】</span>
                      <span>{task.room_id}号室 {task.patient_name}様</span>
                    </div>
                  ))}
                  {/* 2. タスクカードの描画 */}
                  {rowTasks.map(task => {
                    const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);
                    const originalTime = task.initial_period || task.display_period;

                    return (
                      <div key={task.task_id}
                      onDragOver={(e) => {
    e.preventDefault(); // ここで必ずpreventDefaultを入れる
    e.stopPropagation(); // これが干渉していないか一旦外して試す
  }}
  onDrop={(e) => {
    e.preventDefault();
    e.stopPropagation(); 
    const draggedId = e.dataTransfer.getData('text/plain');
    handleDropAction(draggedId, task.display_period, task.task_id);
  }}
                        className="relative">
                        <TaskCard 
                          task={task}
                          cardColorClass={cardColorClass}
                          borderStyle={borderStyle}
                          originalTime={originalTime}
                          draggable={true} // これがtrueになっていることを確認
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', task.task_id);
    e.dataTransfer.effectAllowed = 'move';
    console.log("Drag Started:", task.task_id); // ログが出ていれば成功
  }}
                          onEdit={() => {
                            if (task.isGroup) {
                              setExpandedGroups(prev => ({ ...prev, [task.task_id]: !prev[task.task_id] }));
                            } else {
                              setActivePopupTaskId(task.task_id);
                            }
                          }}
                        />
                        
                        {task.isGroup && (
                          <GroupAccordion 
                            task={task} 
                            isExpanded={!!expandedGroups[task.task_id]}
                            onChildClick={setActivePopupTaskId}
                            onUngroup={onUngroupTask}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* ✨ メモ専用列 */}
                <div
                  className="w-48 border-l border-gray-200 bg-yellow-50/10 flex flex-col p-1 gap-1 cursor-pointer hover:bg-yellow-100 transition-colors group relative"
                  onClick={() => setActiveMemoTime(time)} // 行全体をクリックで新規作成
                >
                  {timeMemos
                    .filter((memo) => memo.time === time)
                    .map((memo) => (
                      <MemoCell 
                        key={memo.id}   // keyはここへ
                        memo={memo}     // 配列ではなく、個別のメモを渡す
                        onEdit={(m) => {
                          setActiveMemoTime(null);
                          setEditingMemo(m);
                        }}
                      />
                    ))
                  }

                  {/* 「+ メモを追加」の表示 */}
                  <span className="text-xs text-yellow-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 flex items-center justify-center pointer-events-none">
                    + メモを追加
                  </span>
                </div>
              </div>
            );
          })}
        </div> 

        {/* 下部固定トレイ */}
        {pendingTasks.length > 0 && (
          <div className="fixed bottom-12 left-0 right-0 bg-orange-50 border-t-2 border-orange-400 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40 animate-slide-up">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <div className="flex flex-col items-center justify-center bg-orange-500 text-white font-black text-xs px-3 py-2 rounded-xl shadow-sm min-w-[100px] shrink-0 gap-0.5">
                <span className="text-base animate-pulse">⚠️</span>
                <span>中断・保留中</span>
                <span className="bg-orange-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {pendingTasks.length}件
                </span>
              </div>

              <div className="flex flex-1 gap-3 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                {pendingTasks.map(task => (
                  <div
                    key={task.task_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePopupTaskId(task.task_id);
                    }}
                    className="w-56 p-2 rounded-lg shadow border bg-white border-orange-300 text-gray-800 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all shrink-0 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mb-1">
                      <span>{task.room_id}号室</span>
                      <span className="bg-orange-100 text-orange-700 px-1 rounded">予定: {task.display_period}</span>
                    </div>
                    <div className="text-xs font-black truncate text-left">{task.patient_name}様</div>
                    <div className="text-xs text-gray-600 truncate text-left mt-0.5">{task.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🎯 メモ用ポップアップ (新規作成用 と 編集・削除用) */}
        {(activeMemoTime || editingMemo) && (
          <MemoPopup
            editingMemo={editingMemo}
            activeMemoTime={activeMemoTime}
            newMemoText={newMemoText}
            setNewMemoText={setNewMemoText}
            onClose={() => { setActiveMemoTime(null); setEditingMemo(null); }}
            onSave={(data) => {
              if (editingMemo) {
                setTimeMemos(prev => prev.map(m => m.id === data.id ? data : m));
              } else {
                setTimeMemos(prev => [...prev, data]);
              }
              setActiveMemoTime(null);
              setEditingMemo(null);
            }}
            onDelete={(id) => {
              setTimeMemos(prev => prev.filter(m => m.id !== id));
              setEditingMemo(null);
            }}
          />
        )}


        🎯 ポップアップ表示エリア
        {activePopupTaskId && activePopupTask && (
          <TimelinePopup 
            task={activePopupTask}
            onClose={() => setActivePopupTaskId(null)}
            renderPopupButtons={renderPopupButtons}
          />
        )}


        {/* ステータス連動型 フルカラー・全画面オーバーレイ */}
        {toast.visible && toast.status && (() => {
          const overlayColors: Record<ExtendedTaskStatus, { overlayBg: string; cardBg: string; border: string }> = {
            progressing: { overlayBg: 'bg-cyan-950/70', cardBg: 'bg-cyan-900', border: 'border-cyan-500' },
            pending: { overlayBg: 'bg-orange-950/70', cardBg: 'bg-orange-900', border: 'border-orange-500' },
            completed: { overlayBg: 'bg-emerald-950/70', cardBg: 'bg-emerald-900', border: 'border-emerald-500' },
            record_start: { overlayBg: 'bg-blue-950/70', cardBg: 'bg-blue-900', border: 'border-blue-500' },
            record_pending: { overlayBg: 'bg-amber-950/70', cardBg: 'bg-amber-900', border: 'border-amber-500' },
            record_complete: { overlayBg: 'bg-purple-950/70', cardBg: 'bg-purple-900', border: 'border-purple-500' },
            unexecuted: { overlayBg: 'bg-red-950/70', cardBg: 'bg-red-900', border: 'border-red-500' },
            initial: { overlayBg: 'bg-slate-950/70', cardBg: 'bg-slate-900', border: 'border-slate-500' },
            untouched: { overlayBg: 'bg-slate-950/70', cardBg: 'bg-slate-900', border: 'border-slate-500' },
          };

          const theme = overlayColors[toast.status] || overlayColors.initial;

          return (
            <div className={`fixed inset-0 ${theme.overlayBg} flex items-center justify-center z-[60] pointer-events-auto backdrop-blur-[2px] animate-fade-in`}>
              <div className={`${theme.cardBg} ${theme.border} border-2 text-white text-2xl font-black px-10 py-6 rounded-2xl shadow-2xl flex items-center gap-4`}>
                <div>{toast.message}</div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }
  