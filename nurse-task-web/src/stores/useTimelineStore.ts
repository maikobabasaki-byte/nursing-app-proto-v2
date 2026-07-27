import { create } from 'zustand';
import type { ExtendedTask, Memo, ExtendedTaskStatus } from '../types/types';
import { updateTask } from '../hooks/useTaskUpdate';
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface TimelineStore {
  allTasks: ExtendedTask[];
  memos: Memo[];
  loading: boolean;
  groupingMode: string | null;
  activeId: string | null;
  activePopupTaskId: string | null;
  
  activeMemoTime: string | null;
  editingMemo: Memo | null;
  newMemoText: string;

  setTasks: (tasks: ExtendedTask[]) => void;
  setMemos: (memos: Memo[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveId: (id: string | null) => void;
  setActivePopupTaskId: (id: string | null) => void;
  setActiveMemoTime: (time: string | null) => void;
  setEditingMemo: (memo: Memo | null) => void;
  setNewMemoText: (text: string) => void;
  setGroupingMode: (mode: string | null) => void;
  
  handleStartGrouping: (taskId: string | null) => void;
  handleUpdateStatus: (taskId: string, status: ExtendedTaskStatus, unexecutedReason?: string) => void;
  handleUpdateTaskPeriod: (taskId: string, period: string) => void;
  handleGroupTasks: (draggedId: string, targetId: string) => Promise<void>;
  handleUngroupTask: (childId: string) => Promise<void>;
  
  toggleTaskSos: (taskId: string, reason?: string) => void;
  
  closeMemoPopup: () => void;
  handleSaveMemo: (memo: Memo) => void;
  handleDeleteMemo: (memoId: string) => void;
}

/**
 * 💡 オブジェクトから undefined のプロパティをすべて取り除くヘルパー
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, removeUndefined(v)])
  );
};

/**
 * 💡 指定したIDのタスクを、ルートおよびすべての階層（子孫含む）から完全に除外するヘルパー
 */
const removeTaskRecursive = (tasks: ExtendedTask[], targetIds: string[]): ExtendedTask[] => {
  return tasks
    .filter(t => !targetIds.includes(t.task_id))
    .map(t => {
      if (t.children && t.children.length > 0) {
        const filteredChildren = removeTaskRecursive(t.children, targetIds);
        return {
          ...t,
          children: filteredChildren,
          isGroup: filteredChildren.length > 0
        };
      }
      return t;
    });
};

const getTaskCategory = (task: ExtendedTask) => {
  const originalPeriod = task.initial_period || task.display_period;
  
  if (!originalPeriod) return 'ANY';
  if (originalPeriod === '午前') return 'AM';
  if (originalPeriod === '午後') return 'PM';
  if (originalPeriod === '随時') return 'ANYTIME';
  
  return originalPeriod;
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  allTasks: [],
  memos: [],
  loading: false,
  groupingMode: null,
  activeId: null,
  activePopupTaskId: null,
  
  activeMemoTime: null,
  editingMemo: null,
  newMemoText: "",

  setTasks: (tasks) => set({ allTasks: tasks }),
  setMemos: (memos) => set({ memos }),
  setLoading: (loading) => set({ loading }),
  setActiveId: (id) => set({ activeId: id }),
  setActivePopupTaskId: (id) => set({ activePopupTaskId: id }),
  setActiveMemoTime: (time) => set({ activeMemoTime: time }),
  setEditingMemo: (memo) => set({ editingMemo: memo }),
  setNewMemoText: (text) => set({ newMemoText: text }),
  setGroupingMode: (mode) => set({ groupingMode: mode }),

  handleStartGrouping: (taskId) => set((state) => ({
    groupingMode: state.groupingMode === taskId ? null : taskId
  })),

  handleUpdateStatus: (taskId, status, unexecutedReason) => set((state) => {
    let targetPreviousProgressingId: string | null = null;

    if (status === 'progressing') {
      state.allTasks.forEach(task => {
        if (task.status === 'progressing' && task.task_id !== taskId) {
          targetPreviousProgressingId = task.task_id;
        }
        task.children?.forEach(child => {
          if (child.status === 'progressing' && child.task_id !== taskId) {
            targetPreviousProgressingId = child.task_id;
          }
        });
      });
    }

    if (targetPreviousProgressingId) {
      updateTask(targetPreviousProgressingId, { status: 'pending' });
    }

    const updatedTasks = state.allTasks.map((task) => {
      let newParentStatus = task.status;

      if (task.task_id === taskId) {
        newParentStatus = status;
      } else if (status === 'progressing' && task.status === 'progressing') {
        newParentStatus = 'pending';
      }

      let updatedChildren = task.children;
      if (task.children) {
        updatedChildren = task.children.map((child) => {
          if (child.task_id === taskId) {
            return { 
              ...child, 
              status,
              unexecuted_reason: status === 'unexecuted' ? (unexecutedReason || child.unexecuted_reason || '') : ''
            };
          }
          if (status === 'progressing' && child.status === 'progressing') {
            return { ...child, status: 'pending' };
          }
          return child;
        });
      }

      return {
        ...task,
        status: newParentStatus,
        unexecuted_reason: task.task_id === taskId ? (status === 'unexecuted' ? (unexecutedReason || task.unexecuted_reason || '') : '') : task.unexecuted_reason,
        children: updatedChildren,
      };
    });

    return { allTasks: updatedTasks };
  }),

  handleUpdateTaskPeriod: (taskId, period) => {
    const { allTasks } = get();
    const task = allTasks.find(t => t.task_id === taskId);

    if (task) {
      const initialPeriodToSave = task.initial_period || task.display_period;

      updateTask(taskId, { 
        display_period: period, 
        initial_period: initialPeriodToSave 
      });

      set((state) => ({
        allTasks: state.allTasks.map(t => 
          t.task_id === taskId ? { 
            ...t, 
            display_period: period,
            initial_period: initialPeriodToSave 
          } : t
        )
      }));
    }
  },

  handleGroupTasks: async (draggedId, targetId) => {
    const { allTasks } = get();
    if (draggedId === targetId) return;

    let draggedTask: ExtendedTask | null = null;
    let targetTask: ExtendedTask | null = null;

    // 探索
    const findTaskRecursive = (list: ExtendedTask[]) => {
      for (const t of list) {
        if (t.task_id === draggedId) draggedTask = t;
        if (t.task_id === targetId) targetTask = t;
        if (t.children) findTaskRecursive(t.children);
      }
    };
    findTaskRecursive(allTasks);

    if (!draggedTask || !targetTask) return;

    const draggedCat = getTaskCategory(draggedTask);
    const targetCat = getTaskCategory(targetTask);

    const isMismatched = 
      draggedCat !== 'ANYTIME' && 
      targetCat !== 'ANYTIME' && 
      draggedCat !== targetCat;

    if (isMismatched) {
      alert("元の指示の時間帯や時間指定が異なるため、グループ化できません");
      return;
    }

    const targetPeriod = targetTask.display_period || "09:00";
    const groupTitle = targetTask.title;

    const existingGroup = allTasks.find(
      (t) => t.isGroup && t.title === groupTitle && t.display_period === targetPeriod
    );

    try {
      if (existingGroup) {
        // =========================================================
        // 【パターンA】すでに親グループが存在する場合
        // =========================================================
        const newChild: ExtendedTask = {
          ...draggedTask,
          isChild: true,
          parent_id: existingGroup.task_id,
          display_period: targetPeriod,
          children: undefined,
        };

        const isAlreadyInside = existingGroup.children?.some(c => c.task_id === draggedId);
        const updatedChildren = isAlreadyInside 
          ? existingGroup.children 
          : [...(existingGroup.children || []), newChild];

        const updatedGroup: ExtendedTask = {
          ...existingGroup,
          children: updatedChildren,
        };

        await updateTask(draggedId, { parent_id: existingGroup.task_id, display_period: targetPeriod });

        set((state) => {
          // 💡 既存グループ以外の場所から draggedId を完全に排除する
          const cleaned = removeTaskRecursive(state.allTasks, [draggedId]);
          const finalTasks = cleaned.map((t) => 
            t.task_id === existingGroup.task_id ? updatedGroup : t
          );
          return { allTasks: finalTasks };
        });

      } else {
        // =========================================================
        // 【パターンB】新規グループを作成する場合
        // =========================================================
        const newGroupId = `group-${Date.now()}`;
        const currentGroupType = targetTask.title === draggedTask.title ? 'task' : 'patient';

        const childTarget: ExtendedTask = { 
          ...targetTask, 
          isChild: true, 
          parent_id: newGroupId,
          display_period: targetPeriod,
          children: undefined 
        };
        const childDragged: ExtendedTask = { 
          ...draggedTask, 
          isChild: true, 
          parent_id: newGroupId,
          display_period: targetPeriod,
          children: undefined 
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

        await setDoc(doc(db, "tasks", newGroupId), removeUndefined(groupNode));
        await updateTask(draggedId, { parent_id: newGroupId, display_period: targetPeriod });
        await updateTask(targetId, { parent_id: newGroupId, display_period: targetPeriod });

        set((state) => {
          // 💡 draggedId と targetId を全階層から完全に排除してから、新しいグループノードを追加する
          const cleaned = removeTaskRecursive(state.allTasks, [draggedId, targetId]);
          return { allTasks: [...cleaned, groupNode] };
        });
      }
    } catch (error) {
      console.error("❌ グループ化処理に失敗しました:", error);
    }
  },

  handleUngroupTask: async (childId: string) => {
    const { allTasks } = get();

    // 解除対象の子タスクが所属する親グループを検索
    let parentGroup: ExtendedTask | undefined;
    allTasks.forEach((t) => {
      if (t.isGroup && t.children?.some((c) => c.task_id === childId)) {
        parentGroup = t;
      }
    });

    // 解除されたタスクの parent_id を解除
    await updateTask(childId, { parent_id: null });

    if (parentGroup && parentGroup.children) {
      const remainingChildren = parentGroup.children.filter((c) => c.task_id !== childId);

      // 💡 残りが1個以下の場合は、残りの子タスクの parent_id も解除し、親ドキュメントを削除
      if (remainingChildren.length <= 1) {
        for (const child of remainingChildren) {
          await updateTask(child.task_id, { parent_id: null });
        }
        await deleteDoc(doc(db, "tasks", parentGroup.task_id));
      }
    }

    set((state) => {
      const updatedTasks = state.allTasks
        .map((task) => {
          if (task.isGroup && task.children) {
            const nextChildren = task.children.filter((c: ExtendedTask) => c.task_id !== childId);
            
            if (nextChildren.length <= 1) {
              return null; // 親グループ自体を解体
            }

            return {
              ...task,
              children: nextChildren,
            };
          }
          return task;
        })
        .filter(Boolean) as ExtendedTask[];

      const releasedTasks: ExtendedTask[] = [];

      state.allTasks.forEach((task) => {
        if (task.isGroup && task.children) {
          const isTargetGroup = task.children.some((c) => c.task_id === childId);
          if (isTargetGroup) {
            const nextChildren = task.children.filter((c) => c.task_id !== childId);
            if (nextChildren.length <= 1) {
              // 残りの全タスクを単体化
              task.children.forEach((c) => {
                releasedTasks.push({ ...c, parent_id: null, isChild: false, isGroup: false });
              });
            } else {
              // 解除されたタスクのみ単体化
              const target = task.children.find((c) => c.task_id === childId);
              if (target) {
                releasedTasks.push({ ...target, parent_id: null, isChild: false, isGroup: false });
              }
            }
          }
        }
      });

      const finalTasks = [...updatedTasks];
      releasedTasks.forEach((rt) => {
        if (!finalTasks.some((t) => t.task_id === rt.task_id)) {
          finalTasks.push(rt);
        }
      });

      return { allTasks: finalTasks };
    });
  },

  toggleTaskSos: (taskId, reason) => set((state) => {
    const task = state.allTasks.find(t => t.task_id === taskId) ||
                 state.allTasks.flatMap(t => t.children || []).find(c => c.task_id === taskId);
    if (task) {
      const nextIsSos = !task.is_sos;
      const nextSosReason = nextIsSos ? (reason || "緊急応援要請が発生しました") : "";

      updateTask(taskId, { is_sos: nextIsSos, sos_reason: nextSosReason });

      const updatedTasks = state.allTasks.map((t) => {
        if (t.task_id === taskId) {
          return {
            ...t,
            is_sos: nextIsSos,
            sos_reason: nextSosReason
          };
        }
        if (t.isGroup && t.children) {
          const hasChild = t.children.some(c => c.task_id === taskId);
          if (hasChild) {
            const newChildren = t.children.map(c => {
              if (c.task_id === taskId) {
                return {
                  ...c,
                  is_sos: nextIsSos,
                  sos_reason: nextSosReason
                };
              }
              return c;
            });
            return { ...t, children: newChildren };
          }
        }
        return t;
      });
      return { allTasks: updatedTasks };
    }
    return {};
  }),

  closeMemoPopup: () => set({
    activeMemoTime: null,
    editingMemo: null,
    newMemoText: ""
  }),

  handleSaveMemo: (memoToSave) => set((state) => {
    const isEdit = state.memos.some(m => m.id === memoToSave.id);
    const updatedMemos = isEdit
      ? state.memos.map(m => m.id === memoToSave.id ? memoToSave : m)
      : [...state.memos, memoToSave];
    
    return { 
      memos: updatedMemos,
      activeMemoTime: null,
      editingMemo: null,
      newMemoText: ""
    };
  }),

  handleDeleteMemo: (memoId) => set((state) => ({
    memos: state.memos.filter(m => m.id !== memoId),
    activeMemoTime: null,
    editingMemo: null,
    newMemoText: ""
  })),
}));