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
  patient_name: string; // 💡 App.tsxから結合されて届く名前の型を追加
}

interface TimelineSidebarProps {
  tasks: Task[];
}

export default function TimelineSidebar({ tasks }: TimelineSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

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
          {tasks.map(task => (
            <div key={task.task_id} className={`border p-3 rounded shadow-sm ${task.priority}`}>
              <div className="flex justify-between text-xs text-gray-500 font-bold mb-1">
                {/* 🏢 部屋番号を表示 */}
                <span>{task.room_id}号室</span>
                {/* ⏰ 実施時間帯 */}
                <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{task.display_period}</span>
              </div>
              
              {/* 👤 患者名（patients.jsonから連動した本物の名前が入ります！） */}
              <div className="text-[1.1rem] font-bold text-[#1A365D] mb-1">
                {task.patient_name} 様
              </div>
              
              {/* 💉 タスク名（点滴更新、バイタル測定など） */}
              <div className="font-bold text-gray-800">{task.title}</div>
              
              {/* 📝 補足（ソルデム3A など、データがある場合のみ表示） */}
              {task.details && (
                <div className="text-xs text-gray-600 bg-gray-50 p-1 rounded mt-1 border-dashed border border-gray-200">
                  {task.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}