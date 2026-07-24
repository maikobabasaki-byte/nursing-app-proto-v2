import { useState, useRef, useMemo, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { useDndCollision } from './useDndCollision';
import type { ExtendedTask } from '../types/types';
import { useTimelineStore } from '../stores/useTimelineStore';

interface UseTimelineDndProps {
  selectedPatients: string[];
}

export function useTimelineDnd({ selectedPatients }: UseTimelineDndProps) {
  const { customCollisionDetection } = useDndCollision();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Store からステートとアクションを取得
  const { 
    allTasks, memos, loading, groupingMode, 
    setGroupingMode, setMemos, handleUpdateTaskPeriod, handleGroupTasks 
  } = useTimelineStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const draggedTaskRef = useRef<ExtendedTask | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find(t => String(t.task_id) === String(event.active.id));
    if (task) draggedTaskRef.current = task;
    setActiveId(String(event.active.id));
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

    // --- C. グループ化バリデーション & 実行 ---
    const targetTask = allTasks.find(t => String(t.task_id) === overId);
    const originalTask = draggedTaskRef.current;

    if (originalTask && targetTask && groupingMode !== null) {
      if (overId !== groupingMode) {
        alert("選択中のグループ以外のタスクにはまとめられません。");
        return;
      }

      // バリデーション：患者チェック
      if (targetTask.groupType === 'patient' && originalTask.patient_id !== targetTask.patient_id) {
        alert("異なる患者のタスクをまとめることはできません。");
        return;
      }

      // バリデーション：時間帯（AM/PM）チェック
      const getCat = (p?: string) => (p === '午前' ? 'AM' : p === '午後' ? 'PM' : 'ANY');
      if (getCat(originalTask.display_period) !== 'ANY' && 
          getCat(targetTask.display_period) !== 'ANY' && 
          getCat(originalTask.display_period) !== getCat(targetTask.display_period)) {
        alert(`区分が異なるタスク（${originalTask.display_period} と ${targetTask.display_period}）をグループ化できません。`);
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