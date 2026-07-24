import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDndContext } from '@dnd-kit/core';
import { validateTaskGrouping } from '../../utils/validateTaskGrouping';
import type { ExtendedTask } from '../../types/types';

interface Props {
  task: ExtendedTask;
  groupingMode: string | null;
  children: React.ReactNode;
}

export const DroppableTaskCard: React.FC<Props> = ({ task, groupingMode, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: String(task.task_id),
  });

  // dnd-kit 全体の文脈から、今ドラッグされているアイテム（active）情報を取得
  const { active } = useDndContext();
  
  // ドラッグ中のタスクデータを取得（active.data から渡すか、IDから検索）
  const activeTask = active?.data.current?.task as ExtendedTask | undefined;

  // ホバー（isOver）かつ、ドラッグ中のアイテムが存在する場合にバリデーション実行
  let isInvalidDrop = false;
  if (isOver && activeTask && activeTask.task_id !== task.task_id) {
    const { canGroup } = validateTaskGrouping(activeTask, task, groupingMode);
    isInvalidDrop = !canGroup;
  }

  // スタイルの切り替え（Tailwind CSS の例）
  const dynamicClasses = [
    'transition-all duration-150',
    isOver && !isInvalidDrop ? 'ring-2 ring-emerald-500 bg-emerald-50/50 cursor-copy' : '', // ドロップOK: 緑枠
    isInvalidDrop ? 'ring-2 ring-rose-500 bg-rose-50/50 cursor-not-allowed' : '',            // ドロップNG: 赤枠 & not-allowed
  ].join(' ');

  return (
    <div ref={setNodeRef} className={dynamicClasses}>
      {children}
    </div>
  );
};