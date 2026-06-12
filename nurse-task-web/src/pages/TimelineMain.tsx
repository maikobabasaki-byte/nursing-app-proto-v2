import { useState, useEffect, useRef } from 'react';
import type { Task, TaskStatus } from '../types/types';

// 💡 記録中断のステータス（型定義の拡張対応）
type ExtendedTaskStatus = TaskStatus | 'record_pending';

// Task型の拡張（コンポーネント内部で安全に使うため）
interface ExtendedTask extends Omit<Task, 'status'> {
  status: ExtendedTaskStatus;
  isChild?: boolean;
  isGroup?: boolean;
  children?: ExtendedTask[];
  initial_period?: string;
}

interface TimelineMainProps {
  timedTasks: Task[]; 
  onUpdateTaskPeriod: (taskId: string, newPeriod: string) => void; 
  onUpdateTaskStatus?: (taskId: string, newStatus: ExtendedTaskStatus) => void;
  onGroupTasks: (draggedId: string, targetId: string) => void;
  onUngroupTask: (groupId: string, childTaskId: string, currentPeriod: string) => void;
}

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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, targetTime: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateTaskPeriod(taskId, targetTime); 
    }
  };

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
      <div id="controls-area" className="flex space-x-2 mb-4 bg-gray-100 p-2 rounded shadow-inner">
        {([
          { label: '1時間', value: 60 },
          { label: '30分', value: 30 },
          { label: '15分', value: 15 },
        ] as const).map((config) => (
          <button
            key={config.value}
            type="button"
            className={`!px-4 !py-2 !text-sm !font-bold !rounded !transition-colors !cursor-pointer ${
              timelineMode === config.value ? '!bg-blue-600 !text-white shadow' : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
            onClick={() => setTimelineMode(config.value)}
          >
            {config.label}
          </button>
        ))}
      </div>

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
                data-time={time}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, time)}
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

                {/* 2. 実際のタスクカードの描画 */}
                {rowTasks.map(task => {
                  const isExpanded = !!expandedGroups[task.task_id];
                  const isRecordDone = task.status === 'record_complete';
                  const isActionRequiredDone = ['completed', 'record_start', 'record_pending'].includes(task.status);
                  
                  let cardColorClass = '';
                  if (task.isGroup) {
                    cardColorClass = 'bg-[#1e3a6a] border-[#1e3a6a] text-white';
                  } else if (task.status === 'pending') {
                    cardColorClass = 'bg-orange-400 border-orange-300 text-gray-900';
                  } else if (isRecordDone) {
                    cardColorClass = 'bg-slate-200/60 border-slate-200 text-gray-400';
                  } else if (isActionRequiredDone) {
                    cardColorClass = 'bg-slate-300 border-slate-200 text-gray-900';
                  } else {
                    const priorityColors = {
                      high: 'bg-red-300 border-red-200 text-gray-900',
                      medium: 'bg-green-300 border-green-200 text-gray-900',
                      low: 'bg-blue-300 border-blue-200 text-gray-900',
                    };
                    cardColorClass = priorityColors[task.priority as 'high' | 'medium' | 'low'] || 'bg-white border-gray-200 text-gray-800';
                  }

                  const isProgressing = task.status === 'progressing';
                  // 1. まず「時間を過ぎているか」の判定を作る
                  const isOverdue = isPastTime(task.display_period) && !isRecordDone && !isActionRequiredDone;

                  // 2. その判定を使って、枠線のスタイルを3段階に分岐させる
                  const borderStyle = isOverdue
                    ? '!border-2 !border-red-600 shadow-md shadow-red-100' // 🚨 時間を過ぎたら赤枠
                    : isProgressing 
                      ? '!border-2 !border-blue-600 shadow-md scale-[1.01]'               // 🟦 実施中なら青枠
                      : 'border';                                                          // ⬜ 通常時
                  const originalTime = task.initial_period || task.display_period;

                  return (
                    <div key={task.task_id} className="relative">
                      {/* タスクカード本体 */}
                      <div 
                        draggable={task.status !== 'pending'} 
                        onDragStart={(e) => handleDragStart(e, task.task_id)}
                        onDragOver={(e) => {
                          if (task.priority !== 'high') {
                            e.preventDefault();
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const draggedId = e.dataTransfer.getData('text/plain');
                          if (draggedId && draggedId !== task.task_id) {
                            onGroupTasks(draggedId, task.task_id);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          // グループ化されているカードなら、シングルクリックではポップアップを開かない（またはアコーディオンを開閉させる）
                          if (task.isGroup) {
                            // 💡 好みに合わせてどちらかを選んでください：
                            
                            // パターンA：グループカードはシングルクリックでアコーディオンを開閉させる場合（ダブルクリックの手間が省けて直感的になります）
                            setExpandedGroups(prev => ({ ...prev, [task.task_id]: !prev[task.task_id] }));
                          } else {
                            // 通常タスクカードのみ、今まで通りポップアップを開く
                            setActivePopupTaskId(task.task_id);
                          }
                        }}
                        onDoubleClick={(e) => {
                          if (task.isGroup) {
                            e.stopPropagation();
                            setExpandedGroups(prev => ({ ...prev, [task.task_id]: !prev[task.task_id] }));
                          }
                        }}
                        className={`w-60 p-2 m-2 rounded shadow-sm font-bold cursor-grab active:cursor-grabbing transition-all select-none ${cardColorClass} ${borderStyle}`}
                      >
                        {task.isGroup ? (
                          <div className="text-center py-1">
                            <div className="text-[10px] opacity-80 font-bold">午前</div>
                            <div className="text-lg font-black my-0.5">
                              0/{task.children?.length || 0}
                            </div>
                            <div className="text-xs font-bold tracking-wider">{task.title}</div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-size-sm font-bold">{task.display_period}</span>
                                {originalTime && originalTime !== time && (
                                  <span className="bg-gray-700 text-white text-[9px] px-1.5 py-0.5 rounded font-normal opacity-90">
                                    指示: {originalTime}
                                  </span>
                                )}
                              </div>
                              {task.status === 'completed' && <span className="text-blue-500 text-xs animate-pulse" title="記録未完了">🔵</span>}
                              {task.status === 'record_start' && <span className="text-green-500 text-xs animate-pulse" title="記録中">🟢</span>}
                              {task.status === 'record_pending' && <span className="text-orange-500 text-xs animate-pulse" title="記録中断中">🟠</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-1 mb-1 text-sm">
                              <span>{task.room_id}号室</span>
                              <span className='col-span-2 text-left'>{task.patient_name}様</span>
                            </div>
                            <div className="text-sm text-left">{task.title}</div>
                            {task.details && (
                              <div className="text-[11px] font-normal mt-0.5 border-t border-dashed border-current/20 pt-0.5 opacity-80 text-left">
                                {task.details}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* アコーディオン展開部分 */}
                      {task.isGroup && isExpanded && (
                        <div className="absolute top-[90%] left-2 w-60 bg-[#1e3a6a] rounded-xl p-2 z-30 shadow-xl flex flex-col gap-2 border border-blue-900 animate-fade-in max-h-[320px] overflow-y-auto scrollbar-thin">
                          {task.children?.map((child) => {
                            let childColorClass = 'bg-white border-gray-200 text-gray-800';
                            const priorityColors = {
                              high: 'bg-red-300 border-red-200 text-gray-900',
                              medium: 'bg-green-300 border-green-200 text-gray-900',
                              low: 'bg-blue-300 border-blue-200 text-gray-900',
                            };
                            childColorClass = priorityColors[child.priority as 'high' | 'medium' | 'low'] || childColorClass;

                            return (
                              <div 
                                key={child.task_id}
                                className={`p-2 rounded-lg border shadow-sm text-xs relative text-left transition-transform active:scale-[0.98] ${childColorClass}`}
                                
                                // ✨ ここを追加！子タスクをクリックしたらポップアップを開く
                                onClick={(e) => {
                                  e.stopPropagation(); // 🔴 親グループカードのクリック（開閉）が動かないようにブロック！
                                  setActivePopupTaskId(child.task_id); // 🎉 子タスクのポップアップを表示
                                }}
                              >
                                <div className="font-bold flex justify-between items-center mb-0.5">
                                  <span className="opacity-75">午前 {child.room_id}号室</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation(); // 🔴 ポップアップが開かないようにボタンのクリックもブロック
                                      onUngroupTask(task.task_id, child.task_id, task.display_period);
                                    }}
                                    className="!bg-white hover:!bg-gray-200 text-gray-800 !px-1.5 !py-0.5 !rounded text-[9px] font-bold transition-colors cursor-pointer"
                                  >
                                    外す
                                  </button>
                                </div>
                                <div className="font-black text-sm">{child.patient_name}様</div>
                                <div className="opacity-90 text-[11px]">{child.title}</div>
                              </div>
                            );
                          })}
                        </div>
                    )}
                    </div>
                  );
                })}
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

      {/* 🎯 ポップアップ表示エリア */}
      {activePopupTaskId && activePopupTask && (() => {
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
        };

        let statusLabel = '未着手';
        let labelBgClass = 'bg-gray-200 text-gray-700';
        const currentStatus = activePopupTask.status;

        if (currentStatus === 'progressing') {
          statusLabel = '実施中';
          labelBgClass = 'bg-cyan-600 text-white';
        } else if (currentStatus === 'pending') {
          statusLabel = '中断中';
          labelBgClass = 'bg-orange-500 text-white';
        } else if (currentStatus === 'completed') {
          statusLabel = '実施完了';
          labelBgClass = 'bg-green-600 text-white';
        } else if (currentStatus === 'record_start') {
          statusLabel = '記録中';
          labelBgClass = 'bg-blue-600 text-white';
        } else if (currentStatus === 'record_pending') {
          statusLabel = '記録中断';
          labelBgClass = 'bg-orange-500 text-white';
        } else if (currentStatus === 'record_complete') {
          statusLabel = '記録完了';
          labelBgClass = 'bg-purple-600 text-white';
        } else if (currentStatus === 'unexecuted') {
          statusLabel = '未実施';
          labelBgClass = 'bg-red-600 text-white';
        }

        const colorSet = statusColors[currentStatus] || { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900' };

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className={`relative ${colorSet.bg} ${colorSet.border} ${colorSet.text} border-2 rounded-xl shadow-2xl p-6 w-[360px]`}>
              <div className="absolute top-4 right-14 flex items-center">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow-sm ${labelBgClass}`}>
                  {statusLabel}
                </span>
              </div>
              <button 
                type="button"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer" 
                onClick={() => setActivePopupTaskId(null)}
              >
                &times;
              </button>
              <div className="pr-6">
                <div className="text-xs font-bold opacity-70 mb-0.5">{activePopupTask.room_id}号室</div>
                <div className="text-xl font-black mb-2">{activePopupTask.patient_name} 様</div>
                <div className="text-sm font-bold border-b pb-2 mb-3">指示時間: {activePopupTask.display_period}</div>
                <div className="text-base font-black mb-1">{activePopupTask.title}</div>
                <div className="text-xs opacity-80 mb-6 min-h-[40px] whitespace-pre-wrap text-left">{activePopupTask.details || '詳細はありません'}</div>
                {renderPopupButtons(activePopupTask)} 
              </div>
            </div>
          </div>
        );
      })()}

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