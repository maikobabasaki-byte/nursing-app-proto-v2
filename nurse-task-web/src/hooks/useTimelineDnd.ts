import { useState, useRef, useMemo, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useDndCollision } from './useDndCollision';
import type { ExtendedTask } from '../types/types';
import { useTimelineStore } from '../stores/useTimelineStore';
import { validateTaskGrouping } from '../utils/validateTaskGrouping';

interface UseTimelineDndProps {
  selectedPatients: string[];
}

export function useTimelineDnd({ selectedPatients }: UseTimelineDndProps) {
  const { customCollisionDetection } = useDndCollision();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  // Store からステートとアクションを取得
  const { 
    allTasks, memos, loading, groupingMode, 
    setGroupingMode, setMemos, handleUpdateTaskPeriod, handleGroupTasks, handleReorderTasks 
  } = useTimelineStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const draggedTaskRef = useRef<ExtendedTask | null>(null);

  // 全階層（children含む）からタスクを検索するヘルパー関数
  const findTaskRecursive = useCallback((tasks: ExtendedTask[], targetId: string): ExtendedTask | null => {
    for (const t of tasks) {
      if (String(t.task_id) === targetId) return t;
      if (t.children && t.children.length > 0) {
        const found = findTaskRecursive(t.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const activeTargetId = String(event.active.id);
    const task = (event.active.data.current?.task as ExtendedTask | undefined) || findTaskRecursive(allTasks, activeTargetId);
    if (task) draggedTaskRef.current = task;
    setActiveId(activeTargetId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // --- A. メモのドロップ処理 ---
    if (draggedId.startsWith('memo-')) {
      const pureMemoId = draggedId.replace('memo-', '');
      const targetTime = overId.startsWith('memo-drop-') ? overId.replace('memo-drop-', '') : overId;
      if (overId.includes(':') || overId.startsWith('memo-drop-')) {
        setMemos(memos.map(m => String(m.id) === pureMemoId ? { ...m, time: targetTime } : m));
      }
      return;
    }

    // --- B. 時間軸ゾーンへのドロップ ---
    if (overId.includes(':')) {
      await handleUpdateTaskPeriod(draggedId, overId);
      return;
    }

    // --- C. グループ化 / ソート（順序並び替え） ---
    const targetTask = findTaskRecursive(allTasks, overId);
    const originalTask = (active.data.current?.task as ExtendedTask | undefined) || draggedTaskRef.current || findTaskRecursive(allTasks, draggedId);

    if (originalTask && targetTask) {
      // 💡 グループ化モードが OFF (groupingMode === null) の場合 ➡️ 行内・タスク間での順序並び替え (ソート)
      if (groupingMode === null) {
        await handleReorderTasks(draggedId, overId);
        draggedTaskRef.current = null;
        return;
      }

      const validation = validateTaskGrouping(originalTask, targetTask, groupingMode);
      if (!validation.canGroup) {
        if (validation.reason) {
          alert(validation.reason);
        }
        draggedTaskRef.current = null;
        return;
      }

      await handleGroupTasks(draggedId, overId);
    }

    draggedTaskRef.current = null;
  };

  // フィルタリング処理（メモ化）
  const { poolTasks, timedTasks } = useMemo(() => {
    const patientTasks = allTasks.filter(task => selectedPatients.includes(task.patient_id));
    return {
      poolTasks: patientTasks.filter(task => !task.display_period?.includes(':')),
      timedTasks: patientTasks.filter(task => task.display_period?.includes(':'))
    };
  }, [allTasks, selectedPatients]);

  return {
    allTasks, memos, loading, groupingMode, activeId, sensors,
    customCollisionDetection, handleDragStart, handleDragEnd,
    setGroupingMode, poolTasks, timedTasks
  };
}