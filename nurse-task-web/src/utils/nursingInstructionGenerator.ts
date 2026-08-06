import type { ExtendedTask, Patient } from '../types/types';

/**
 * 🩺 既存のタスクをベースに手動で別時間帯や別患者へ複製（コピー追加）するヘルパー関数
 */
export const duplicateNursingTask = (
  originalTask: ExtendedTask,
  targetPatient: Patient,
  targetPeriod?: string
): ExtendedTask => {
  const timestamp = Date.now();
  const newTaskId = `copied-nursing-inst-${targetPatient.patient_id}-${timestamp}`;
  const period = targetPeriod || originalTask.display_period || '14:00';

  return {
    ...originalTask,
    task_id: newTaskId,
    emr_order_id: newTaskId,
    patient_id: targetPatient.patient_id,
    patient_name: targetPatient.name,
    room_id: targetPatient.room_id || originalTask.room_id,
    instruction_type: originalTask.instruction_type || '看護指示',
    title: originalTask.title.includes('【追加】') || originalTask.title.includes('【看護指示】') 
      ? originalTask.title 
      : `【看護指示】${originalTask.title}`,
    display_period: period,
    initial_period: period,
    scheduled_at: `${new Date().toISOString().split('T')[0]}T${period}:00`,
    status: 'untouched',
    is_additional: true,
    parent_id: null,
    is_sos: false,
  };
};
