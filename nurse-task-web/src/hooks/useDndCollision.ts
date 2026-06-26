import { pointerWithin } from '@dnd-kit/core';
import type{ CollisionDetection } from '@dnd-kit/core';

export function useDndCollision() {
  const customCollisionDetection: CollisionDetection = (args) => {
    const { active } = args;
    if (!active) return [];
    
    const draggedId = String(active.id);

    // 1. ドラッグ中のアイテムが「メモ」の場合
    if (draggedId.startsWith('memo-')) {
      // メモ専用のドロップ先、または時間枠（:を含む）だけをターゲットにする
      const memoTargets = args.droppableContainers.filter((container) => {
        const idStr = String(container.id);
        return idStr.startsWith('memo-drop-') || idStr.includes(':');
      });

      return pointerWithin({
        ...args,
        droppableContainers: memoTargets,
      });
    }

    // 2. ドラッグ中のアイテムが「タスク」の場合
    // メモ専用のドロップ先（memo-drop-から始まるエリア）を完全に除外する
    const taskTargets = args.droppableContainers.filter((container) => {
      return !String(container.id).startsWith('memo-drop-');
    });

    return pointerWithin({
      ...args,
      droppableContainers: taskTargets,
    });
  };

  return { customCollisionDetection };
}