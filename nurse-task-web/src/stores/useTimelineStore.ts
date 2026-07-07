import { create } from 'zustand';
import type { ExtendedTask, Memo, ExtendedTaskStatus } from '../types/types';

interface TimelineStore {
  // 💾 State (状態)
  allTasks: ExtendedTask[];
  memos: Memo[];
  loading: boolean;
  groupingMode: string | null;      // グループ化対象の親タスクID
  activeId: string | null;          // dnd-kitで現在ドラッグ中の要素ID
  activePopupTaskId: string | null; // 現在詳細ポップアップを開いているタスクID
  
  // 💾 メモ専用の State
  activeMemoTime: string | null;    // 新規メモ作成時に対象となるタイムライン時間（例: "09:00"）
  editingMemo: Memo | null;        // 現在編集中のメモオブジェクト
  newMemoText: string;             // 新規作成中のメモテキスト

  // ⚡ Actions (基本セッター)
  setTasks: (tasks: ExtendedTask[]) => void;
  setMemos: (memos: Memo[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveId: (id: string | null) => void;
  setActivePopupTaskId: (id: string | null) => void;
  setActiveMemoTime: (time: string | null) => void;
  setEditingMemo: (memo: Memo | null) => void;
  setNewMemoText: (text: string) => void;
  
  // 🛠️ 業務ロジック Actions
  handleStartGrouping: (taskId: string | null) => void;
  handleUpdateStatus: (taskId: string, status: ExtendedTaskStatus) => void;
  handleUpdateTaskPeriod: (taskId: string, period: string) => void;
  handleUngroupTask: (groupId: string, childId: string, period: string) => void;
  
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

  // ==========================================
  // 🏥 看護業務・タスク操作ロジック
  // ==========================================
  
  // グループ化モードの切り替え
  handleStartGrouping: (taskId) => set({ groupingMode: taskId }),

  // ステータス変更 (実施開始、中断、記録中、記録完了など)
  handleUpdateStatus: (taskId, status) => set((state) => {
    const updatedTasks = state.allTasks.map((task) => {
      // 1. 通常タスクまたは親グループ自体が一致した場合
      if (task.task_id === taskId) {
        return { ...task, status };
      }
      // 2. グループ化された「子タスク」の中に一致するものがある場合
      if (task.isGroup && task.children) {
        const hasChild = task.children.some(c => c.task_id === taskId);
        if (hasChild) {
          const newChildren = task.children.map(c => 
            c.task_id === taskId ? { ...c, status } : c
          );
          return { ...task, children: newChildren };
        }
      }
      return task;
    });
    return { allTasks: updatedTasks };
  }),

  // タスクの配置時間軸（period）の更新 (ドラッグ＆ドロップ移動など)
  handleUpdateTaskPeriod: (taskId, period) => set((state) => ({
    allTasks: state.allTasks.map(t => 
      t.task_id === taskId ? { ...t, display_period: period } : t
    )
  })),

  // グループから子タスクを「外す」ロジック
  handleUngroupTask: (groupId, childId, period) => set((state) => {
    const updatedTasks = state.allTasks.map((task) => {
      // 親グループから子タスクを削除
      if (task.task_id === groupId && task.children) {
        const newChildren = task.children.filter((c) => c.task_id !== childId);
        return { ...task, children: newChildren };
      }
      // 外された子タスク単体を、独立した通常タスクとして時間軸に戻す
      if (task.task_id === childId) {
        return { ...task, isChild: false, display_period: period };
      }
      return task;
    });
    return { allTasks: updatedTasks };
  }),

  // ==========================================
  // 📝 メモ操作ロジック
  // ==========================================
  
  // メモポップアップのクリーンアップクローズ
  closeMemoPopup: () => set({
    activeMemoTime: null,
    editingMemo: null,
    newMemoText: ""
  }),

  // メモの保存 (新規追加 ＆ 既存編集のコンビネーション)
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

  // メモの削除
  handleDeleteMemo: (memoId) => set((state) => ({
    memos: state.memos.filter(m => m.id !== memoId),
    activeMemoTime: null,
    editingMemo: null,
    newMemoText: ""
  })),
}));