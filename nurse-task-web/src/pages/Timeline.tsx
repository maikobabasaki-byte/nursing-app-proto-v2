import { DndContext, DragOverlay } from '@dnd-kit/core';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import { getTaskStyles } from '../utils/taskStyles';
import { handleCardClick } from '../utils/taskLogic';
import { useTimelineDnd } from '../hooks/useTimelineDnd';
import { useTimelineStore } from '../stores/useTimelineStore';

import { useIsMobile } from '../hooks/useIsMobile';

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

  const isMobile = useIsMobile();

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0.1, y: 0.15 }, acceleration: 10 }}
    >
      <div 
        className="flex flex-col md:flex-row flex-1 min-h-0 w-full bg-gray-50 overflow-hidden select-none"
      >
        {/* 💻 PC版（!isMobile）でのみ左サイドバーをDOMツリーにマウント（重複Draggableのクラッシュ完全防止） */}
        {!isMobile && (
          <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 min-h-0 overflow-hidden">
            <TimelineSidebar 
              selectedPatients={selectedPatients}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-white flex flex-col">
          <TimelineMain 
            selectedPatients={selectedPatients}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          if (String(activeId).startsWith('memo-')) {
            const pureActiveId = String(activeId).replace('memo-', '');
            const activeMemo = storeMemos.find(m => String(m.id) === pureActiveId); 
            if (!activeMemo) return null;
            return (
              <div className="w-48 shadow-2xl scale-105 opacity-95 cursor-grabbing">
                <MemoCell memo={activeMemo} isOverlay={true} />
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
              isOverlay={true}
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}