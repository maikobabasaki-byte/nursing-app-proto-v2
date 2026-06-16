import type { ExtendedTask } from '../../types/types';

interface GroupAccordionProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onChildClick: (taskId: string) => void;
  onUngroup: (groupId: string, childId: string, period: string) => void;
}

export const GroupAccordion = ({ task, isExpanded, onChildClick, onUngroup }: GroupAccordionProps) => {
  if (!isExpanded) return null;

  return (
    <div className="absolute top-[90%] left-2 w-60 bg-[#1e3a6a] rounded-xl p-2 z-30 shadow-xl border border-blue-900 animate-fade-in max-h-[320px] overflow-y-auto scrollbar-thin">
      {task.children?.map((child) => (
        <div 
          key={child.task_id}
          className="p-2 rounded-lg border shadow-sm text-xs bg-white text-gray-800 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={(e) => { 
            e.stopPropagation(); 
            onChildClick(child.task_id); 
          }}
        >
          <div className="font-bold flex justify-between items-center mb-0.5">
            <span className="opacity-75">{child.room_id}号室</span>
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                onUngroup(task.task_id, child.task_id, task.display_period); 
              }}
              className="bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors"
            >
              外す
            </button>
          </div>
          <div className="font-black text-sm">{child.patient_name}様</div>
          <div className="opacity-80">{child.title}</div>
        </div>
      ))}
    </div>
  );
};