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
  const [showCompletionChoice, setShowCompletionChoice] = useState(false);

  React.useEffect(() => {
    setShowCompletionChoice(false);
  }, [task.task_id, task.status]);

  if (isReadOnly) {
    return (
      <div className="p-3 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-extrabold text-center shadow-xs">
        🔒 過去履歴閲覧モード（編集・操作はロックされています）
      </div>
    );
  }

  // ボタンの共通スタイルを定数化（画面フィットのため高さ・文字サイズを最適化）
  const btnBase = "w-full flex justify-center !py-2 !font-bold !rounded-lg !text-base !shadow cursor-pointer transition-colors";
  
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
            {showCompletionChoice ? (
              <div className="!flex !flex-col !gap-2.5 !p-3 !bg-emerald-50/90 !border-2 !border-emerald-300 !rounded-xl text-left !shadow-sm animate-fade-in">
                <div className="!flex !items-center !justify-between border-b border-emerald-200 pb-1.5">
                  <span className="!text-xs !font-black !text-emerald-950">
                    実施完了後の記録処理を選択
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCompletionChoice(false)}
                    className="!text-xs !text-slate-500 hover:!text-slate-800 !font-bold cursor-pointer"
                  >
                    ✕ 戻る
                  </button>
                </div>

                <div className="!flex !flex-col !gap-2 !mt-1">
                  {/* ① 記録なしで完了（記録不要） */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionChoice(false);
                      onStatusChange(task, 'no_record_completed');
                    }}
                    className={`${btnBase} !bg-emerald-600 !text-white hover:!bg-emerald-700 !text-sm`}
                  >
                    記録なしで完了（記録不要）
                  </button>

                  {/* ② 今すぐ記録を入力 */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionChoice(false);
                      onStatusChange(task, 'record_start');
                    }}
                    className={`${btnBase} !bg-purple-600 !text-white hover:!bg-purple-700 !text-sm`}
                  >
                    今すぐ記録を入力（記録開始）
                  </button>

                  {/* ③ 後で記録を入力（実施完了にする） */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionChoice(false);
                      onStatusChange(task, 'completed');
                    }}
                    className={`${btnBase} !bg-blue-600 !text-white hover:!bg-blue-700 !text-sm`}
                  >
                    後で記録を入力（実施完了にする）
                  </button>
                </div>
              </div>
            ) : (
              <>
                {renderBtn('pending', '中断・保留', '!bg-orange-500 !text-white hover:bg-orange-600')}

                {renderBtn(
                  'completed',
                  '実施完了',
                  '!bg-green-600 !text-white hover:bg-green-700',
                  () => setShowCompletionChoice(true)
                )}

                {renderBtn('unexecuted', '未実施', '!bg-red-600 !text-white hover:bg-red-700')}
                {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
              </>
            )}
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
            {renderBtn('record_start', '記録を入力する', '!bg-blue-600 !text-white hover:bg-blue-700')} 
            {renderBtn('progressing', '実施中に戻す', '!bg-gray-400 !text-white hover:bg-gray-500')} 
            {renderBtn('initial', '初期化', '!bg-gray-500 !text-white hover:bg-gray-600')}
            </>
        )}

        {currentStatus === 'no_record_completed' && (
            <>
            {renderBtn('record_start', '記録を入力する', '!bg-blue-600 !text-white hover:bg-blue-700')} 
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