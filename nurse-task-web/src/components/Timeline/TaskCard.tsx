import type{ TaskCardProps } from '../../types/types';

export const TaskCard = ({
  task, 
  cardColorClass,
  borderStyle, 
  originalTime, 
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit }: TaskCardProps) => {
  return (
    <div 
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onEdit}
      className={`w-60 p-2 m-2 rounded shadow-sm font-bold cursor-grab active:cursor-grabbing transition-all select-none ${cardColorClass} ${borderStyle}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-size-sm font-bold">{task.display_period}</span>
          {originalTime && originalTime !== task.display_period && (
            <span className="bg-gray-700 text-white text-[9px] px-1.5 py-0.5 rounded font-normal opacity-90">
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