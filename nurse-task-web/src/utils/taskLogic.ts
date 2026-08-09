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
 * チーム名の表記揺れ ("A", "Aチーム", "A-team", "teamA") を統一比較用の文字列に正規化する
 */
export const normalizeTeamName = (teamName?: string): string => {
  if (!teamName) return "";
  const cleaned = String(teamName).toUpperCase().trim();
  const match = cleaned.match(/([A-Z0-9]+)/);
  return match ? match[1] : cleaned;
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
  const draggedTask = prevTasks.find((t) => String(t.task_id) === String(draggedId));
  const targetTask = prevTasks.find((t) => String(t.task_id) === String(targetId));
  
  if (!draggedTask || !targetTask) return prevTasks;

  // 1. 時間帯カテゴリが一致しているかチェック（異なる時間帯やずらせない時間同士の混ざりを防ぐ）
  const draggedCat = getCat(draggedTask.display_period);
  const targetCat = getCat(targetTask.display_period);

  if (draggedCat !== targetCat) {
    alert("異なる時間帯や、別々の時間指定のタスク同士はグループ化できません");
    return prevTasks;
  }

  const targetPeriod = targetTask.display_period;

  // 2. ターゲットがすでにグループ親ならそのID、子ならその親ID、どちらでもなければターゲットのIDを基準にする
  const parentId = targetTask.isGroup ? targetTask.task_id : (targetTask.parent_id || targetTask.task_id);

  // 3. すでにその親IDを持つグループが配列内に存在するか探す
  const existingGroup = prevTasks.find((t) => String(t.task_id) === String(parentId) && t.isGroup);

  if (existingGroup) {
    // =========================================================
    // 【パターンA】すでに親グループが存在する場合：新規作成せず、その children に追加する
    // =========================================================
    const isAlreadyInside = existingGroup.children?.some(c => String(c.task_id) === String(draggedId));
    if (isAlreadyInside) return prevTasks;

    const newChild: ExtendedTask = {
      ...draggedTask,
      display_period: targetPeriod,
      isChild: true,
      parent_id: parentId,
    };

    const updatedGroup: ExtendedTask = {
      ...existingGroup,
      children: [...(existingGroup.children || []), newChild],
    };

    return prevTasks
      .filter((t) => String(t.task_id) !== String(draggedId))
      .map((t) => (String(t.task_id) === String(parentId) ? updatedGroup : t));

  } else {
    // =========================================================
    // 【パターンB】まだ親グループが存在しない場合：新しく1つだけグループを作る
    // =========================================================
    const newGroupId = `group-${Date.now()}`;
    const currentGroupType = targetTask.groupType || (targetTask.title === draggedTask.title ? 'task' : 'patient');

    const childTarget: ExtendedTask = { 
      ...targetTask, 
      isChild: true, 
      parent_id: newGroupId,
      display_period: targetPeriod,
    };
    const childDragged: ExtendedTask = { 
      ...draggedTask, 
      display_period: targetPeriod, 
      isChild: true, 
      parent_id: newGroupId 
    };

    const groupNode: ExtendedTask = {
      ...targetTask,
      task_id: newGroupId,
      isGroup: true,
      isChild: false,
      display_period: targetPeriod,
      groupType: currentGroupType,
      children: [childTarget, childDragged],
    };

    return prevTasks
      .filter((t) => String(t.task_id) !== String(draggedId) && String(t.task_id) !== String(targetId))
      .concat(groupNode);
  }
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
    } else if (task.parent_id) {
      // 💡 子タスク
      if (!groupsMap[task.parent_id]) {
        groupsMap[task.parent_id] = [];
      }
      groupsMap[task.parent_id].push({ ...task, isChild: true });
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

  return result;
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
      // 左サイドバー表示用: 実施中 (progressing)、記録中 (record_start)、記録一時中断 (record_pending)
      // ※ pending (実施一時中断・保留) は画面下部の中断トレイ (PendingTray) に表示するため除外
      const isSidebarStatus = 
        task.status === 'progressing' || 
        task.status === 'record_start' || 
        task.status === 'record_pending';

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