import { DndContext, DragOverlay } from '@dnd-kit/core';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import { getTaskStyles } from '../utils/taskStyles';
import { handleCardClick } from '../utils/taskLogic';
import { useTimelineDnd } from '../hooks/useTimelineDnd';
import { useTimelineStore } from '../stores/useTimelineStore';

interface TimelineProps {
  selectedPatients: string[];
}

export default function Timeline({ selectedPatients }: TimelineProps) {
  // 1. カスタムフックからドラッグ&ドロップの制御機能や基本状態だけを取得
  const {
    loading,
    activeId,
    sensors,
    customCollisionDetection,
    handleDragStart,
    handleDragEnd,
  } = useTimelineDnd({ selectedPatients });

  // 🎯 2. 画面のデータソースは100% Zustand ストアを基準にする
  const storeAllTasks = useTimelineStore((state) => state.allTasks);
  const storeMemos = useTimelineStore((state) => state.memos);
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);

  // 読み込み中なら画面を出す
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
        className="flex flex-row w-full h-full bg-gray-50 overflow-hidden select-none"
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-hidden">
          <TimelineSidebar 
            selectedPatients={selectedPatients}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-white">
          <TimelineMain 
            selectedPatients={selectedPatients}
          />
        </div>
      </main>

      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          if (String(activeId).startsWith('memo-')) {
            const pureActiveId = String(activeId).replace('memo-', '');
            const activeMemo = storeMemos.find(m => String(m.id) === pureActiveId); 
            if (!activeMemo) return null;
            return (
              <div className="w-44 shadow-2xl scale-105 opacity-90 cursor-grabbing">
                <MemoCell memo={activeMemo} />
              </div>
            );
          }

          const activeTask = storeAllTasks.find(t => t.task_id === activeId);
          if (!activeTask) return null;
          
          const { cardColorClass, borderStyle } = getTaskStyles(activeTask, () => false);

          return (
            <TaskCard 
              task={activeTask} 
              onStartGrouping={handleStartGrouping}
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