import type { ExtendedTask } from '../types/types';

/**
 * 様々な時刻文字列 ("10:00:00", "9:00", "10:00") から "HH:mm" 形式を抽出・正規化する
 */
export const normalizeToHHMM = (timeStr?: string): string => {
  if (!timeStr) return "";
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }
  return timeStr.trim();
};

/**
 * タスクの指定時刻 (例: "10:04") が、タイムラインの目盛りスロット (例: "10:00") の範囲内に含まれるか判定する
 */
export const isTimeInSlot = (timeStr?: string, slotTimeStr?: string, modeMinutes: number = 30): boolean => {
  if (!timeStr || !slotTimeStr) return false;
  const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  const slotMatch = String(slotTimeStr).match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch || !slotMatch) return timeStr.trim() === slotTimeStr.trim();

  const taskMins = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  const slotMins = parseInt(slotMatch[1], 10) * 60 + parseInt(slotMatch[2], 10);

  return taskMins >= slotMins && taskMins < slotMins + modeMinutes;
};

/**
 * チーム名の表記揺れ ("A", "Aチーム", "A-team", "teamA") を統一比較用の文字列に正規化する
 */
export const normalizeTeamName = (teamName?: string): string => {
  if (!teamName) return "";
  const cleaned = String(teamName).toUpperCase().trim();
  const match = cleaned.match(/([A-Z0-9]+)/);
  return match ? match[1] : cleaned;
};

/**
 * リーダーのチーム（leaderTeam）とタスクのチームが一致しているかを判定する
 */
export const isTaskInLeaderTeam = (
  task: ExtendedTask, 
  leaderTeam?: string, 
  nurseMaster: any[] = []
): boolean => {
  if (!leaderTeam) return true;
  const normalizedLeaderTeam = normalizeTeamName(leaderTeam);
  if (!normalizedLeaderTeam) return true;

  // 1. タスク自体のチーム属性チェック
  const normalizedTaskTeam = normalizeTeamName(task.team);
  if (normalizedTaskTeam !== '' && normalizedTaskTeam !== normalizedLeaderTeam) {
    return false;
  }

  // 2. 担当看護師のマスタチーム属性チェック
  const tNurseName = (task.nurse_name || '').replace(/[\s　]+/g, '');
  const tNurseId = (task.nurse_id || task.staff_id || task.assigned_nurse_id || '').trim();
  if ((tNurseName || tNurseId) && nurseMaster.length > 0) {
    const assignedNurse = nurseMaster.find(n => {
      const nName = (n.name || '').replace(/[\s　]+/g, '');
      const nId = (n.nurse_id || '').trim();
      return (
        (nId !== '' && (nId === tNurseId || nId === tNurseName)) ||
        (nName !== '' && (nName === tNurseName || nName === tNurseId || tNurseName.includes(nName) || nName.includes(tNurseName)))
      );
    });

    if (assignedNurse && assignedNurse.team) {
      const normalizedNurseTeam = normalizeTeamName(assignedNurse.team);
      if (normalizedNurseTeam !== '' && normalizedNurseTeam !== normalizedLeaderTeam) {
        return false;
      }
    }
  }

  return true;
};

export const handleCardClick = (task: ExtendedTask) => {
  if (task.priority === 'high') {
    alert("このタスクは重要度が高いため、グループ化できません");
    return;
  }
};

/**
 * タスクの表示時間帯からカテゴリを判定する
 * - 「午前」「午後」の大まかな枠
 * - 具体的な時間指定（例: "10:00"）はその時間自体をカテゴリとして扱い、他の時間と混ざらないようにする
 */
const getCat = (period: string) => {
  if (!period) return 'ANY';
  if (period === '午前') return 'AM';
  if (period === '午後') return 'PM';
  return period; // 固定の時間指定（例: "10:00"）は、同じ時間同士でのみ一致させる
};

/**
 * 2つのタスクをグループ化（既存の親グループへの相乗り、または新規親IDの発行）
 */
export const groupTasks = (prevTasks: ExtendedTask[], draggedId: string, targetId: string): ExtendedTask[] => {
  const findTaskById = (list: ExtendedTask[], id: string): ExtendedTask | null => {
    for (const t of list) {
      if (String(t.task_id) === String(id)) return t;
      if (t.children) {
        const found = findTaskById(t.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const draggedTask = findTaskById(prevTasks, draggedId);
  const targetTask = findTaskById(prevTasks, targetId);
  
  if (!draggedTask || !targetTask || draggedId === targetId) return prevTasks;

  const draggedCat = getCat(draggedTask.display_period);
  const targetCat = getCat(targetTask.display_period);

  if (draggedCat !== targetCat) {
    alert("異なる時間帯や、別々の時間指定のタスク同士はグループ化できません");
    return prevTasks;
  }

  const targetPeriod = targetTask.display_period;

  // ターゲットが親グループならそのID、子タスクなら親ID、単独なら null
  const targetGroupId = targetTask.isGroup ? targetTask.task_id : (targetTask.parent_id || null);

  const flat = flattenTasks(prevTasks).filter(t => String(t.task_id) !== String(draggedId) && String(t.task_id) !== String(targetId));

  if (targetGroupId) {
    const existingGroup = prevTasks.find((t) => String(t.task_id) === String(targetGroupId) && t.isGroup);

    if (existingGroup) {
      const newChild: ExtendedTask = {
        ...draggedTask,
        display_period: targetPeriod,
        isChild: true,
        parent_id: targetGroupId,
        isGroup: false,
      };

      const updatedGroup: ExtendedTask = {
        ...existingGroup,
        display_period: targetPeriod,
        children: [...(existingGroup.children || []).filter(c => String(c.task_id) !== String(draggedId)), newChild],
      };

      const cleaned = reconstructGroups(flat);
      return cleaned.map((t) => (String(t.task_id) === String(targetGroupId) ? updatedGroup : t));
    }
  }

  // 単独タスク同士のドロップ：新規のユニークグループを作成
  const newGroupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const currentGroupType = targetTask.groupType || (targetTask.title === draggedTask.title ? 'task' : 'patient');
  const groupTitle = targetTask.title === draggedTask.title ? targetTask.title : (currentGroupType === 'patient' ? targetTask.patient_name : targetTask.title);

  const childTarget: ExtendedTask = { 
    ...targetTask, 
    isChild: true, 
    parent_id: newGroupId,
    display_period: targetPeriod,
    isGroup: false,
  };
  const childDragged: ExtendedTask = { 
    ...draggedTask, 
    display_period: targetPeriod, 
    isChild: true, 
    parent_id: newGroupId,
    isGroup: false,
  };

  const groupNode: ExtendedTask = {
    ...targetTask,
    task_id: newGroupId,
    title: groupTitle,
    isGroup: true,
    isChild: false,
    parent_id: null,
    display_period: targetPeriod,
    groupType: currentGroupType,
    children: [childTarget, childDragged],
  };

  const cleaned = reconstructGroups(flat);
  return [...cleaned, groupNode];
};

/**
 * Firestoreから取得した平坦なタスク一覧から、parent_idを基にグループ構造を再構築する
 */
export const reconstructGroups = (flatTasks: ExtendedTask[]): ExtendedTask[] => {
  const groupsMap: Record<string, ExtendedTask[]> = {};
  const existingGroupNodes: Record<string, ExtendedTask> = {};
  const ungroupedTasks: ExtendedTask[] = [];

  // 1. parent_id や isGroup に応じて分類
  flatTasks.forEach((task) => {
    if (!task || task.status === 'deleted') return;
    if (task.isGroup) {
      // 💡 Firestore上に独立して存在する親グループドキュメント
      existingGroupNodes[task.task_id] = task;
      if (task.children && task.children.length > 0) {
        if (!groupsMap[task.task_id]) {
          groupsMap[task.task_id] = [];
        }
        task.children.forEach(child => {
          if (!groupsMap[task.task_id].some(c => String(c.task_id) === String(child.task_id))) {
            groupsMap[task.task_id].push({ ...child, isChild: true, parent_id: task.task_id });
          }
        });
      }
    } else if (task.parent_id) {
      // 💡 子タスク
      if (!groupsMap[task.parent_id]) {
        groupsMap[task.parent_id] = [];
      }
      if (!groupsMap[task.parent_id].some(c => String(c.task_id) === String(task.task_id))) {
        groupsMap[task.parent_id].push({ ...task, isChild: true });
      }
    } else {
      // 💡 親でも子でもない単体タスク
      ungroupedTasks.push(task);
    }
  });

  const result: ExtendedTask[] = [...ungroupedTasks];

  // 2. parent_id ごとにグループノードを組み立てる
  Object.entries(groupsMap).forEach(([groupId, children]) => {
    if (children.length === 0) return;

    // 💡 子タスクが1つだけ残った場合はグループを解体し、単体タスクに戻す
    if (children.length === 1) {
      const singleTask: ExtendedTask = {
        ...children[0],
        parent_id: null,
        isChild: false,
        isGroup: false,
      };
      result.push(singleTask);
      return;
    }

    // 💡 2つ以上の場合のみグループノードを作成
    const baseNode = existingGroupNodes[groupId] || children[0];
    const representative = children[0];
    const firstOther = children.find((c) => c.task_id !== representative.task_id);
    const currentGroupType = baseNode.groupType || (firstOther && representative.title === firstOther.title ? 'task' : 'patient');

    const groupNode: ExtendedTask = {
      ...baseNode,
      task_id: groupId, 
      isGroup: true,
      isChild: false,
      groupType: currentGroupType,
      children: children, 
    };

    result.push(groupNode);
  });

  const uniqueResultMap = new Map<string, ExtendedTask>();
  result.forEach(t => {
    if (t && t.task_id && !uniqueResultMap.has(t.task_id)) {
      uniqueResultMap.set(t.task_id, t);
    }
  });

  return Array.from(uniqueResultMap.values());
};

/**
 * ログインユーザーの実施中・記録中タスクを全階層（children含む）から抽出するヘルパー
 */
export const extractUserProgressingTasks = (
  tasks: ExtendedTask[],
  userName: string
): ExtendedTask[] => {
  if (!tasks || tasks.length === 0) return [];

  const result: ExtendedTask[] = [];

  const traverse = (list: ExtendedTask[]) => {
    for (const task of list) {
      // 左サイドバー表示用: 実施中 (progressing)、記録中 (record_start)
      // ※ pending (実施一時中断・保留) および record_pending (記録一時中断) は画面下部の中断トレイ (PendingTray) に表示するため除外
      const isSidebarStatus = 
        task.status === 'progressing' || 
        task.status === 'record_start';

      const isDemoSidebarTask = 
        task.task_id === 'demo-task-tutorial' && 
        isSidebarStatus;

      // 担当者名が一致するか
      const isNurseMatch = !userName || !task.nurse_name || task.nurse_name === userName;

      if ((isSidebarStatus || isDemoSidebarTask) && isNurseMatch) {
        result.push(task);
      }

      if (task.children && task.children.length > 0) {
        traverse(task.children);
      }
    }
  };

  traverse(tasks);
  return result;
};

/**
 * 親グループを含むタスク配列を再帰的に展開（フラット化）し、全ての実体タスク（子タスク含む）の1次元配列を返す
 */
export const flattenTasks = (tasks: ExtendedTask[]): ExtendedTask[] => {
  if (!tasks || tasks.length === 0) return [];
  const result: ExtendedTask[] = [];

  const traverse = (list: ExtendedTask[]) => {
    for (const task of list) {
      if (!task) continue;
      if (task.isGroup && task.children && task.children.length > 0) {
        traverse(task.children);
      } else {
        result.push(task);
      }
    }
  };

  traverse(tasks);
  return result;
};

/**
 * 現場ルールに基づいた初期優先度（high, medium, low）を自動判定する関数
 */
export const assignDefaultPriority = (task: {
  title?: string;
  details?: string;
  priority?: string;
  requiresAssist?: boolean;
  requires_assist?: boolean;
}): 'high' | 'medium' | 'low' => {
  if (task.priority === 'high' || task.priority === 'medium' || task.priority === 'low') {
    return task.priority;
  }

  const text = `${task.title || ''} ${task.details || ''}`.toLowerCase();

  // 🔴 High: 「血糖」「点滴」「配薬」「インスリン」「投薬」等、生命・薬効に直接関わる業務
  const highKeywords = ['血糖', '点滴', '配薬', 'インスリン', '投薬', '注射', '輸液', '抗生剤'];
  if (highKeywords.some(kw => text.includes(kw))) {
    return 'high';
  }

  // 🟢 Medium: 複数人での対応が必要な業務（介助、移乗、体位変換、ダブルチェック等）または複数人フラグ
  const mediumKeywords = ['介助', '移乗', '体位変換', '2名', '２名', '2人', '２人', 'ダブルチェック'];
  if (
    task.requiresAssist ||
    task.requires_assist ||
    mediumKeywords.some(kw => text.includes(kw))
  ) {
    return 'medium';
  }

  // 🔵 Low: バイタル、清拭、体温、血圧などの単独実施可能なルーチン業務（その他デフォルト）
  return 'low';
};

/**
 * タスクを表示時刻（display_period）昇順に並び替える関数
 */
export const sortTasksChronologically = <T extends { display_period?: string; initial_period?: string }>(tasks: T[]): T[] => {
  return [...tasks].sort((a, b) => {
    const timeA = a.display_period || a.initial_period || '';
    const timeB = b.display_period || b.initial_period || '';
    return timeA.localeCompare(timeB);
  });
};