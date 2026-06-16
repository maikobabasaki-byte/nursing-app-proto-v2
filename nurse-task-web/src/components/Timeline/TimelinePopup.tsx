import React from 'react';
import type { ExtendedTask, ExtendedTaskStatus } from '../../types/types';

interface TimelinePopupProps {
  task: ExtendedTask;
  onClose: () => void;
  renderPopupButtons: (task: ExtendedTask) => React.ReactNode;
}

export const TimelinePopup: React.FC<TimelinePopupProps> = ({ task, onClose, renderPopupButtons }) => {
  // ステータスカラーの定義はここに移動（または constants.ts に抽出）
  const statusColors: Record<ExtendedTaskStatus, { bg: string; border: string; text: string }> = {
    initial: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' },
    untouched: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' },
    progressing: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900' },
    pending: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
    record_start: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
    record_pending: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
    record_complete: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
    unexecuted: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
  };

  // ステータスラベルのロジック
  const statusLabels: Partial<Record<ExtendedTaskStatus, string>> = {
    progressing: '実施中', pending: '中断中', completed: '実施完了',
    record_start: '記録中', record_pending: '記録中断', record_complete: '記録完了',
    unexecuted: '未実施'
  };

  const statusBgClasses: Partial<Record<ExtendedTaskStatus, string>> = {
    progressing: 'bg-cyan-600 text-white', pending: 'bg-orange-500 text-white',
    completed: 'bg-green-600 text-white', record_start: 'bg-blue-600 text-white',
    record_pending: 'bg-orange-500 text-white', record_complete: 'bg-purple-600 text-white',
    unexecuted: 'bg-red-600 text-white'
  };

  const currentStatus = task.status;
  const colorSet = statusColors[currentStatus] || { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900' };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className={`relative ${colorSet.bg} ${colorSet.border} ${colorSet.text} border-2 rounded-xl shadow-2xl p-6 w-[360px]`}>
        <div className="absolute top-4 right-14 flex items-center">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow-sm ${statusBgClasses[currentStatus] || 'bg-gray-200 text-gray-700'}`}>
            {statusLabels[currentStatus] || '未着手'}
          </span>
        </div>
        <button 
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors cursor-pointer" 
          onClick={onClose}
        >
          &times;
        </button>
        <div className="pr-6">
          <div className="text-xs font-bold opacity-70 mb-0.5">{task.room_id}号室</div>
          <div className="text-xl font-black mb-2">{task.patient_name} 様</div>
          <div className="text-sm font-bold border-b pb-2 mb-3">指示時間: {task.display_period}</div>
          <div className="text-base font-black mb-1">{task.title}</div>
          <div className="text-xs opacity-80 mb-6 min-h-[40px] whitespace-pre-wrap text-left">{task.details || '詳細はありません'}</div>
          {renderPopupButtons(task)} 
        </div>
      </div>
    </div>
  );
};