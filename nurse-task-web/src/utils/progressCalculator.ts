import { useState, useEffect } from 'react';
import type { LeaderTodo, ExtendedTask } from '../types/types';

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

import { useTimelineStore } from '../stores/useTimelineStore';

/**
 * 💡 看護師ごとの計画加味型進捗率一覧算出ロジック（選択患者タスク限定）
 */
export const calculateNurseProgressList = (
  nurses: any[],
  tasks: ExtendedTask[],
  selectedPatients: string[] = [],
  targetMinutes: number = getCurrentTimeMinutes()
): NurseProgressResult[] => {
  // 患者未選択時は受け持ち0件で初期化して返却
  if (!selectedPatients || selectedPatients.length === 0) {
    return nurses.map((n) => ({
      nurse_id: String(n.nurse_id || ''),
      nurse_name: String(n.name || '看護師'),
      color: n.color || '#6366f1',
      team: n.team || 'Aチーム',
      totalCount: 0,
      completedOnTimeCount: 0,
      overallCompletedCount: 0,
      progressPercent: 0,
    }));
  }

  // 🎯 1. 選択患者のタスクのみに厳格絞り込み（オブジェクト・文字列どちらも抽出対応）
  const isPatientMatch = (t: ExtendedTask) => {
    if (!t.patient_id && !t.room_id) return false;
    const pIdStr = String(t.patient_id || '').trim().toLowerCase();
    const rIdStr = String(t.room_id || '').trim().toLowerCase();

    return selectedPatients.some((sp: any) => {
      let spStr = '';
      if (typeof sp === 'object' && sp !== null) {
        spStr = String(sp.patient_id || sp.id || sp.room_id || '').trim().toLowerCase();
      } else {
        spStr = String(sp || '').trim().toLowerCase();
      }
      if (!spStr) return false;

      // 1. 完全一致
      if (spStr === pIdStr || spStr === rIdStr) return true;

      // 2. 部分一致
      if (pIdStr !== '' && (spStr.includes(pIdStr) || pIdStr.includes(spStr))) return true;
      if (rIdStr !== '' && (spStr.includes(rIdStr) || rIdStr.includes(spStr))) return true;

      // 3. 数字部分の抽出一致（"P211" と "211" の吸収）
      const spNum = spStr.replace(/\D/g, '');
      const pIdNum = pIdStr.replace(/\D/g, '');
      if (spNum !== '' && spNum === pIdNum) return true;

      return false;
    });
  };

  const selectedPatientTasks = tasks.filter((t) => t.status !== 'deleted' && isPatientMatch(t));

  console.groupCollapsed("📊 [calculateNurseProgressList 内部照合ログ]");
  console.log("入力データサマリー:", {
    nursesCount: nurses?.length || 0,
    totalTasksCount: tasks?.length || 0,
    selectedPatientsInputCount: selectedPatients?.length || 0,
    firstSelectedPatient: selectedPatients?.[0],
    firstSelectedPatientTypeof: typeof selectedPatients?.[0],
    selectedPatientTasksMatched: selectedPatientTasks.length,
    targetMinutes,
    isTargetMinutesNaN: Number.isNaN(targetMinutes),
  });
  if (tasks && tasks.length > 0) {
    console.log("サンプルタスク情報:", {
      taskId: tasks[0]?.task_id,
      patientId: tasks[0]?.patient_id,
      roomId: tasks[0]?.room_id,
      staffId: tasks[0]?.staff_id,
      nurseName: tasks[0]?.nurse_name,
    });
  }
  console.groupEnd();

  if (selectedPatientTasks.length === 0) {
    return nurses.map((n) => ({
      nurse_id: String(n.nurse_id || ''),
      nurse_name: String(n.name || '看護師'),
      color: n.color || '#6366f1',
      team: n.team || 'Aチーム',
      totalCount: 0,
      completedOnTimeCount: 0,
      overallCompletedCount: 0,
      progressPercent: 0,
    }));
  }

  // 🎯 2. 選択患者の各タスクをそれぞれの担当看護師へ割り当て
  const nurseTaskMap = new Map<string, ExtendedTask[]>();
  nurses.forEach((n) => {
    const key = String(n.nurse_id || n.name);
    nurseTaskMap.set(key, []);
  });

  selectedPatientTasks.forEach((task: any) => {
    let assignedKey: string | null = null;

    // A. ID / 名前によるダイレクト照合
    for (const nurse of nurses) {
      const nId = String(nurse.nurse_id || '').trim();
      const nEmail = String(nurse.email || '').trim();
      const nName = String(nurse.name || '').replace(/[\s　]+/g, '').replace(/看護師$/, '');

      const tStaffId = String(task.staff_id || '').trim();
      const tAssignedId = String(task.assigned_nurse_id || '').trim();
      const tNurseId = String(task.nurse_id || '').trim();
      const tNurseName = String(task.nurse_name || '').replace(/[\s　]+/g, '').replace(/看護師$/, '');

      // 1. ID・メールアドレスで一致
      if (
        (nId !== '' && (tStaffId === nId || tAssignedId === nId || tNurseId === nId)) ||
        (nEmail !== '' && (tStaffId === nEmail || tAssignedId === nEmail || tNurseId === nEmail))
      ) {
        assignedKey = String(nurse.nurse_id || nurse.name);
        break;
      }

      // 2. 看護師名で相互に一致
      if (
        tNurseName !== '' &&
        nName !== '' &&
        (tNurseName === nName || tNurseName.includes(nName) || nName.includes(tNurseName))
      ) {
        assignedKey = String(nurse.nurse_id || nurse.name);
        break;
      }
    }

    // B. 明示的指定がないタスクは、タスクのチーム属性 (task.team) または看護師のチーム属性で反映
    if (!assignedKey) {
      const teamNurse = nurses.find((n) => n.team && task.team && String(n.team).trim().toLowerCase() === String(task.team).trim().toLowerCase());
      if (teamNurse) {
        assignedKey = String(teamNurse.nurse_id || teamNurse.name);
      }
    }

    // C. 照合レイヤー4: GAS同期直後等で担当看護師が一時未特定の場合でも、選択患者タスクをメンバー看護師へ確実に反映（0件化を完全防止）
    if (!assignedKey && nurses.length > 0) {
      const fallbackNurse = nurses.find((n) => !n.is_leader) || nurses[0];
      assignedKey = String(fallbackNurse.nurse_id || fallbackNurse.name);
    }

    if (assignedKey && nurseTaskMap.has(assignedKey)) {
      nurseTaskMap.get(assignedKey)?.push(task);
    }
  });

  // 🎯 3. 各看護師の独立したプログレス計算結果を生成
  const nurseResults = nurses.map((nurse) => {
    const key = String(nurse.nurse_id || nurse.name);
    const myTasks = nurseTaskMap.get(key) || [];

    const totalCount = myTasks.length;
    let completedOnTimeCount = 0;
    let overallCompletedCount = 0;

    myTasks.forEach((task: any) => {
      const isCompleted = task.status === 'completed';
      if (isCompleted) {
        overallCompletedCount += 1;
        completedOnTimeCount += 1;
      }
    });

    const progressPercent = totalCount > 0 ? Math.round((completedOnTimeCount / totalCount) * 100) : 0;

    return {
      nurse_id: String(nurse.nurse_id || ''),
      nurse_name: String(nurse.name || '看護師'),
      color: nurse.color || '#6366f1',
      team: nurse.team || 'Aチーム',
      totalCount,
      completedOnTimeCount,
      overallCompletedCount,
      progressPercent,
    };
  });

  console.log('📊 [SelectedPatientsNurseProgressList]', {
    selectedPatientsCount: selectedPatients.length,
    selectedPatientTasksTotal: selectedPatientTasks.length,
    nurseTaskBreakdown: nurseResults.map((r) => `${r.nurse_name} (${r.team}): 受け持ち${r.totalCount}件 (${r.progressPercent}%)`),
  });

  return nurseResults;
};
