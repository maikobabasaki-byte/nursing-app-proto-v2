import { create } from 'zustand';
import type { ExtendedTask, Memo, ExtendedTaskStatus } from '../types/types';
import { updateTask } from '../hooks/useTaskUpdate';
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface TimelineStore {
  // 💾 State (状態)
  allTasks: ExtendedTask[];
  memos: Memo[];
  loading: boolean;
  groupingMode: string | null;
  activeId: string | null;
  activePopupTaskId: string | null;
  
  // 💾 メモ専用の State
  activeMemoTime: string | null;
  editingMemo: Memo | null;
  newMemoText: string;

  // ⚡ Actions (基本セッター)
  setTasks: (tasks: ExtendedTask[]) => void;
  setMemos: (memos: Memo[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveId: (id: string | null) => void;
  setActivePopupTaskId: (id: string | null) => void;
  setActiveMemoTime: (time: string | null) => void;
  setEditingMemo: (memo: Memo | null) => void;
  setNewMemoText: (text: string) => void;
  setGroupingMode: (mode: string | null) => void; // ★追加
  
  // 🛠️ 業務ロジック Actions
  handleStartGrouping: (taskId: string | null) => void;
  handleUpdateStatus: (taskId: string, status: ExtendedTaskStatus) => void;
  handleUpdateTaskPeriod: (taskId: string, period: string) => void;
  handleGroupTasks: (draggedId: string, targetId: string) => Promise<void>;
  handleUngroupTask: (childId: string) => void;
  
  // 🚨 SOS専用の Actions
  toggleTaskSos: (taskId: string, reason?: string) => void;
  
  // 📝 メモ専用の Actions
  closeMemoPopup: () => void;
  handleSaveMemo: (memo: Memo) => void;
  handleDeleteMemo: (memoId: string) => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  // ==========================================
  // 💾 初期状態 (Initial State)
  // ==========================================
  allTasks: [],
  memos: [],
  loading: false,
  groupingMode: null,
  activeId: null,
  activePopupTaskId: null,
  
  activeMemoTime: null,
  editingMemo: null,
  newMemoText: "",

  // ==========================================
  // ⚡ 基本セッター (Basic Setters)
  // ==========================================
  setTasks: (tasks) => set({ allTasks: tasks }),
  setMemos: (memos) => set({ memos }),
  setLoading: (loading) => set({ loading }),
  setActiveId: (id) => set({ activeId: id }),
  setActivePopupTaskId: (id) => set({ activePopupTaskId: id }),
  setActiveMemoTime: (time) => set({ activeMemoTime: time }),
  setEditingMemo: (memo) => set({ editingMemo: memo }),
  setNewMemoText: (text) => set({ newMemoText: text }),
  setGroupingMode: (mode) => set({ groupingMode: mode }), // ★追加

  // ==========================================
  // 🏥 看護業務・タスク操作ロジック
  // ==========================================
  
  handleStartGrouping: (taskId) => set((state) => ({
    groupingMode: state.groupingMode === taskId ? null : taskId
  })),

  handleUpdateStatus: (taskId, status) => set((state) => {
    let targetPreviousProgressingId: string | null = null;

    // もし今回「実施中 (progressing)」にするなら、いま現在 progressing だった別のタスクIDを探す
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

    // ★ もし元々実施中だった別タスクがあれば、強制的に Firestore 側も 'pending' に更新する
    if (targetPreviousProgressingId) {
      updateTask(targetPreviousProgressingId, { status: 'pending' });
    }

    // 以下、従来のステータス更新処理
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
            return { ...child, status };
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
        children: updatedChildren,
      };
    });

    return { allTasks: updatedTasks };
  }),

  handleUpdateTaskPeriod: (taskId, period) => set((state) => ({
    allTasks: state.allTasks.map(t => 
      t.task_id === taskId ? { ...t, display_period: period } : t
    )
  })),

  handleGroupTasks: async (draggedId, targetId) => {
    const { allTasks } = get();
    if (draggedId === targetId) return;

    let draggedTask: ExtendedTask | null = null;
    let targetTask: ExtendedTask | null = null;

    for (const t of allTasks) {
      if (t.task_id === draggedId) draggedTask = t;
      if (t.task_id === targetId) targetTask = t;
      t.children?.forEach((c: ExtendedTask) => {
        if (c.task_id === draggedId) draggedTask = c;
        if (c.task_id === targetId) targetTask = c;
      });
    }

    if (!draggedTask || !targetTask) return;

    const targetPeriod = targetTask.display_period || "09:00";
    const groupTitle = targetTask.title; // 例: "バイタル測定"

    // 💡 厳密な条件：同じ「タイトル」かつ同じ「時間帯」のグループがすでに存在するか探す
    const existingGroup = allTasks.find(
      (t) => t.isGroup && t.title === groupTitle && t.display_period === targetPeriod
    );

    try {
      if (existingGroup) {
        // =========================================================
        // 【統合】すでに同じ時間・同じ名前のグループがある場合：絶対に新しく作らず、そこへ完全に追加する
        // =========================================================
        const newChild: ExtendedTask = {
          ...draggedTask,
          isChild: true,
          parent_id: existingGroup.task_id,
          display_period: targetPeriod,
          children: undefined,
        };

        // すでに子として含まれていなければ追加
        const isAlreadyInside = existingGroup.children?.some(c => c.task_id === draggedId);
        const updatedChildren = isAlreadyInside 
          ? existingGroup.children 
          : [...(existingGroup.children || []), newChild];

        const updatedGroup: ExtendedTask = {
          ...existingGroup,
          children: updatedChildren,
        };

        // DB更新
        await updateTask(draggedId, { parent_id: existingGroup.task_id, display_period: targetPeriod });

        set((state) => {
          const cleanedTasks = state.allTasks
            .filter((t) => t.task_id !== draggedId)
            .map((t) => {
              if (t.task_id === existingGroup.task_id) {
                return updatedGroup;
              }
              if (t.children) {
                const nextChildren = t.children.filter((c: ExtendedTask) => c.task_id !== draggedId);
                return { ...t, children: nextChildren };
              }
              return t;
            });

          return { allTasks: cleanedTasks };
        });

      } else {
        // =========================================================
        // 【新規】完全に存在しない場合のみ、新しく1つだけ作る
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

        await setDoc(doc(db, "tasks", newGroupId), groupNode);
        await updateTask(draggedId, { parent_id: newGroupId, display_period: targetPeriod });
        await updateTask(targetId, { parent_id: newGroupId, display_period: targetPeriod });

        set((state) => {
          const cleanedTasks = state.allTasks
            .filter((t) => t.task_id !== draggedId && t.task_id !== targetId)
            .map((t) => {
              if (t.children) {
                const nextChildren = t.children.filter((c: ExtendedTask) => c.task_id !== draggedId && c.task_id !== targetId);
                return { ...t, isGroup: nextChildren.length > 0, children: nextChildren };
              }
              return t;
            });

          return { allTasks: [...cleanedTasks, groupNode] };
        });
      }
    } catch (error) {
      console.error("❌ グループ化処理に失敗しました:", error);
    }
  },

  handleUngroupTask: (childId: string) => set((state) => {
    // 1. データベース(Firestore)側の親IDをクリアする
    updateTask(childId, { parent_id: null });

    // 2. Zustandストアの状態を更新
    const updatedTasks = state.allTasks.map((task) => {
      // もしこのタスクがグループ親で、childrenの中に該当の childId が含まれている場合
      if (task.isGroup && task.children) {
        const nextChildren = task.children.filter((c: ExtendedTask) => c.task_id !== childId);
        
        // もし子タスクが2つともなくなったら、親グループ自体を消す（あるいは維持する）
        if (nextChildren.length === 0) {
          return null; // 後でフィルタリングで消す
        }

        return {
          ...task,
          children: nextChildren,
        };
      }
      return task;
    }).filter(Boolean) as ExtendedTask[]; // nullになった親グループを除外

    // 3. 解除された子タスク自体をルートレベルに戻し、isGroup/isChildフラグをリセットする
    // （もし allTasks の中にまだ独立したタスクとして存在していなければ追加する）
    let targetChild: ExtendedTask | null = null;
    
    state.allTasks.forEach(task => {
      task.children?.forEach((c: ExtendedTask) => {
        if (c.task_id === childId) {
          targetChild = { ...c, parent_id: null, isChild: false, isGroup: false };
        }
      });
    });

    const finalTasks = [...updatedTasks];
    if (targetChild && !finalTasks.some(t => t.task_id === childId)) {
      finalTasks.push(targetChild);
    }

    return { allTasks: finalTasks };
  }),
  toggleTaskSos: (taskId, reason) => set((state) => {
    const task = state.allTasks.find(t => t.task_id === taskId) ||
                 state.allTasks.flatMap(t => t.children || []).find(c => c.task_id === taskId);
    if (task) {
      const nextIsSos = !task.is_sos;
      const nextSosReason = nextIsSos ? (reason || "緊急応援要請が発生しました") : "";

      // Firestoreの更新処理を呼ぶ
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