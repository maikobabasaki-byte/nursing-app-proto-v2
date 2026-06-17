import { useState, useMemo } from 'react'; // useMemo を追加
import type { ExtendedTask } from '../types/types';

export const useTimelinePopup = (extendedTasks: ExtendedTask[]) => {
  const [activePopupTaskId, setActivePopupTaskId] = useState<string | null>(null);

  // 検索ロジックを useMemo で保護して、安全性を高める
  const activePopupTask = useMemo(() => {
    if (!activePopupTaskId) return null;
    
    for (const task of extendedTasks) {
      if (task.task_id === activePopupTaskId) return task;
      if (task.isGroup && task.children) {
        const foundChild = task.children.find(c => c.task_id === activePopupTaskId);
        if (foundChild) return foundChild;
      }
    }
    return null;
  }, [activePopupTaskId, extendedTasks]); // タスクリストが変わったら再計算

  const closePopup = () => setActivePopupTaskId(null);

  return { activePopupTaskId, setActivePopupTaskId, activePopupTask, closePopup };
};