import type { ExtendedTask } from '../types/types';

export interface GroupValidationResult {
  canGroup: boolean;
  reason?: string;
}

/**
 * タスクの時間帯（午前 / 午後 / 随時）を判別するヘルパー
 */
export function getTaskTimeSlot(task: ExtendedTask): 'AM' | 'PM' | 'ANYTIME' | null {
  const period = (task.display_period || task.initial_period || '').trim();
  if (!period || period === '随時') return 'ANYTIME';
  if (period === '午前') return 'AM';
  if (period === '午後') return 'PM';

  const match = period.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    if (hours >= 0 && hours <= 11) return 'AM';
    if (hours >= 12 && hours <= 23) return 'PM';
  }

  return null;
}

/**
 * グループ化のルール判定
 * 1. 条件: 患者の一致 OR 時間帯（午前・午後）の一致
 * 2. 禁止: グループ化モードOFF / グループ同士の結合 / 優先順位「高」のグループ化
 */
export function validateTaskGrouping(
  draggedTask: ExtendedTask,
  targetTask: ExtendedTask,
  currentGroupingMode: string | null
): GroupValidationResult {
  // --- 1. 禁止事項のチェック（アーリーリターン） ---

  // ① グループ化モードが OFF（null）の場合は絶対にマージ・吸い込みを行わない
  if (currentGroupingMode === null) {
    return { canGroup: false };
  }

  // ② グループモード選択時のターゲット一致チェック
  if (currentGroupingMode !== null && String(targetTask.task_id) !== currentGroupingMode) {
    return { canGroup: false, reason: "選択中のグループ以外のタスクにはまとめられません。" };
  }

  // ③ グループ親ノード同士の直接結合禁止
  if (draggedTask.isGroup && targetTask.isGroup) {
    return { 
      canGroup: false, 
      reason: "グループ同士を直接まとめることはできません。" 
    };
  }

  // ④ 優先順位「高」のタスクはグループ化禁止（誤認防止）
  const isDraggedHighPriority = draggedTask.priority === 'high';
  const isTargetHighPriority = targetTask.priority === 'high';

  if (isDraggedHighPriority || isTargetHighPriority) {
    return { 
      canGroup: false, 
      reason: "優先順位「高」のタスクは誤認防止のため、単独で管理する必要があります。" 
    };
  }

  // --- 2. 許可条件のチェック（患者の一致 OR 時間帯「午前/午後」の一致） ---

  // A. 患者の一致チェック
  const isSamePatient = draggedTask.patient_id === targetTask.patient_id;

  // B. 時間帯（午前 / 午後 / 随時）の一致チェック
  const draggedSlot = getTaskTimeSlot(draggedTask);
  const targetSlot = getTaskTimeSlot(targetTask);

  const isSameTimeSlot = Boolean(
    draggedSlot && targetSlot && (
      draggedSlot === targetSlot || 
      draggedSlot === 'ANYTIME' || 
      targetSlot === 'ANYTIME'
    )
  );

  // 患者も時間帯（午前・午後）もどちらも一致していない場合は不可
  if (!isSamePatient && !isSameTimeSlot) {
    return { 
      canGroup: false, 
      reason: "「同一の患者」または「同時間帯（午前・午後）」のタスクのみグループ化できます。" 
    };
  }

  return { canGroup: true };
}