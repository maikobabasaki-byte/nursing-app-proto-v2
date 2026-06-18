import type { Task } from '../../types/types';
import { useDraggable } from '@dnd-kit/core';

interface TaskCardPropsInner {
  task: Task;
  cardColorClass?: string;
  borderStyle?: string;
  originalTime?: string;
  onEdit?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const TaskCard = (props: TaskCardPropsInner) => {
  // ここでデフォルト値を設定すれば、プロパティが渡されなくても絶対にエラーにならない
  const { 
    task, 
    cardColorClass = 'bg-white border-gray-200',
    borderStyle = 'border-solid',
    originalTime, 
    onEdit,
    style, 
    className = '' 
  } = props;
  // 3. ドラッグの設定
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.task_id,
  });

  // ドラッグ中のスタイル
  const dndStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={{ ...dndStyle, ...style }}
      onClick={onEdit}
      // classNameを結合
      className={`w-60 p-2 m-2 rounded shadow-sm font-bold transition-all select-none ${cardColorClass} ${borderStyle} ${className}`}
    >
      <div 
        {...listeners} 
        {...attributes} 
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1 flex flex-col items-center justify-center h-full"
      >
        <span style={{ fontSize: '10px', lineHeight: '0.8' }}>⠿</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-size-sm font-bold">{task.display_period}</span>
          {originalTime && originalTime !== task.display_period && (
            <span className="bg-gray-700 text-white text-[12px] px-1.5 py-0.5 rounded font-normal opacity-90">
              指示: {originalTime}
            </span>
          )}
        </div>
        {/* ステータスアイコン */}
        {task.status === 'completed' && <span className="text-blue-500 text-xs" title="記録未完了">🔵</span>}
        {task.status === 'record_start' && <span className="text-green-500 text-xs" title="記録中">🟢</span>}
        {task.status === 'record_pending' && <span className="text-orange-500 text-xs" title="記録中断中">🟠</span>}
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
    </div>
  );
};