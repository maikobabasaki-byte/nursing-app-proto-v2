import { TaskCard } from './TaskCard';
import type { Task } from '../../types/types'; 
import { getTaskStyles } from '../../utils/taskStyles'
import { useDraggable } from '@dnd-kit/core';

export function PoolTaskCard({ 
  task, 
  groupingMode, 
  onStartGrouping 
}: { 
  task: Task; 
  groupingMode: string | null; 
  onStartGrouping: (taskId: string) => void; 
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
  });

  const isPastTime = () => false; 
  const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-40' : 'opacity-100'}
    >
      {/* 💡 ここを完全にこの通りに書き換えてください！ */}
      <TaskCard 
        task={task} 
        cardColorClass={cardColorClass} 
        borderStyle={borderStyle}  
        onEdit={() => {}}
        groupingMode={groupingMode}         // 🔥 確実に明記して手渡す！
        onStartGrouping={onStartGrouping}   // 🔥 確実に明記して手渡す！
      />
    </div>
  );
}

// 💡 2. 引数に onStartGrouping を追加
export default function TimelineSidebar({ 
  tasks, 
  groupingMode,
  onStartGrouping // 親（Timeline.tsx）から受け取る
}: { 
  tasks: Task[]; 
  groupingMode: string | null; 
  onStartGrouping: (taskId: string) => void; 
}) {
  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      <h2 className="px-4 py-2 font-bold text-gray-700 bg-gray-50 border-b border-gray-100">
        タスクプール ({tasks.length})
      </h2>
      
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {tasks.map(task => (
          <PoolTaskCard 
            key={task.task_id} 
            task={task} 
            groupingMode={groupingMode} 
            // 🔥 ループの中で手渡す！
            onStartGrouping={onStartGrouping} 
          />
        ))}
      </div>
    </div>
  );
}