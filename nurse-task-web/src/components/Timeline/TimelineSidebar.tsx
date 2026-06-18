import { TaskCard } from './TaskCard';
import type { Task } from '../../types/types'; 
import { getTaskStyles } from '../../utils/taskStyles'
import { useDraggable } from '@dnd-kit/core';

// 1. 個別のタスクを表示するカード（ドラッグ制御のみを担当）
export function PoolTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
  });

  // 常に false を返す関数を用意
  const isPastTime = () => false; 
  
  // 関数を呼び出す
  const { cardColorClass, borderStyle } = getTaskStyles(task, isPastTime);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-40' : 'opacity-100'}
    >
      <TaskCard 
        task={task} 
        cardColorClass={cardColorClass} 
        borderStyle={borderStyle}  
        onEdit={() => {}}
      />
    </div>
  );
}

// 2. リスト全体を表示するサイドバー（タイトルとリストの表示を担当）
export default function TimelineSidebar({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      {/* タイトルはここに置く */}
      <h2 className="px-4 py-2 font-bold text-gray-700 bg-gray-50 border-b border-gray-100">
        タスクプール ({tasks.length})
      </h2>
      
      {/* タスク一覧をここで回す */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {tasks.map(task => (
          <PoolTaskCard key={task.task_id} task={task} />
        ))}
      </div>
    </div>
  );
}