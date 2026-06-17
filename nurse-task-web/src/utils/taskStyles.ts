export const getTaskStyles = (task: any, isPastTime: (period: string) => boolean) => {
  const isRecordDone = task.status === 'record_complete';
  const isActionRequiredDone = ['completed', 'record_start', 'record_pending'].includes(task.status);

  let cardColorClass = '';
  if (task.isGroup) {
    cardColorClass = 'bg-[#1e3a6a] border-[#1e3a6a] text-white';
  } else if (task.status === 'unexecuted') {
    cardColorClass = 'bg-gray-100 border-gray-200 text-gray-400 opacity-70 line-through';
  } else if (task.status === 'pending') {
    cardColorClass = 'bg-orange-400 border-orange-300 text-gray-900';
  } else if (isRecordDone) {
    cardColorClass = 'bg-slate-200/60 border-slate-200 text-gray-400';
  } else if (isActionRequiredDone) {
    cardColorClass = 'bg-slate-300 border-slate-200 text-gray-900';
  } else {
    const priorityColors = {
      high: 'bg-red-300 border-red-200 text-gray-900',
      medium: 'bg-green-300 border-green-200 text-gray-900',
      low: 'bg-blue-300 border-blue-200 text-gray-900',
    };
    cardColorClass = priorityColors[task.priority as 'high' | 'medium' | 'low'] || 'bg-white border-gray-200 text-gray-800';
  }

  const isProgressing = task.status === 'progressing';
  const isOverdue = isPastTime(task.display_period) && 
                  !isRecordDone && 
                  !isActionRequiredDone && 
                  task.status !== 'unexecuted'; 

  const borderStyle = isOverdue
    ? '!border-2 !border-red-600 shadow-md shadow-red-100'
    : isProgressing 
      ? '!border-2 !border-blue-600 shadow-md scale-[1.01]'
      : 'border';

  return { cardColorClass, borderStyle };
};