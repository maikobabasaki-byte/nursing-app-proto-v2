import React from 'react';
import type { ExtendedTask } from '../../types/types';

interface PendingTrayProps {
  progressingTasks?: ExtendedTask[];
  pendingTasks: ExtendedTask[];
  onTaskClick: (taskId: string) => void;
}

export const PendingTray: React.FC<PendingTrayProps> = ({ 
  progressingTasks = [], 
  pendingTasks, 
  onTaskClick 
}) => {
  const hasProgressing = progressingTasks.length > 0;
  const hasPending = pendingTasks.length > 0;

  if (!hasProgressing && !hasPending) return null;

  const executionPendingTasks = pendingTasks.filter(t => t.status === 'pending');
  const recordPendingTasks = pendingTasks.filter(t => t.status === 'record_pending');

  return (
    <div className="fixed bottom-14 md:bottom-[50px] left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t-2 border-sky-400 p-2 md:p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)] z-40 animate-slide-up text-white flex flex-col gap-2.5 tutorial-task-pool">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-2">

        {/* ─── 1. 上段：PC版デザイン・仕様そのままの「実施・記録中」タスクエリア ─── */}
        {hasProgressing && (
          <div className="flex items-center gap-3 bg-sky-950/60 p-2 rounded-xl border border-sky-500/40 shrink-0">
            {/* 上段インジケーターバッジ */}
            <div className="flex flex-col justify-center items-center px-2 text-sky-300 font-extrabold text-[11px] shrink-0 whitespace-nowrap gap-0.5">
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <span>実施・記録中</span>
              </div>
              <span className="text-[10px] bg-sky-600 text-white px-2 py-0.2 rounded-full font-bold">
                {progressingTasks.length}件
              </span>
            </div>

            {/* PC版同等のタスクカードリスト（クリックでポップアップ起動） */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin items-center flex-1">
              {progressingTasks.map((task: ExtendedTask) => {
                let elementId: string | undefined = undefined;
                if (task.task_id === 'demo-task-tutorial') {
                  if (task.status === 'progressing') {
                    elementId = 'dummy-task-progressing';
                  } else if (task.status === 'record_start') {
                    elementId = 'dummy-task-recording';
                  } else if (task.status === 'record_pending') {
                    elementId = 'dummy-task-record-pending';
                  }
                }

                return (
                  <div
                    key={task.task_id}
                    id={elementId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task.task_id);
                    }}
                    className="w-56 p-2 rounded-lg shadow-sm border border-sky-200 bg-white text-gray-800 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col gap-1 text-left shrink-0"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
                    
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold">
                      <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-mono">
                        {task.display_period || '随時'}
                      </span>
                      <span className="text-gray-600 truncate max-w-[100px]">
                        {task.room_id ? `${task.room_id}号室 ` : ''}{task.patient_name ? `${task.patient_name}様` : ''}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-gray-800 truncate mt-0.5">
                      {task.title}
                    </div>

                    <div className="flex items-center justify-between mt-0.5 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        task.status === 'progressing' 
                          ? 'bg-cyan-100 text-cyan-800' 
                          : task.status === 'record_start'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {task.status === 'progressing' ? '🔵 実施中' : task.status === 'record_start' ? '🔵 記録中' : '🟣 記録一時中断'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 2. 下段：従来通りの「中断中トレイ」 ─── */}
        {hasPending && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center bg-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-sm min-w-[100px] shrink-0 gap-0.5">
              <span className="material-symbols-outlined text-base">warning</span>
              <span>中断・保留中</span>
              <span className="bg-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                計 {pendingTasks.length}件
              </span>
            </div>

            <div className="flex flex-1 gap-4 overflow-x-auto pb-1 pt-1 scrollbar-thin items-stretch">
              {/* 🟠 実施中断中グループ */}
              {executionPendingTasks.length > 0 && (
                <div className="flex items-center gap-2 bg-orange-950/60 p-2 rounded-xl border border-orange-500/40 shrink-0">
                  <div className="flex flex-col justify-center items-center px-1 text-orange-300 font-extrabold text-[11px] shrink-0 whitespace-nowrap">
                    <span>🟠 実施</span>
                    <span>中断中</span>
                    <span className="text-[10px] bg-orange-600/80 text-white px-1.5 py-0.2 rounded-full mt-0.5">
                      {executionPendingTasks.length}件
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {executionPendingTasks.map(task => (
                      <div
                        key={task.task_id}
                        id={task.task_id === 'demo-task-tutorial' ? 'dummy-task-pending' : undefined}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task.task_id); }}
                        className="w-52 p-2 rounded-lg shadow border bg-white text-gray-800 cursor-pointer border-orange-300 hover:border-orange-500 hover:shadow-md transition-all shrink-0 relative overflow-hidden text-left"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mb-1">
                          <span>{task.room_id ? `${task.room_id}号室` : ''}</span>
                          <span className="bg-orange-100 text-orange-800 px-1 rounded font-mono">予定: {task.display_period || '随時'}</span>
                        </div>
                        <div className="text-xs font-black truncate">{task.patient_name}様</div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">{task.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 区分セパレーター */}
              {executionPendingTasks.length > 0 && recordPendingTasks.length > 0 && (
                <div className="w-[1px] bg-gray-600/60 my-1 shrink-0" />
              )}

              {/* 🟣 記録一時中断中グループ */}
              {recordPendingTasks.length > 0 && (
                <div className="flex items-center gap-2 bg-purple-950/60 p-2 rounded-xl border border-purple-500/40 shrink-0">
                  <div className="flex flex-col justify-center items-center px-1 text-purple-300 font-extrabold text-[11px] shrink-0 whitespace-nowrap">
                    <span>🟣 記録</span>
                    <span>一時中断</span>
                    <span className="text-[10px] bg-purple-600/80 text-white px-1.5 py-0.2 rounded-full mt-0.5">
                      {recordPendingTasks.length}件
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {recordPendingTasks.map(task => (
                      <div
                        key={task.task_id}
                        id={task.task_id === 'demo-task-tutorial' ? 'dummy-task-record-pending' : undefined}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task.task_id); }}
                        className="w-52 p-2 rounded-lg shadow border bg-white text-gray-800 cursor-pointer border-purple-300 hover:border-purple-500 hover:shadow-md transition-all shrink-0 relative overflow-hidden text-left"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mb-1">
                          <span>{task.room_id ? `${task.room_id}号室` : ''}</span>
                          <span className="bg-purple-100 text-purple-800 px-1 rounded font-mono">予定: {task.display_period || '随時'}</span>
                        </div>
                        <div className="text-xs font-black truncate">{task.patient_name}様</div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">{task.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};