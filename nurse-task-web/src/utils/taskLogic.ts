import type{ ExtendedTask } from '../types/types';

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

export const groupTasks = (prevTasks: ExtendedTask[], draggedId: string, targetId: string): ExtendedTask[] => {
  const draggedTask = prevTasks.find((t) => String(t.task_id) === String(draggedId));
  const targetTask = prevTasks.find((t) => String(t.task_id) === String(targetId));
  
  if (!draggedTask || !targetTask) return prevTasks;

  // ここで直接比較！
  const draggedCat = getCat(draggedTask.display_period);
  const targetCat = getCat(targetTask.display_period);

  // これで午前と午後の混入を完全に防げます
  if (draggedCat !== 'ANY' && targetCat !== 'ANY' && draggedCat !== targetCat) {
    alert(`エラー：${draggedTask.display_period}のタスクを${targetTask.display_period}のグループに入れることはできません。`);
    return prevTasks;
  }

  // 既に親である場合と、そうでない場合の処理を統合する
  const isTargetGroup = targetTask.isGroup;
  
  // ドラッグされたカードを「子」の形式に変換
  const childDragged = { 
    ...draggedTask, 
    display_period: targetTask.display_period, 
    isChild: true, 
    parent_id: targetTask.task_id // 親のIDを保持
  };

  return prevTasks.map((task) => {
    // 1. ドラッグされた元タスクはリストから消す
    if (String(task.task_id) === String(draggedId)) return null;

    // 2. ドロップ先（親）に子を追加する
    // 2. ドロップ先（親）に子を追加する
    if (String(task.task_id) === String(targetId)) {
      if (isTargetGroup) {
        // すでにグループなら、children配列に追記
        return { 
          ...task, 
          children: [...(task.children || []), childDragged] 
        };
      } else {
        // 単体タスクなら、新しいグループ（親）へ変換
        const childTarget = { ...task, isChild: true, parent_id: targetId };
        
        // ─── 🚀 ここを追加！ ───
        // ドラッグしたカードと、重ねられたカードのタイトルが同じなら 'task_name'、違えば 'patient'
        const currentGroupType = task.title === draggedTask.title ? 'task_name' : 'patient';

        return {
          ...task,
          task_id: `group-${targetId}-${Date.now()}`,
          isGroup: true,
          groupType: currentGroupType, // 💡 ここで groupType を確定させる！
          children: [childTarget, childDragged]
        };
      }
    }
    return task;
  }).filter(Boolean) as ExtendedTask[]; // nullを削除
};

// グループ解除ロジック
export const ungroupTask = (prevTasks: ExtendedTask[], groupId: string, childTaskId: string, currentPeriod: string): ExtendedTask[] => {
  let newTasks = [...prevTasks];
  const groupTaskIndex = newTasks.findIndex(t => t.task_id === groupId);
  if (groupTaskIndex === -1) return prevTasks;

  const groupTask = newTasks[groupTaskIndex];
  const targetChild = groupTask.children?.find((c: any) => c.task_id === childTaskId);
  if (!targetChild) return prevTasks;

  const remainingChildren = groupTask.children!.filter((c: any) => c.task_id !== childTaskId);

  if (remainingChildren.length === 1) {
    newTasks[groupTaskIndex] = { ...remainingChildren[0], display_period: currentPeriod, isChild: false, parent_id: null };
  } else {
    newTasks[groupTaskIndex] = { ...groupTask, children: remainingChildren };
  }

  return [...newTasks, { ...targetChild, display_period: currentPeriod, isChild: false, parent_id: null }];
};

function onStartGrouping(task_id: string) {
    throw new Error('Function not implemented.');
}
