import type { ExtendedTask } from '../types/types';

export interface GroupValidationResult {
  canGroup: boolean;
  reason?: string;
}

/**
 * グループ化のルール判定
 * 1. 条件: 患者の一致 OR 時間の一致
 * 2. 禁止: グループ同士の結合 / 優先順位「高」のグループ化
 */
export function validateTaskGrouping(
  draggedTask: ExtendedTask,
  targetTask: ExtendedTask,
  currentGroupingMode: string | null
): GroupValidationResult {
  // --- 1. 禁止事項のチェック（アーリーリターン） ---

  // ① グループモードの選択チェック
  if (currentGroupingMode !== null && String(targetTask.task_id) !== currentGroupingMode) {
    return { canGroup: false, reason: "選択中のグループ以外のタスクにはまとめられません。" };
  }

  // ② グループ同士（すでに親である、あるいは子タスクである）のグループ化禁止
  const isDraggedGroup = !!(draggedTask.children && draggedTask.children.length > 0) || !!draggedTask.parent_id;
  const isTargetGroup = !!(targetTask.children && targetTask.children.length > 0) || !!targetTask.parent_id;

  if (isDraggedGroup || isTargetGroup) {
    return { 
      canGroup: false, 
      reason: "すでにグループ化されているタスク同士や、子タスクをさらにまとめ直すことはできません。" 
    };
  }

  // ③ 優先順位「高」のタスクはグループ化禁止（誤認防止）
  const isDraggedHighPriority = draggedTask.priority === 'high';
  const isTargetHighPriority = targetTask.priority === 'high';

  if (isDraggedHighPriority || isTargetHighPriority) {
    return { 
      canGroup: false, 
      reason: "優先順位「高」のタスクは誤認防止のため、単独で管理する必要があります。" 
    };
  }

  // --- 2. 許可条件のチェック（患者の一致 OR 時間の一致） ---

  // A. 患者の一致チェック
  const isSamePatient = draggedTask.patient_id === targetTask.patient_id;

  // B. 時間の一致チェック
  const isSameTime = !!(
    draggedTask.display_period && 
    targetTask.display_period && 
    draggedTask.display_period === targetTask.display_period
  );

  // 患者も時間もどちらも一致していない場合は不可
  if (!isSamePatient && !isSameTime) {
    return { 
      canGroup: false, 
      reason: "「同一の患者」または「同一の時間帯」のタスクのみグループ化できます。" 
    };
  }

  return { canGroup: true };
}