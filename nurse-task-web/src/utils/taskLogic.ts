import type { ExtendedTask } from '../types/types';

export const handleCardClick = (task: ExtendedTask) => {
  if (task.priority === 'high') {
    alert("このタスクは重要度が高いため、グループ化できません");
    return;
  }
};

const getCat = (period: string) => {
  if (period === '午前') return 'AM';
  if (period === '午後') return 'PM';
  return 'ANY'; // 随時など
};

/**
 * 2つのタスクをグループ化（パターン2: 独立したユニークIDを発行）
 */
export const groupTasks = (prevTasks: ExtendedTask[], draggedId: string, targetId: string): ExtendedTask[] => {
  const draggedTask = prevTasks.find((t) => String(t.task_id) === String(draggedId));
  const targetTask = prevTasks.find((t) => String(t.task_id) === String(targetId));
  
  if (!draggedTask || !targetTask) return prevTasks;

  const targetPeriod = targetTask.display_period || "09:00";
  const groupTitle = targetTask.title; // 基準となるタイトル（例: "バイタル測定"など）

  // 💡 1. すでに同じ「タイトル」かつ同じ「表示時間帯」のグループが配列内に存在するか探す
  const existingGroupIndex = prevTasks.findIndex(
    (t) => t.isGroup && t.title === groupTitle && t.display_period === targetPeriod
  );

  if (existingGroupIndex !== -1) {
    // =========================================================
    // 【パターンA】すでに同じグループが存在する場合：新規作成せず、既存グループの children に追加する
    // =========================================================
    const existingGroup = prevTasks[existingGroupIndex];
    
    // すでに子として含まれていなければ追加
    const isAlreadyInside = existingGroup.children?.some(c => String(c.task_id) === String(draggedId));
    if (isAlreadyInside) return prevTasks;

    const newChild: ExtendedTask = {
      ...draggedTask,
      display_period: targetPeriod,
      isChild: true,
      parent_id: existingGroup.task_id,
    };

    const updatedGroup: ExtendedTask = {
      ...existingGroup,
      children: [...(existingGroup.children || []), newChild],
    };

    // 配列から draggedTask を取り除き、既存グループを更新版に差し替える
    return prevTasks
      .filter((t) => String(t.task_id) !== String(draggedId))
      .map((t) => (String(t.task_id) === String(existingGroup.task_id) ? updatedGroup : t));

  } else {
    // =========================================================
    // 【パターンB】存在しない場合のみ、新しく1つだけグループを作る
    // =========================================================
    const newGroupId = `group-${Date.now()}`;
    const currentGroupType = targetTask.title === draggedTask.title ? 'task' : 'patient';

    const childTarget: ExtendedTask = { 
      ...targetTask, 
      isChild: true, 
      parent_id: newGroupId 
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
      groupType: currentGroupType,
      children: [childTarget, childDragged],
    };

    return prevTasks
      .filter((t) => String(t.task_id) !== String(draggedId) && String(t.task_id) !== String(targetId))
      .concat(groupNode);
  }
};

/**
 * Firestoreから取得した平坦なタスク一覧から、parent_idを基にグループ構造を再構築する（パターン2対応）
 */
export const reconstructGroups = (flatTasks: ExtendedTask[]): ExtendedTask[] => {
  const groupsMap: Record<string, ExtendedTask[]> = {};
  const ungroupedTasks: ExtendedTask[] = [];

  // 1. parent_id があるもの（グループの子）とないもの（単体）に分ける
  flatTasks.forEach((task) => {
    if (task.parent_id) {
      if (!groupsMap[task.parent_id]) {
        groupsMap[task.parent_id] = [];
      }
      groupsMap[task.parent_id].push({ ...task, isChild: true });
    } else {
      ungroupedTasks.push(task);
    }
  });

  const result: ExtendedTask[] = [...ungroupedTasks];

  // 2. parent_id ごとにグループ表示用のノードを作る
  Object.entries(groupsMap).forEach(([groupId, children]) => {
    if (children.length === 0) return;

    // 代表として先頭の子タスクから表示用の情報を取得
    const representative = children[0];
    const firstOther = children.find((c) => c.task_id !== representative.task_id);
    const currentGroupType = firstOther && representative.title === firstOther.title ? 'task' : 'patient';

    const groupNode: ExtendedTask = {
      ...representative,
      task_id: groupId, // ★ "group-1710000000" のようなグループID
      isGroup: true,
      isChild: false,
      groupType: currentGroupType,
      children: children, // 子タスクたちをセット
    };

    result.push(groupNode);
  });

  return result;
};

function onStartGrouping(task_id: string) {
  throw new Error('Function not implemented.');
}