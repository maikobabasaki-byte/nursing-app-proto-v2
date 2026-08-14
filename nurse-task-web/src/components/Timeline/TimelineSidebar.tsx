import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ExtendedTask } from '../../types/types'; 
import { PoolTaskCard } from './PoolTaskCard';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useUserName } from '../../hooks/useUserName';
import { extractUserProgressingTasks } from '../../utils/taskLogic';

interface TimelineSidebarProps { 
  selectedPatients: string[];
}

export default function TimelineSidebar({ 
  selectedPatients
}: TimelineSidebarProps) {
  const userName = useUserName();
  const allTasks = useTimelineStore((state) => state.allTasks);
  const groupingMode = useTimelineStore((state) => state.groupingMode);
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);
  const setActivePopupTaskId = useTimelineStore((state) => state.setActivePopupTaskId);

  const currentUser = useTimelineStore((state) => state.currentUser);
  const showLowPriority = useTimelineStore((state) => state.showLowPriority);
  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true
  );
  const isLeader = isGuestUser
    ? (currentUser ? currentUser.is_leader === true : sessionStorage.getItem('nurseflow_guest_role') === 'leader')
    : Boolean(currentUser?.is_leader);

  // 🎯 【Single Source of Truth】ストアの全タスクからプール用タスクを直算出（ゲストメンバーは202/203号室限定）
  const poolTasks = allTasks.filter(task => {
    if (!task || task.status === 'deleted' || task.display_period?.includes(':')) {
      return false;
    }

    if (isGuestUser) {
      const isGuestTask = task.task_id?.startsWith('GUEST-') || task.nurse_id === currentUser?.nurse_id || task.assigned_nurse_id === currentUser?.nurse_id;
      if (!isGuestTask) return false;

      if (!isLeader) {
        const room = (task.room_id || '').trim();
        const is202or203 = room === '202' || room === '203' || room.includes('202') || room.includes('203');
        const isSelected = selectedPatients && selectedPatients.length > 0 ? selectedPatients.includes(task.patient_id) : false;
        if (!is202or203 && !isSelected) return false;
      }
    } else if (!isLeader) {
      if (selectedPatients && selectedPatients.length > 0) {
        if (!selectedPatients.includes(task.patient_id)) return false;
      }
    }

    if (isLeader) {
      const isHighPriority = task.priority === 'high';
      if (!isHighPriority && !showLowPriority && task.priority === 'low') {
        return false;
      }
    }

    return true;
  });

  // Zustandの全タスクからログイン中のユーザーの「実施中・記録中タスク」を動的抽出
  const myProgressingTasks = extractUserProgressingTasks(allTasks, userName);

  // 上部エリア（タスクプール）の高さの割合 (%)
  const [topRatio, setTopRatio] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const percentage = (relativeY / rect.height) * 100;
    // 上下エリアが最小 15% 〜 最大 85% の範囲に収まるように制約
    const clampedPercentage = Math.min(Math.max(percentage, 15), 85);
    setTopRatio(clampedPercentage);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full border-r border-gray-200 bg-gray-50 w-72 flex-shrink-0 select-none relative overflow-hidden"
    >
      
      {/* ─── 1. 上部エリア：タスクプール ─── */}
      <div 
        style={{ height: `${topRatio}%` }}
        className="flex flex-col border-b border-gray-200 bg-white overflow-hidden"
      >
        <div className="px-4 py-2.5 font-bold text-gray-700 bg-gray-100/80 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-1.5 text-sm">
            <span>📥</span>
            <span>タスクプール</span>
          </span>
          <span className="bg-sky-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
            {poolTasks.length}件
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-thin">
          {poolTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-gray-400 text-xs text-center border-2 border-dashed border-gray-200 rounded-lg m-1">
              <span className="text-xl mb-1">✨</span>
              <span>未割り当ての<br />タスクはありません</span>
            </div>
          ) : (
            poolTasks.map(task => (
              <PoolTaskCard 
                key={task.task_id} 
                task={task} 
                groupingMode={groupingMode} 
                onStartGrouping={handleStartGrouping} 
              />
            ))
          )}
        </div>
      </div>

      {/* ─── ↕ Y軸ドラッグリサイズハンドル ─── */}
      <div 
        onMouseDown={handleMouseDown}
        className="h-2.5 bg-gray-200 hover:bg-sky-400 active:bg-sky-500 cursor-row-resize flex items-center justify-center border-y border-gray-300 transition-colors group flex-shrink-0 z-10"
        title="上下にドラッグして表示比率を変更"
      >
        <div className="w-8 h-1 rounded-full bg-gray-400 group-hover:bg-white group-active:bg-white" />
      </div>

      {/* ─── 2. 下部エリア：マイ実施中・記録中タスク（常設） ─── */}
      <div 
        style={{ height: `${100 - topRatio}%` }}
        className="flex flex-col bg-slate-50 overflow-hidden"
      >
        {/* ヘッダー (青い点滅ドット・件数バッジ付き) */}
        <div className="px-4 py-2.5 font-bold text-slate-800 bg-sky-50/90 border-b border-sky-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* 青いパルスドットインジケーター */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <span className="text-sm text-sky-900 font-extrabold">実施・記録中</span>
          </div>
          <span className="bg-sky-200 text-sky-800 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
            {myProgressingTasks.length}件
          </span>
        </div>

        {/* 実施中タスクカードリスト */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-thin">
          {myProgressingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-gray-400 text-xs text-center border-2 border-dashed border-gray-200 rounded-lg m-1 bg-white/50">
              <span className="text-base mb-1">📋</span>
              <span>実施中・記録中の<br />タスクはありません</span>
            </div>
          ) : (
            myProgressingTasks.map((task: ExtendedTask) => {
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
                  onClick={() => setActivePopupTaskId(task.task_id)}
                  className="w-full p-2.5 rounded-lg shadow-sm border border-sky-200 bg-white hover:border-sky-400 hover:shadow transition-all cursor-pointer relative overflow-hidden flex flex-col gap-1 text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
                  
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold">
                    <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-mono">
                      {task.display_period || '随時'}
                    </span>
                    <span className="text-gray-600 truncate max-w-[110px]">
                      {task.room_id ? `${task.room_id}号室 ` : ''}{task.patient_name ? `${task.patient_name}様` : ''}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-gray-800 truncate mt-0.5">
                    {task.title}
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px]">
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
            })
          )}
        </div>
      </div>

    </div>
  );
}