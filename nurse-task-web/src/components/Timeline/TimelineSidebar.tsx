import { useState } from 'react';

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

interface TimelineSidebarProps {
  tasks: Task[];
}

export default function TimelineSidebar({ tasks }: TimelineSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 
        className="cursor-pointer select-none flex justify-between items-center px-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>タスクプール ({tasks.length})</span>
        <span className="text-sm">{isOpen ? '▲' : '▼'}</span>
      </h2>
      
      {isOpen && (
        <div id="pool-container" className="p-2 flex flex-col gap-2">
          {tasks.map(task => {

            // 優先度カラーの定義
            const priorityColors = {
              high: 'bg-red-500 border-red-200',
              medium: 'bg-green-300 border-green-200',
              low: 'bg-blue-300 border-blue-200',
            };
            const cardColorClass = priorityColors[task.priority] || 'bg-white border-gray-200 text-gray-800';

            return (
              // 👇 【ここを差し替え】${task.priority} を cardColorClass に変更
              <div key={task.task_id} 
              draggable
              onDragStart={(e) => handleDragStart(e, task.task_id)}
              className={`border p-3 rounded shadow-sm font-bold cursor-grab active:cursor-grabbing ${cardColorClass}`}>
                <div className="flex justify-between text-gray-500 font-bold mb-1 opacity-80">
                  {/* 🏢 部屋番号を表示 */}
                  <span>{task.room_id}号室</span>
                  {/* ⏰ 実施時間帯 */}
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{task.display_period}</span>
                </div>
                
                {/* 👤 患者名 */}
                <div className="text-[1.1rem] font-bold text-current mb-1">
                  {task.patient_name} 様
                </div>
                
                {/* 💉 タスク名 */}
                <div className="font-bold text-current">{task.title}</div>
                
                {/* 📝 補足（データがある場合のみ表示） */}
                {task.details && (
                  // 👇 背景色に合わせて見やすくなるよう背景を bg-white/50（白の半透明）に調整
                  <div className="text-xs font-normal bg-white/50 p-1 rounded mt-1 border-dashed border border-current/20 opacity-90">
                    {task.details}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}