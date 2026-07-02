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
        groupingMode={groupingMode}         
        onStartGrouping={onStartGrouping}
      />
    </div>
    
  );
}