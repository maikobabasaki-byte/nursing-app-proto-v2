import { useState, useEffect } from 'react';
import type { LeaderTodo, ExtendedTask } from '../types/types';
import type { NurseMaster, NursePin } from '../stores/useTimelineStore';

/**
 * 💡 基準時刻（分）を1分間隔で自動更新し、時間軸による進捗率をリアルタイム最新に再計算するフック
 */
export const useCurrentTimeMinutes = (intervalMs = 60000): number => {
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };

    const timer = setInterval(updateTime, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return currentMinutes;
};

/**
 * 💡 時刻文字列 ("14:00" や "14:30" 等) を「分（0〜1439分）」に変換する関数
 */
export const timeStringToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 9999;
  const str = String(timeStr).trim();
  const match = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    return hh * 60 + mm;
  }
  return 9999;
};

/**
 * 💡 現在時刻を "HH:mm" 形式の文字列および数値（分）で取得
 */
export const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export interface ProgressResult {
  totalCount: number;
  dueCount: number;
  completedOnTimeCount: number;
  overallCompletedCount: number;
  progressPercent: number; // 計画時間加味型進捗率 (%)
  dueProgressPercent: number; // 到来予定時間内の完了率 (%)
}

/**
 * 💡 タイムラインの計画時間を加味した進捗完了割合（%）を算出するコアロジック
 */
export const calculateLeaderTodoProgress = (
  todos: LeaderTodo[],
  targetMinutes: number = getCurrentTimeMinutes()
): ProgressResult => {
  const activeList = todos.filter((t) => !t.is_deleted && t.status !== 'deleted');
  const totalCount = activeList.length;

  if (totalCount === 0) {
    return {
      totalCount: 0,
      dueCount: 0,
      completedOnTimeCount: 0,
      overallCompletedCount: 0,
      progressPercent: 0,
      dueProgressPercent: 0,
    };
  }

  let dueCount = 0;
  let completedOnTimeCount = 0;
  let overallCompletedCount = 0;

  activeList.forEach((todo) => {
    const isCompleted = todo.status === 'completed';
    if (isCompleted) {
      overallCompletedCount += 1;
    }

    const scheduledMins = timeStringToMinutes(todo.scheduled_at);

    // 計画時間（scheduledMins）が現在時刻（targetMinutes）以下（すでに到来済）
    const isDue = scheduledMins <= targetMinutes;
    if (isDue) {
      dueCount += 1;
    }

    // 計画通りに完了したタスク判定
    if (isCompleted) {
      completedOnTimeCount += 1;
    }
  });

  // 全体タスクに対する計画完了割合 (%)
  const progressPercent = Math.round((completedOnTimeCount / totalCount) * 100);

  // 到来予定時間内の完了率 (%)
  const dueProgressPercent = dueCount > 0 ? Math.round((completedOnTimeCount / dueCount) * 100) : 100;

  return {
    totalCount,
    dueCount,
    completedOnTimeCount,
    overallCompletedCount,
    progressPercent,
    dueProgressPercent,
  };
};

/**
 * 💡 ExtendedTask（一般タスク・チーム別）の計画時間加味型進捗率算出ロジック
 */
export const calculateExtendedTasksProgress = (
  tasks: ExtendedTask[],
  teamFilter?: string,
  targetMinutes: number = getCurrentTimeMinutes()
): ProgressResult => {
  let activeList = tasks.filter((t) => t.status !== 'deleted');
  if (teamFilter) {
    activeList = activeList.filter((t) => t.team === teamFilter);
  }

  const totalCount = activeList.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      dueCount: 0,
      completedOnTimeCount: 0,
      overallCompletedCount: 0,
      progressPercent: 0,
      dueProgressPercent: 0,
    };
  }

  let dueCount = 0;
  let completedOnTimeCount = 0;
  let overallCompletedCount = 0;

  activeList.forEach((task) => {
    const isCompleted = task.status === 'completed';
    if (isCompleted) {
      overallCompletedCount += 1;
    }

    const scheduledMins = timeStringToMinutes(task.scheduled_time || task.display_period);
    const isDue = scheduledMins <= targetMinutes;
    if (isDue) {
      dueCount += 1;
    }

    if (isCompleted) {
      completedOnTimeCount += 1;
    }
  });

  const progressPercent = Math.round((completedOnTimeCount / totalCount) * 100);
  const dueProgressPercent = dueCount > 0 ? Math.round((completedOnTimeCount / dueCount) * 100) : 100;

  return {
    totalCount,
    dueCount,
    completedOnTimeCount,
    overallCompletedCount,
    progressPercent,
    dueProgressPercent,
  };
};

export interface NurseProgressResult {
  nurse_id: string;
  nurse_name: string;
  color?: string;
  team?: string;
  totalCount: number;
  completedOnTimeCount: number;
  overallCompletedCount: number;
  progressPercent: number;
}

/**
 * 🩺 看護師ごとのリアルタイム選択患者ベース進捗算出ロジック (プランB)
 * タスク側の nurse_id に依存せず、各看護師が「受け持ち」として選択している患者のタスクのみで集計
 */
export const calculateNurseProgressList = (
  nurses: (NurseMaster | NursePin)[],
  tasks: ExtendedTask[],
  assignments: Record<string, string[]> = {},
  _targetMinutes: number = getCurrentTimeMinutes()
): NurseProgressResult[] => {
  const activeTasks = (tasks || []).filter((t) => t.status !== 'deleted');

  return nurses.map((nurse) => {
    const nurseId = String(nurse.nurse_id || '');
    // 各看護師が選択している患者IDリスト (assignments[nurse_id] または nurse.assigned_patients)
    const rawMyPatientIds = assignments[nurseId] || nurse.assigned_patients || [];
    
    // 患者ID文字列の正規化
    const myPatientIdSet = new Set(
      rawMyPatientIds
        .map((p) => String(p || '').trim().toLowerCase())
        .filter((p) => p !== '')
    );

    // 看護師が選択している患者に紐づくタスクのみを抽出（タスク側のnurse_idは一切無視）
    const myTasks = activeTasks.filter((t) => {
      if (myPatientIdSet.size === 0) return false;
      const pId = String(t.patient_id || '').trim().toLowerCase();
      const rId = String(t.room_id || '').trim().toLowerCase();
      if (!pId && !rId) return false;

      // 1. 患者IDまたは病室IDでの完全一致
      if (pId !== '' && myPatientIdSet.has(pId)) return true;
      if (rId !== '' && myPatientIdSet.has(rId)) return true;

      // 2. 部分一致・数字抽出一致チェック
      for (const spStr of myPatientIdSet) {
        if (pId !== '' && (spStr.includes(pId) || pId.includes(spStr))) return true;
        if (rId !== '' && (spStr.includes(rId) || rId.includes(spStr))) return true;

        const spNum = spStr.replace(/\D/g, '');
        const pIdNum = pId.replace(/\D/g, '');
        if (spNum !== '' && spNum === pIdNum) return true;
      }

      return false;
    });

    const totalCount = myTasks.length;
    let completedOnTimeCount = 0;
    let overallCompletedCount = 0;

    myTasks.forEach((task: ExtendedTask) => {
      if (task.status === 'completed') {
        overallCompletedCount += 1;
        completedOnTimeCount += 1;
      }
    });

    const progressPercent = totalCount > 0 ? Math.round((completedOnTimeCount / totalCount) * 100) : 0;

    return {
      nurse_id: nurseId,
      nurse_name: String(nurse.name || '看護師'),
      color: (nurse as NursePin).color || '#6366f1',
      team: nurse.team || 'Aチーム',
      totalCount,
      completedOnTimeCount,
      overallCompletedCount,
      progressPercent,
    };
  });
};

/**
 * 🩺 A. チーム共有用ロジック（プランB: 各看護師の選択患者状況ベースで全員の進捗を同期計算）
 */
export const calculateTeamSharedProgress = calculateNurseProgressList;

/**
 * 🩺 B. 個人・選択患者用ロジック (エイリアス)
 */
export const calculateSelectedPatientProgress = calculateNurseProgressList;
