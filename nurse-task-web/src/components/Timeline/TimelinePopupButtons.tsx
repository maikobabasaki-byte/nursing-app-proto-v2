import React, { useState } from 'react';
import type { ExtendedTask, ExtendedTaskStatus } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface TimelinePopupButtonsProps {
  task: ExtendedTask;
  onStatusChange: (task: ExtendedTask, nextStatus: ExtendedTaskStatus) => void;
}

export const TimelinePopupButtons: React.FC<TimelinePopupButtonsProps> = ({ task, onStatusChange }) => {
  const currentStatus = task.status;
  const isReadOnly = useTimelineStore((state) => state.isReadOnly);
  const [noRecordNeeded, setNoRecordNeeded] = useState(false);

  if (isReadOnly) {
    return (
      <div className="p-3 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-extrabold text-center shadow-xs">
        🔒 過去履歴閲覧モード（編集・操作はロックされています）
      </div>
    );
  }

  // ボタンの共通スタイルを定数化
  const btnBase = "w-full flex justify-center !py-2.5 !font-bold !rounded-lg !text-lg !shadow cursor-pointer transition-colors";
  
  const getTourBtnId = (targetStatus: ExtendedTaskStatus) => {
    if (task.task_id !== 'demo-task-tutorial') return undefined;
    if (targetStatus === 'progressing') return 'tour-modal-start-btn';
    if (targetStatus === 'pending') return 'tour-modal-pending-btn';
    if (targetStatus === 'completed') return 'tour-modal-complete-btn';
    if (targetStatus === 'record_start') return 'tour-modal-record-start-btn';
    if (targetStatus === 'record_pending') return 'tour-modal-record-pending-btn';
    if (targetStatus === 'record_complete') return 'tour-modal-record-complete-btn';
    return undefined;
  };

  const renderBtn = (status: ExtendedTaskStatus, label: string, colorClass: string, onClickHandler?: () => void) => {
    const btnId = getTourBtnId(status);
    return (
      <button 
        id={btnId}
        type="button" 
        onClick={(e) => {
          e.stopPropagation();
          if (onClickHandler) {
            onClickHandler();
          } else {
            onStatusChange(task, status);
          }
        }}
        className={`${btnBase} ${colorClass}`}
      >
        {label}
      </button>
    );
  };

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

            {/* 💡 「記録不要」チェックボックスと動的にテキスト/スタイルが変わる実施完了ボタン */}
            <div className="!flex !flex-col !gap-2 !p-2.5 !bg-white !border-2 !border-slate-300 !rounded-xl !my-1 text-left !shadow-xs">
              <label className="!flex !items-center !gap-2.5 !cursor-pointer !select-none !text-xs !font-black !text-slate-800 !px-1">
                <input
                  type="checkbox"
                  checked={noRecordNeeded}
                  onChange={(e) => setNoRecordNeeded(e.target.checked)}
                  className="!w-5 !h-5 !rounded-md !border-2 !border-slate-500 !bg-white checked:!bg-emerald-600 checked:!border-emerald-600 !cursor-pointer !accent-emerald-600 shrink-0"
                />
                <span>記録不要（軽微な対応など）</span>
              </label>

              {renderBtn(
                'completed',
                noRecordNeeded ? '実施完了（記録なし）' : '実施完了',
                noRecordNeeded
                  ? '!bg-emerald-600 !text-white hover:!bg-emerald-700'
                  : '!bg-green-600 !text-white hover:bg-green-700',
                () => {
                  onStatusChange(task, noRecordNeeded ? 'completed' : 'record_start');
                }
              )}
            </div>

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