import { create } from 'zustand';
import type { ExtendedTask, Memo, ExtendedTaskStatus } from '../types/types';
import { updateTask } from '../hooks/useTaskUpdate';

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
  handleUngroupTask: (groupId: string, childId: string, period: string) => void;
  
  // 🚨 SOS専用の Actions
  toggleTaskSos: (taskId: string, reason?: string) => void;
  
  // 📝 メモ専用の Actions
  closeMemoPopup: () => void;
  handleSaveMemo: (memo: Memo) => void;
  handleDeleteMemo: (memoId: string) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
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

  handleUngroupTask: (groupId, childId) => set((state) => {
    const updatedTasks = state.allTasks.map((task) => {
      if (task.task_id === groupId && task.children) {
        return { ...task, children: task.children.filter(c => c.task_id !== childId) };
      }
      if (task.task_id === childId) {
        return { 
          ...task, 
          isGroup: false,
          isChild: false
        };
      }
      return task;
    });
    return { allTasks: updatedTasks };
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