import { useState, useEffect, useRef } from 'react';

interface Task {
  task_id: string;
  title: string;
  details: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  display_period: string;
  patient_id: string;
  room_id: string;
  patient_name: string;
}

interface TimelineMainProps {
  timedTasks: Task[]; // 💡 親から届く時間指定タスクの配列
}

export default function TimelineMain({ timedTasks }: TimelineMainProps) {
  const [timelineMode, setTimelineMode] = useState<15 | 30 | 60>(30);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const stepsPerHour = 60 / timelineMode;
  const totalSlots = 24 * stepsPerHour;
  const timeSlots = Array.from({ length: totalSlots }, (_, i) => {
    const h = String(Math.floor(i / stepsPerHour)).padStart(2, '0');
    const m = String((i % stepsPerHour) * timelineMode).padStart(2, '0');
    return `${h}:${m}`;
  });

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const calculateLineTop = () => {
    if (!containerRef.current) return 0;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const currentMinuteSlot = Math.floor(minutes / timelineMode) * timelineMode;
    const timeKey = `${String(hours).padStart(2, '0')}:${String(currentMinuteSlot).padStart(2, '0')}`;
    const targetRow = rowRefs.current[timeKey];
    if (!targetRow) return 0;

    const rowHeight = targetRow.offsetHeight;
    const baseRowHeight = 60;
    const adjustedRowHeight = Math.max(rowHeight, baseRowHeight);
    const totalSecondsInHour = minutes * 60 + seconds;
    const offset = (totalSecondsInHour / 3600) * adjustedRowHeight;
    const containerRect = containerRef.current.getBoundingClientRect();
    const rowRect = targetRow.getBoundingClientRect();

    return rowRect.top - containerRect.top + offset + containerRef.current.scrollTop;
  };

  const currentSlotKey = `${String(currentTime.getHours()).padStart(2, '0')}:${String(
    Math.floor(currentTime.getMinutes() / timelineMode) * timelineMode
  ).padStart(2, '0')}`;

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
      <div ref={containerRef} id="timeline-container" className="relative flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
        {/* 現在時刻の赤いインジケータ線 */}
        <div
          id="current-time-line"
          className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
          style={{ top: `${calculateLineTop()}px`, transition: 'top 0.5s ease' }}
        >
          <span className="absolute left-0 -top-2.5 bg-red-500 text-white text-[10px] px-1 rounded shadow">
            {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
          </span>
        </div>

        {/* ⏰ 縦軸の時間行を生成 */}
        {timeSlots.map((time) => {
          const isCurrentRow = time === currentSlotKey;

          // 🎯 【重要】この時間スロットに合致するタスクを抽出する
          // （例：現在の行が "10:00" なら、display_period が "10:00" のタスクをすべて集める）
          const rowTasks = timedTasks.filter(task => task.display_period === time);

          return (
            <div
              key={time}
              ref={(el) => (rowRefs.current[time] = el)}
              className={`flex border-b border-gray-100 min-h-[60px] ${isCurrentRow ? 'bg-amber-50/50 is-current-row' : ''}`}
            >
              {/* 時間ラベル列 */}
              <div className="w-16 min-w-[64px] text-center py-4 text-xs font-bold text-gray-500 bg-gray-50 border-r border-gray-100 select-none">
                {time}
              </div>

              {/* メインタスク設置グリッド */}
              <div
                id={`task-grid-${time.replace(':', '')}`}
                className="p-2 min-h-[60px] relative flex flex-wrap"
                data-time={time}
              >
                {/* 🎯 抽出したタスクをここに直接レンダリングする！ */}
                {rowTasks.map(task => (
                  <div 
                    key={task.task_id} 
                    className={`w-60 border p-2 m-4 rounded shadow-sm font-bold ${task.priority} bg-white`}
                  >
                    <div className="flex justify-between mb-0.5">
                      <span>{task.room_id}号室</span>
                      <span>{task.patient_name}様</span>
                    </div>
                    <div className="text-gray-800 text-sm">{task.title}</div>
                    {task.details && <div className="text-[11px] text-gray-500 font-normal mt-0.5 border-t border-dashed pt-0.5">{task.details}</div>}
                  </div>
                ))}
              </div>

              {/* メモエリア（PC用） */}
              <div className="w-48 min-w-[192px] border-l border-dashed !border-gray-200 p-2 bg-gray-50/30 hidden md:block" data-time={time}>
                {/* メモ・割り込み用エリア */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}