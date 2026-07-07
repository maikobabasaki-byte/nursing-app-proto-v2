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
    groupingMode,
    setGroupingMode,
    activeId,
    sensors,
    customCollisionDetection,
    handleDragStart,
    handleDragEnd,
    handleStartGrouping,
    poolTasks,
    hasPendingTasks
  } = useTimelineDnd({ selectedPatients });

  // 🎯 2. 画面のデータソースは100% Zustand ストアを基準にする
  const storeAllTasks = useTimelineStore((state) => state.allTasks);
  const storeMemos = useTimelineStore((state) => state.memos);

  // 💡 【重要】無限ループの原因だった useEffect（setTasks / setMemos）は完全に削除しました！
  // データのロードは useTimelineDnd の内部で直接ストアへ格納されるため、ここで同期する必要はありません。

  // 読み込み中なら画面を出す
  if (loading) {
    return <div className="flex w-full h-full justify-center items-center">データを読み込み中...</div>;
  }

  // 🎯 3. ストアの全タスクから、現在選択されている患者かつ時間軸付き(timed)のタスクだけをフィルタリング
  const timedTasks = storeAllTasks.filter(
    task => selectedPatients.includes(task.patient_id) && task.display_period.includes(':')
  );

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <main 
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
          {/* 💡 渡すデータをフックの生データから「Zustandストアのデータ」へ完全差し替え！ */}
          <TimelineMain 
            timedTasks={timedTasks}
            groupingMode={groupingMode}
            setGroupingMode={setGroupingMode}
            memos={storeMemos}
          />
        </div>
      </main>

      <DragOverlay>
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