import { useState, useEffect, useRef } from 'react';
// 💡 インポートする対象の前に type をつける
import type { Task, TaskStatus } from '../types/types';

interface TimelineMainProps {
  timedTasks: Task[]; 
  onUpdateTaskPeriod: (taskId: string, newPeriod: string) => void; 
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

export default function TimelineMain({ timedTasks, onUpdateTaskPeriod, onUpdateTaskStatus }: TimelineMainProps) {
  const [timelineMode, setTimelineMode] = useState<15 | 30 | 60>(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [activePopupTask, setActivePopupTask] = useState<Task | null>(null);
  const [lineTop, setLineTop] = useState<number>(0);

  // 1. レンダリング用の計算変数をコンポーネントの直下に配置
  const stepsPerHour = 60 / timelineMode;
  const timeSlots = Array.from({ length: 24 * stepsPerHour }, (_, i) => {
    const h = String(Math.floor(i / stepsPerHour)).padStart(2, '0');
    const m = String((i % stepsPerHour) * timelineMode).padStart(2, '0');
    return `${h}:${m}`;
  });

  // 🎯 currentSlotKey はここで定義（どこからでも参照可能）
  const currentSlotKey = `${String(currentTime.getHours()).padStart(2, '0')}:${String(
    Math.floor(currentTime.getMinutes() / timelineMode) * timelineMode
  ).padStart(2, '0')}`;

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // 💡 タイマーの中で直接高さを計算してステートに入れる
  useEffect(() => {
    const updateLinePosition = () => {
      setCurrentTime(new Date());

      if (!containerRef.current) return;
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const targetRow = rowRefs.current[currentSlotKey];
      if (!targetRow) return;

      const rowHeight = targetRow.offsetHeight;
      const offset = ((minutes % timelineMode) * 60 + seconds) / (timelineMode * 60) * rowHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      
      // 計算した位置をセット
      setLineTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
    };

    // 最初の一回を実行
    updateLinePosition();

    // 1秒ごとに実行
    const timerId = setInterval(updateLinePosition, 1000);
    return () => clearInterval(timerId);
  }, [currentSlotKey, timelineMode]); // 依存配列にこれらを追加


  // ドラッグ開始処理（ここは特定の1つのカードの処理なので引数の taskId を使います）
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  // ドロップ許可
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // ドロップ処理
  const handleDrop = (e: React.DragEvent, targetTime: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateTaskPeriod(taskId, targetTime); 
    }
  };

  // 修正案：更新中はボタンを無効化する
const handleStatusChange = (task: Task, nextStatus: TaskStatus) => {
  if (task.status === nextStatus) return;

  // 💡 先にポップアップを閉じて、描画の連鎖をストップさせる
  setActivePopupTask(null); 

  if (onUpdateTaskStatus) {
    // 💡 ポップアップが完全に消えた安全な状態で、親のデータを更新する
    setTimeout(() => {
      onUpdateTaskStatus(task.task_id, nextStatus);
    }, 0);
  }
};
  const renderPopupButtons = (task: Task) => {
    // 🎯 デバッグ用ログ（ここで何が表示されるか確認！）
    console.log("現在のタスクステータス:", task.status); 

    return (
      <div className="flex flex-col gap-2">
        {/* ステータスに応じた条件分岐を一度だけ記述 */}
        
        {(task.status === 'initial' || task.status === 'untouched') && (
          <>
            <button onClick={() => handleStatusChange(task, 'progressing')} className="w-full py-2.5 bg-cyan-600 text-white font-bold rounded-lg text-sm shadow">実施開始</button>
            <button onClick={() => handleStatusChange(task, 'unexecuted')} className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm shadow">未実施</button>
          </>
        )}
        
        {task.status === 'progressing' && (
          <>
            <button onClick={() => handleStatusChange(task, 'pending')} className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-lg text-sm shadow">中断</button>
            <button onClick={() => handleStatusChange(task, 'unexecuted')} className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm shadow">未実施</button>
            <button onClick={() => handleStatusChange(task, 'completed')} className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg text-sm shadow">実施完了</button>
            <button onClick={() => handleStatusChange(task, 'initial')} className="w-full py-2.5 bg-gray-500 text-white font-bold rounded-lg text-sm shadow">初期化</button>
          </>
        )}
        
        {task.status === 'pending' && (
          <>
            <button onClick={() => handleStatusChange(task, 'progressing')} className="w-full py-2.5 bg-cyan-600 text-white font-bold rounded-lg text-sm shadow">再開</button>
            <button onClick={() => handleStatusChange(task, 'unexecuted')} className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm shadow">未実施</button>
            <button onClick={() => handleStatusChange(task, 'initial')} className="w-full py-2.5 bg-gray-500 text-white font-bold rounded-lg text-sm shadow">初期化</button>
          </>
        )}
        
        {task.status === 'completed' && (
          <>
            <button onClick={() => handleStatusChange(task, 'record_start')} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow">記録実施へ</button>
            <button onClick={() => handleStatusChange(task, 'progressing')} className="w-full py-2.5 bg-gray-400 text-white font-bold rounded-lg text-sm shadow">修正(実施中に戻す)</button>
          </>
        )}

        {task.status === 'record_start' && (
          <button onClick={() => handleStatusChange(task, 'record_complete')} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-lg text-sm shadow">記録完了</button>
        )}
        
        {task.status === 'unexecuted' && (
          <button onClick={() => handleStatusChange(task, 'initial')} className="w-full py-2.5 bg-gray-500 text-white font-bold rounded-lg text-sm shadow">未実施を取り消す</button>
        )}
      </div>
    );
  };
  

  return (
    <div className="flex flex-col h-full p-4">
      {/* コントロールエリア */}
      <div id="controls-area" className="flex space-x-2 mb-4 bg-gray-100 p-2 rounded shadow-inner">
        {([
          { label: '1時間', value: 60 },
          { label: '30分', value: 30 },
          { label: '15分', value: 15 },
        ] as const).map((config) => (
          <button
            key={config.value}
            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
              timelineMode === config.value ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
            onClick={() => setTimelineMode(config.value)}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* タイムライン本体コンテナ */}
      <div ref={containerRef} id="timeline-container" className="relative flex-1 overflow-y-auto !border border-gray-200 rounded bg-white">
        {/* 現在時刻の赤いインジケータ線 */}
        <div
          id="current-time-line"
          className="absolute left-0 right-0 !border-t-2 border-red-500 z-10 pointer-events-none"
          // 💡 calculateLineTop() から lineTop に変更
          style={{ top: `${lineTop}px`, transition: 'top 0.5s ease' }}
        >
          <span className="absolute left-0 -top-2.5 bg-red-500 text-white text-[10px] px-1 rounded shadow">
            {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
          </span>
        </div>

        {/* ⏰ 縦軸の時間行を生成 */}
        {timeSlots.map((time) => {
          const isCurrentRow = time === currentSlotKey;
          const rowTasks = timedTasks.filter(task => task.display_period === time);

          return (
            <div
              key={time}
              ref={(el) => { rowRefs.current[time] = el; }}
              className={`flex !border-b border-gray-100 min-h-[60px] ${isCurrentRow ? 'bg-amber-50/50 is-current-row' : ''}`}
            >
              {/* 時間ラベル列 */}
              <div className="w-16 min-w-[64px] text-center py-4 font-bold text-gray-500 bg-gray-50 border-r border-gray-100 select-none">
                {time}
              </div>

              {/* メメインタスク設置グリッド */}
              <div
                id={`task-grid-${time.replace(':', '')}`}
                className="p-2 min-h-[60px] relative flex flex-wrap flex-1"
                data-time={time}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, time)}
              >
                {/* 🎯 ループの中で初めて「task」という変数が使えるようになります */}
                {rowTasks.map(task => {
                  
                  // 優先度カラーの定義
                  const priorityColors = {
                    high: 'bg-red-300 border-red-200',
                    medium: 'bg-green-300 border-green-200',
                    low: 'bg-blue-300 border-blue-200',
                  };
                  const cardColorClass = priorityColors[task.priority] || 'bg-white border-gray-200 text-gray-800';

                  // 文字を削ったりせず、保存しておいた元の指示（午前・午後）をそのまま使う
                  const originalTime = task.initial_period || task.display_period;
                  return (
                    <div 
                      key={task.task_id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.task_id)}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        console.log("Task clicked:", task); // 🎯 コンソールにログを出して反応を確認
                        setActivePopupTask(task);
                      }}
                      className={`w-60 border p-2 m-2 rounded shadow-sm font-bold cursor-grab active:cursor-grabbing ${cardColorClass}`}
                    >
                      {/* ⏰ 時間表示エリア */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {/* 現在配置されているタイムラインの時間 */}
                        <span className=" text-gray-800 font-bold">
                          {task.display_period}
                        </span>
                        
                        {/* 元の指示時間 */}
                        {originalTime && (
                          <span className="bg-gray-700 text-white px-1.5 py-0.5 rounded font-normal opacity-90">
                            指示: {originalTime}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1 mb-1">
                        <span>{task.room_id}号室</span>
                        <span className='col-span-2'>{task.patient_name}様</span>
                      </div>
                      <div className="text-sm">{task.title}</div>
                      {task.details && (
                        <div className="text-[11px] font-normal mt-0.5 border-t border-dashed border-current/20 pt-0.5 opacity-80">
                          {task.details}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* メモエリア（PC用） */}
              <div className="w-48 min-w-[192px] border-l border-dashed !border-gray-200 p-2 bg-gray-50/30 hidden md:block" data-time={time}>
                {/* メモ・割り込み用エリア */}
              </div>
            </div>
            
          );
        })}
        
      </div>
      
      {/* 🎯 ポップアップ表示エリア */}
{activePopupTask && (
  <div 
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" 
    onClick={() => setActivePopupTask(null)}
  >
    <div 
      className="bg-white rounded-xl shadow-2xl p-6 w-[360px]" 
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="absolute right-[100px] !text-gray-800"
        onClick={() => setActivePopupTask(null)}
      >&times;</button>
      
      {/* 患者情報 */}
        <div className="text-xs font-bold opacity-70 mb-0.5">{activePopupTask.room_id}号室</div>
        <div className="text-xl font-black mb-2">{activePopupTask.patient_name} 様</div>
        <div className="text-sm font-bold border-b pb-2 mb-3">指示時間: {activePopupTask.display_period}</div>
        <div className="text-base font-black mb-1">{activePopupTask.title}</div>
        <div className="text-xs opacity-80 mb-6 min-h-[40px] whitespace-pre-wrap text-left">{activePopupTask.details || '詳細はありません'}</div>
      {renderPopupButtons(activePopupTask)} 
    </div>
  </div>
)}
    </div>
  );
}