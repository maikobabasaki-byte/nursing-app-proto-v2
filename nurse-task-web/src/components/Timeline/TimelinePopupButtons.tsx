import React from 'react';
import type { ExtendedTask, ExtendedTaskStatus } from '../../types/types';

interface TimelinePopupButtonsProps {
  task: ExtendedTask;
  onStatusChange: (task: ExtendedTask, nextStatus: ExtendedTaskStatus) => void;
}

export const TimelinePopupButtons: React.FC<TimelinePopupButtonsProps> = ({ task, onStatusChange }) => {
  const currentStatus = task.status;

  // ボタンの共通スタイルを定数化
  const btnBase = "w-full flex justify-center !py-2.5 !font-bold !rounded-lg !text-lg !shadow cursor-pointer transition-colors";
  
  const renderBtn = (status: ExtendedTaskStatus, label: string, colorClass: string) => (
    <button 
      type="button" 
      onClick={(e) => {
      e.stopPropagation(); // ★ここでイベントの伝播を確実に止める
      onStatusChange(task, status);
    }}
      className={`${btnBase} ${colorClass}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
        {(currentStatus === 'initial' || currentStatus === 'untouched') && (
            <>
            {renderBtn('progressing', '実施開始', '!bg-cyan-600 !text-white hover:bg-cyan-700')}
            {renderBtn('unexecuted', '未実施', '!bg-red-600 !text-white hover:bg-red-700')}
            </>
        )}
        
        {currentStatus === 'progressing' && (
            <>
            {renderBtn('pending', '中断・保留', '!bg-orange-500 !text-white hover:bg-orange-600')}
            {renderBtn('completed', '実施完了', '!bg-green-600 !text-white hover:bg-green-700')}
            {renderBtn('unexecuted', '未実施', '!bg-red-600 !text-white hover:bg-red-700')}
            {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}

        {currentStatus === 'pending' && (
            <>
            {renderBtn('progressing', '再開', '!bg-cyan-600 !text-white hover:bg-cyan-700')} 
            {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}
        
        {currentStatus === 'completed' && (
            <>
            {renderBtn('record_start', '記録開始', '!bg-blue-600 !text-white hover:bg-blue-700')} 
            {renderBtn('progressing', '実施中に戻す', '!bg-gray-400 !text-white hover:bg-gray-500')} 
            {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}
        {currentStatus === 'record_start' && (
            <>
            {renderBtn('record_complete', '記録完了', '!bg-purple-600 !text-white hover:bg-purple-700')} 
            {renderBtn('record_pending', '記録を一時中断', '!bg-orange-400 !text-white hover:bg-orange-500')} 
            {renderBtn('progressing', '実施中に戻す', '!bg-gray-400 !text-white hover:bg-gray-500')} 
            {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}
        {currentStatus === 'record_pending' && (
            <>
                {renderBtn('record_start', '記録を再開', '!bg-blue-600 !text-white hover:bg-blue-700')} 
                {renderBtn('record_complete', '記録完了', '!bg-purple-600 !text-white hover:bg-purple-700')} 
                {renderBtn('progressing', '実施中に戻す', '!bg-gray-400 !text-white hover:bg-gray-500')} 
                {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}
        {currentStatus === 'record_complete' && (
            <>
                {renderBtn('record_start', '記録完了を取り消す', '!bg-blue-600 !text-white hover:bg-blue-700')} 
                {renderBtn('progressing', '実施中に戻す', '!bg-gray-400 !text-white hover:bg-gray-500')} 
                {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}

        {currentStatus === 'unexecuted' && (
            <>
            {renderBtn('initial', '未実施を取り消す', '!bg-gray-500 !text-white hover:bg-gray-600')} 
            </>
        )}

    </div>
  );
};