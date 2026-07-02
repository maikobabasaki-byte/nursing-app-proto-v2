import { DndContext, DragOverlay } from '@dnd-kit/core';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import { getTaskStyles } from '../utils/taskStyles';
import { handleCardClick } from '../utils/taskLogic';
import { useTimelineDnd } from '../hooks/useTimelineDnd';

interface TimelineProps {
  selectedPatients: string[];
}

export default function Timeline({ selectedPatients }: TimelineProps) {
  // カスタムフックからすべてのデータと関数を1行で呼び出す
  const {
    allTasks,
    memos,
    loading,
    groupingMode,
    setGroupingMode,
    activeId,
    sensors,
    customCollisionDetection,
    handleDragStart,
    handleDragEnd,
    handleGroupTasks,
    handleUpdateTaskPeriod,
    handleUpdateStatus,
    handleStartGrouping,
    handleUngroupTask,
    handleSaveMemo,
    handleDeleteMemo,
    poolTasks,
    timedTasks,
    hasPendingTasks
  } = useTimelineDnd({ selectedPatients });

  // 読み込み中ならぐるぐる画面を出す
  if (loading) {
    return <div className="flex w-full h-full justify-center items-center">データを読み込み中...</div>;
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <main 
        onMouseDownCapture={() => console.log("🔍 mainタグまでイベントが来ているか？")}
        className={`flex flex-row w-full h-full bg-gray-50 overflow-hidden select-none ${
          hasPendingTasks ? 'pb-28' : ''
        }`}
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <div className="w-fit flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <TimelineSidebar 
            tasks={poolTasks || []} 
            groupingMode={groupingMode}
            onStartGrouping={handleStartGrouping}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-white">
          <TimelineMain 
            allTasks={allTasks}
            timedTasks={timedTasks}
            onUpdateTaskPeriod={handleUpdateTaskPeriod} 
            onUpdateTaskStatus={handleUpdateStatus}
            onGroupTasks={handleGroupTasks}    
            onUngroupTask={handleUngroupTask}
            groupingMode={groupingMode}
            setGroupingMode={setGroupingMode}
            onStartGrouping={handleStartGrouping}
            memos={memos}
            onSaveMemo={handleSaveMemo}
            onDeleteMemo={handleDeleteMemo}
          />
        </div>
      </main>

      <DragOverlay>
        {activeId ? (() => {
          if (String(activeId).startsWith('memo-')) {
            const pureActiveId = String(activeId).replace('memo-', '');
            const activeMemo = memos.find(m => String(m.id) === pureActiveId); 
            if (!activeMemo) return null;
            return (
              <div className="w-44 shadow-2xl scale-105 opacity-90 cursor-grabbing">
                <MemoCell memo={activeMemo} onEdit={() => {}} />
              </div>
            );
          }

          const activeTask = allTasks.find(t => t.task_id === activeId);
          if (!activeTask) return null;
          
          const { cardColorClass, borderStyle } = getTaskStyles(activeTask, () => false);

          return (
            <TaskCard 
              task={activeTask} 
              onStartGrouping={handleStartGrouping}
              groupingMode={groupingMode}
              cardColorClass={cardColorClass} 
              borderStyle={borderStyle}      
              className="shadow-2xl cursor-grabbing scale-105" 
              onClick={() => handleCardClick(activeTask)}
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}