import React from 'react';
import type { ExtendedTask } from '../../types/types';

interface PendingTrayProps {
  pendingTasks: ExtendedTask[];
  onTaskClick: (taskId: string) => void;
}

export const PendingTray: React.FC<PendingTrayProps> = ({ pendingTasks, onTaskClick }) => {
  if (pendingTasks.length === 0) return null;

  return (
    <div className="fixed bottom-12 left-0 right-0 bg-orange-50 border-t-2 border-orange-400 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40 animate-slide-up">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <div className="flex flex-col items-center justify-center bg-orange-500 text-white font-black text-xs px-3 py-2 rounded-xl shadow-sm min-w-[100px] shrink-0 gap-0.5">
          <span className="text-base animate-pulse">⚠️</span>
          <span>中断・保留中</span>
          <span className="bg-orange-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
            {pendingTasks.length}件
          </span>
        </div>

        <div className="flex flex-1 gap-3 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {pendingTasks.map(task => (
            <div
              key={task.task_id}
              onClick={(e) => { e.stopPropagation(); onTaskClick(task.task_id); }}
              className="w-56 p-2 rounded-lg shadow border bg-white border-orange-300 text-gray-800 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all shrink-0 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mb-1">
                <span>{task.room_id}号室</span>
                <span className="bg-orange-100 text-orange-700 px-1 rounded">予定: {task.display_period}</span>
              </div>
              <div className="text-xs font-black truncate text-left">{task.patient_name}様</div>
              <div className="text-xs text-gray-600 truncate text-left mt-0.5">{task.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};