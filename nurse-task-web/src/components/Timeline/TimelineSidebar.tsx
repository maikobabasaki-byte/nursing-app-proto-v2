import type { Task } from '../../types/types'; 
import { PoolTaskCard } from './PoolTaskCard';

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