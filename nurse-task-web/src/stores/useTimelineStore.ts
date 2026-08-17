import { create } from 'zustand';
import type { ExtendedTask, Memo, ExtendedTaskStatus, LeaderTodo } from '../types/types';
import { reconstructGroups, flattenTasks } from '../utils/taskLogic';
import { addSingleTaskToGAS, resetAdditionalTasksInGAS } from '../services/gasService';
import { updateTask } from '../hooks/useTaskUpdate';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getJSTDateString } from '../utils/dateUtils';
import { getTaskTimeSlot } from '../utils/validateTaskGrouping';
import { db, updateNurseSos, updateNurseAssignedPatients, toggleTaskSosInFirestore, togglePatientSosInFirestore, saveLeaderTodoInFirestore, updateLeaderTodoInFirestore, deleteLeaderTodoInFirestore } from "../lib/firebase";

export interface NurseMaster {
  nurse_id: string;
  name: string;
  gender?: string;
  team?: string;
  email?: string;
  is_leader?: boolean;
  assigned_patients?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface NursePin extends NurseMaster {
  role?: string;
  color: string;
  x_percent: number; // 横方向の相対座標 (%)
  y_percent: number; // 縦方向の相対座標 (%)
  is_logged_in?: boolean; // 出勤・ログイン状態フラグ
  is_sos?: boolean; // 看護師SOSフラグ
  sos_reason?: string; // SOSメッセージ
  responder_name?: string; // SOS対応者名
}

export interface CurrentUser {
  nurse_id: string;
  staff_id?: string;
  name: string;
  email: string;
  team?: string;
  is_leader?: boolean;
  assigned_patients?: string[];
  isAnonymous?: boolean;
}

export interface PatientSos {
  patient_id: string;
  patient_name: string;
  room_id?: string;
  reason: string;
  requested_by_id?: string;
  requested_by_name?: string;
  created_at: string;
}

interface TimelineStore {
  allTasks: ExtendedTask[];
  memos: Memo[];
  nurseMaster: NurseMaster[];
  nurses: NursePin[];
  nurseAssignments: Record<string, string[]>;
  leaderTodos: LeaderTodo[];
  patientSosList: PatientSos[];
  currentUser: CurrentUser | null;
  selectedPatients: string[];
  selectedDate: string;
  activeDates: string[];
  isReadOnly: boolean;
  setSelectedDate: (date: string) => void;
  setActiveDates: (dates: string[]) => void;
  showLowPriority: boolean;
  loading: boolean;
  groupingMode: string | null;
  activeId: string | null;
  activePopupTaskId: string | null;
  
  timelineStartTime: string;
  timelineEndTime: string;
  setTimelineTimeRange: (start: string, end: string) => void;
  
  activeMemoTime: string | null;
  editingMemo: Memo | null;
  newMemoText: string;

  addDemoTask: () => void;
  removeDemoTask: () => void;
  addTask: (task: ExtendedTask) => void;
  setTasks: (tasks: ExtendedTask[]) => void;
  setMemos: (memos: Memo[]) => void;
  setNurseMaster: (masters: NurseMaster[]) => void;
  setNurses: (nurses: NursePin[]) => void;
  setSelectedPatients: (patients: string[]) => void;
  setLeaderTodos: (todos: LeaderTodo[]) => void;
  addLeaderTodo: (todo: Omit<LeaderTodo, 'todo_id'>) => Promise<void>;
  updateLeaderTodo: (todoId: string, data: Partial<LeaderTodo>) => Promise<void>;
  deleteLeaderTodo: (todoId: string) => Promise<void>;
  setCurrentUser: (user: CurrentUser | null) => void;
  setShowLowPriority: (show: boolean) => void;
  toggleShowLowPriority: () => void;
  updateNursePosition: (nurseId: string, x_percent: number, y_percent: number) => void;
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
  handleUpdatePriority: (taskId: string, priority: 'high' | 'medium' | 'low') => void;
  handleReorderTasks: (draggedId: string, targetId: string) => Promise<void>;
  handleGroupTasks: (draggedId: string, targetId: string) => Promise<void>;
  handleUngroupTask: (childId: string) => Promise<void>;
  
  toggleTaskSos: (taskId: string, reason?: string) => void;
  togglePatientSos: (patientId: string, patientName: string, roomId?: string) => void;
  respondToPatientSos: (patientId: string, responderName?: string) => void;
  setPatientSosList: (list: PatientSos[]) => void;
  respondToTaskSos: (taskId: string, responderName: string) => void;
  toggleNurseSos: (nurseId: string, reason?: string) => void;
  respondToNurseSos: (nurseId: string, responderName: string) => void;
  
  closeMemoPopup: () => void;
  handleSaveMemo: (memo: Memo) => void;
  handleDeleteMemo: (memoId: string) => void;
  duplicateTask: (taskId: string, targetPeriod?: string, customNote?: string) => Promise<ExtendedTask | null>;
  deleteTask: (taskId: string) => Promise<void>;
  resetAdditionalTasks: () => Promise<number>;
  resetStoreData: () => void;
}

const removeUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, removeUndefined(v)])
  );
};

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



// 💡 マスターデータとリアルタイムランタイム状態を重複ゼロでアトミック結合するヘルパー
export function mergeNurseData(
  masters: NurseMaster[],
  runtimes: NursePin[]
): NursePin[] {
  const nurseMap = new Map<string, NursePin>();

  // 1. まずマスターデータをベースとして登録
  masters.forEach((master) => {
    const key = master.nurse_id || master.name.replace(/[\s　]+/g, '');
    nurseMap.set(key, {
      nurse_id: master.nurse_id,
      name: master.name,
      gender: master.gender,
      team: master.team,
      email: master.email,
      is_leader: master.is_leader,
      role: master.is_leader ? 'リーダー' : 'メンバー',
      color: master.is_leader ? '#4f46e5' : '#059669',
      x_percent: 48.0,
      y_percent: 45.0,
      is_logged_in: true,
      is_sos: false,
    });
  });

  // 2. リアルタイム状態（位置・SOS情報等）を既存マスターと結合（なければ新規追加）
  runtimes.forEach((runtime) => {
    const normalizedRuntimeName = runtime.name ? runtime.name.replace(/[\s　]+/g, '') : '';
    
    // nurse_id または正規化された名前でマスターとマッチング
    let targetKey = Array.from(nurseMap.keys()).find((k) => {
      const existing = nurseMap.get(k);
      if (!existing) return false;
      const normalizedExistingName = existing.name.replace(/[\s　]+/g, '');
      return (
        existing.nurse_id === runtime.nurse_id ||
        (normalizedRuntimeName !== '' && normalizedExistingName === normalizedRuntimeName)
      );
    });

    if (targetKey && nurseMap.has(targetKey)) {
      const existing = nurseMap.get(targetKey)!;
      nurseMap.set(targetKey, {
        ...existing,
        ...runtime,
        // IDと名前はマスターを優先
        nurse_id: existing.nurse_id,
        name: existing.name,
        x_percent: runtime.x_percent ?? existing.x_percent,
        y_percent: runtime.y_percent ?? existing.y_percent,
        is_sos: runtime.is_sos ?? existing.is_sos,
        sos_reason: runtime.sos_reason ?? existing.sos_reason,
        responder_name: runtime.responder_name ?? existing.responder_name,
        is_logged_in: runtime.is_logged_in ?? existing.is_logged_in,
      });
    } else if (runtime.nurse_id && runtime.name) {
      // マスター未登録の単体リアルタイムピン
      nurseMap.set(runtime.nurse_id, {
        ...runtime,
        role: runtime.role || 'メンバー',
        color: runtime.color || '#059669',
        x_percent: runtime.x_percent ?? 48.0,
        y_percent: runtime.y_percent ?? 45.0,
        is_logged_in: runtime.is_logged_in ?? true,
        is_sos: runtime.is_sos ?? false,
      });
    }
  });

  return Array.from(nurseMap.values());
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  allTasks: [],
  memos: (() => {
    try {
      const saved = localStorage.getItem('timeline_memos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  })(),
  nurseMaster: [],
  nurses: [],
  leaderTodos: [],
  currentUser: null,
  selectedPatients: (() => {
    try {
      const saved = sessionStorage.getItem('selectedPatients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  })(),
  nurseAssignments: {},
  patientSosList: [],
  selectedDate: getJSTDateString(),
  activeDates: [getJSTDateString()],
  isReadOnly: false,

  setSelectedDate: (date) => set(() => {
    const today = getJSTDateString();
    return {
      selectedDate: date,
      isReadOnly: date !== today,
    };
  }),

  setActiveDates: (dates) => set(() => {
    const today = getJSTDateString();
    const unique = Array.from(new Set([...dates, today])).sort((a, b) => b.localeCompare(a));
    return { activeDates: unique };
  }),

  showLowPriority: false,
  loading: false,
  groupingMode: null,
  activeId: null,
  activePopupTaskId: null,
  
  timelineStartTime: '08:00',
  timelineEndTime: '17:00',
  setTimelineTimeRange: (start, end) => set({ timelineStartTime: start, timelineEndTime: end }),

  activeMemoTime: null,
  editingMemo: null,
  newMemoText: "",

  resetStoreData: () => set({
    allTasks: [],
    memos: [],
    nurseMaster: [],
    nurses: [],
    leaderTodos: [],
    currentUser: null,
    selectedPatients: [],
    activeId: null,
    activePopupTaskId: null,
    activeMemoTime: null,
    editingMemo: null,
  }),

  addDemoTask: () => {
    const demoTask: ExtendedTask = {
      task_id: 'demo-task-tutorial',
      patient_id: 'P-DEMO-001',
      patient_name: '中島 伊織',
      room_id: '201',
      title: '【練習用】術前絶飲食確認',
      details: '手術前に水・食事の摂取がないか最終確認を行う練習用タスクです。',
      status: 'untouched',
      scheduled_at: '09:00',
      initial_period: '09:00',
      display_period: '09:00',
      category: '確認',
      priority: 'high',
      isGroup: false,
      isChild: false,
    };
    set((state) => {
      const exists = state.allTasks.some(t => t.task_id === 'demo-task-tutorial');
      if (exists) return state;
      return {
        allTasks: [demoTask, ...state.allTasks]
      };
    });
  },
  removeDemoTask: () => {
    set((state) => ({
      allTasks: state.allTasks.filter(t => t.task_id !== 'demo-task-tutorial')
    }));
  },
  addTask: (task) => set((state) => {
    const exists = state.allTasks.some(t => t.task_id === task.task_id);
    if (exists) {
      return {
        allTasks: state.allTasks.map(t => t.task_id === task.task_id ? { ...t, ...task } : t)
      };
    }
    return {
      allTasks: [task, ...state.allTasks]
    };
  }),
  setTasks: (tasks) => set({ allTasks: tasks }),
  setMemos: (memos) => set({ memos }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedPatients: (list) => {
    try {
      sessionStorage.setItem('selectedPatients', JSON.stringify(list));
    } catch (e) {}
    const state = get();
    const currentNurseId = state.currentUser?.nurse_id;
    if (currentNurseId) {
      updateNurseAssignedPatients(currentNurseId, list);
      set({
        selectedPatients: list,
        nurseAssignments: {
          ...state.nurseAssignments,
          [currentNurseId]: list,
        },
      });
    } else {
      set({ selectedPatients: list });
    }
  },
  setShowLowPriority: (show) => set({ showLowPriority: show }),
  toggleShowLowPriority: () => set((state) => ({ showLowPriority: !state.showLowPriority })),
  setLeaderTodos: (todos) => set({ leaderTodos: todos }),
  addLeaderTodo: async (todoData) => {
    const newId = await saveLeaderTodoInFirestore(todoData);
    const newTodo: LeaderTodo = {
      ...todoData,
      todo_id: newId,
    };
    set((state) => ({
      leaderTodos: [newTodo, ...state.leaderTodos],
    }));
  },
  updateLeaderTodo: async (todoId, data) => {
    await updateLeaderTodoInFirestore(todoId, data);
    set((state) => ({
      leaderTodos: state.leaderTodos.map((t) =>
        t.todo_id === todoId ? { ...t, ...data } : t
      ),
    }));
  },
  deleteLeaderTodo: async (todoId) => {
    await deleteLeaderTodoInFirestore(todoId);
    set((state) => ({
      leaderTodos: state.leaderTodos.filter((t) => t.todo_id !== todoId && !t.is_deleted && t.status !== 'deleted'),
    }));
  },
  setNurseMaster: (masters) => set((state) => {
    const mergedNurses = mergeNurseData(masters, state.nurses);
    const assignments: Record<string, string[]> = { ...state.nurseAssignments };
    mergedNurses.forEach((n) => {
      if (n.nurse_id && Array.isArray(n.assigned_patients)) {
        assignments[n.nurse_id] = n.assigned_patients;
      }
    });
    return {
      nurseMaster: masters,
      nurses: mergedNurses,
      nurseAssignments: assignments,
    };
  }),
  setNurses: (incomingRuntimes) => set((state) => {
    // 💡 既存のローカルストア上のピン位置情報をマップ化（最新のオプティミスティックドラッグ移動結果を保持）
    const existingPositionMap = new Map<string, { x: number; y: number }>();
    state.nurses.forEach((n) => {
      if (n.nurse_id && typeof n.x_percent === 'number' && typeof n.y_percent === 'number') {
        existingPositionMap.set(n.nurse_id, { x: n.x_percent, y: n.y_percent });
      }
    });

    // 💡 Firestoreからの受信データに対し、すべてのナースピンの最新ローカル移動座標を保護マージ（引き戻しを防止）
    const protectedRuntimes = incomingRuntimes.map((rt) => {
      const cleanId = (rt.nurse_id || '').replace(/^nurse-/, '');
      const localPos = rt.nurse_id
        ? (existingPositionMap.get(rt.nurse_id) || existingPositionMap.get(cleanId) || existingPositionMap.get(`nurse-${cleanId}`))
        : undefined;

      if (localPos) {
        return {
          ...rt,
          x_percent: localPos.x,
          y_percent: localPos.y,
        };
      }
      return rt;
    });

    const mergedNurses = mergeNurseData(state.nurseMaster, protectedRuntimes);
    const assignments: Record<string, string[]> = { ...state.nurseAssignments };
    mergedNurses.forEach((n) => {
      if (n.nurse_id && Array.isArray(n.assigned_patients)) {
        assignments[n.nurse_id] = n.assigned_patients;
      }
    });
    return {
      nurses: mergedNurses,
      nurseAssignments: assignments,
    };
  }),
  updateNursePosition: (nurseId, x_percent, y_percent) => set((state) => {
    const rawTarget = String(nurseId || '').trim();
    const cleanTarget = rawTarget.replace(/^nurse-/, '');
    return {
      nurses: state.nurses.map((n) => {
        const rawNId = String(n.nurse_id || '').trim();
        const cleanNId = rawNId.replace(/^nurse-/, '');
        const isMatch =
          rawNId === rawTarget ||
          cleanNId === cleanTarget ||
          (rawTarget !== '' && (rawNId === rawTarget || cleanNId === rawTarget)) ||
          (Boolean(n.name) && Boolean(nurseId) && n.name === nurseId);
        return isMatch ? { ...n, x_percent, y_percent } : n;
      }),
    };
  }),
  setLoading: (loading) => set({ loading }),
  setActiveId: (id) => set({ activeId: id }),
  setActivePopupTaskId: (id) => set({ activePopupTaskId: id }),
  setActiveMemoTime: (time) => set({ activeMemoTime: time }),
  setEditingMemo: (memo) => set({ editingMemo: memo }),
  setNewMemoText: (text) => set({ newMemoText: text }),
  setGroupingMode: (mode) => set({ groupingMode: mode }),

  // 💡 修正：1回で確実にトグル（または解除）できるようにシンプル化
  handleStartGrouping: (taskId) => set((state) => ({
    groupingMode: taskId === null ? null : (state.groupingMode === taskId ? null : taskId)
  })),

  handleUpdateStatus: (taskId, status, unexecutedReason) => {
    const { currentUser } = get();
    const currentNurseName = currentUser?.name || '';
    const currentNurseId = currentUser?.nurse_id || currentUser?.email || '';

    const updatePayload: any = {
      status,
      unexecuted_reason: status === 'unexecuted' ? unexecutedReason : ''
    };

    if (currentNurseName) {
      updatePayload.nurse_name = currentNurseName;
    }
    if (currentNurseId) {
      updatePayload.assigned_nurse_id = currentNurseId;
      updatePayload.staff_id = currentNurseId;
    }

    updateTask(taskId, updatePayload);

    set((state) => {
      const isActiveTarget = status === 'progressing' || status === 'record_start';
      const targetPreviousProgressingIds: string[] = [];
      const targetPreviousRecordingIds: string[] = [];

      if (isActiveTarget) {
        const findAndCollect = (list: ExtendedTask[]) => {
          for (const task of list) {
            if (task.task_id !== taskId) {
              if (task.status === 'progressing') {
                targetPreviousProgressingIds.push(task.task_id);
              } else if (task.status === 'record_start') {
                targetPreviousRecordingIds.push(task.task_id);
              }
            }
            if (task.children && task.children.length > 0) {
              findAndCollect(task.children);
            }
          }
        };
        findAndCollect(state.allTasks);
      }

      targetPreviousProgressingIds.forEach(id => {
        updateTask(id, { status: 'pending' });
      });

      targetPreviousRecordingIds.forEach(id => {
        updateTask(id, { status: 'record_pending' });
      });

      const updatedTasks = state.allTasks.map((task) => {
        let newParentStatus = task.status;

        if (task.task_id === taskId) {
          newParentStatus = status;
        } else if (isActiveTarget) {
          if (task.status === 'progressing') {
            newParentStatus = 'pending';
          } else if (task.status === 'record_start') {
            newParentStatus = 'record_pending';
          }
        }

        let updatedChildren = task.children;
        if (task.children) {
          updatedChildren = task.children.map((child) => {
            if (child.task_id === taskId) {
              return { 
                ...child, 
                status,
                unexecuted_reason: status === 'unexecuted' ? (unexecutedReason || child.unexecuted_reason || '') : '',
                ...(currentNurseName ? { nurse_name: currentNurseName } : {}),
                ...(currentNurseId ? { assigned_nurse_id: currentNurseId, staff_id: currentNurseId } : {})
              };
            }
            if (isActiveTarget) {
              if (child.status === 'progressing') {
                return { ...child, status: 'pending' };
              } else if (child.status === 'record_start') {
                return { ...child, status: 'record_pending' };
              }
            }
            return child;
          });
        }

        return {
          ...task,
          status: newParentStatus,
          unexecuted_reason: task.task_id === taskId ? (status === 'unexecuted' ? (unexecutedReason || task.unexecuted_reason || '') : '') : task.unexecuted_reason,
          ...(task.task_id === taskId ? {
            ...(currentNurseName ? { nurse_name: currentNurseName } : {}),
            ...(currentNurseId ? { assigned_nurse_id: currentNurseId, staff_id: currentNurseId } : {})
          } : {}),
          children: updatedChildren,
        };
      });

      return { allTasks: updatedTasks };
    });
  },

  handleUpdateTaskPeriod: (taskId, period) => {
    const { allTasks } = get();

    const findTask = (list: ExtendedTask[]): ExtendedTask | null => {
      for (const t of list) {
        if (t.task_id === taskId) return t;
        if (t.children && t.children.length > 0) {
          const found = findTask(t.children);
          if (found) return found;
        }
      }
      return null;
    };

    const task = findTask(allTasks);

    if (task) {
      const initialPeriodToSave = task.initial_period || task.display_period;

      // 🧠 バックグラウンド通信：Firestore上のparent_idをクリア（独立化）し、時間を更新
      updateTask(taskId, { 
        display_period: period, 
        initial_period: initialPeriodToSave,
        parent_id: null,
      });

      // 🧠 即時UI反映：既存グループから抽出し、独立したエンティティとしてその時間枠に再配置
      set((state) => {
        const cleanedTasks = removeTaskRecursive(state.allTasks, [taskId]);
        const updatedTask: ExtendedTask = {
          ...task,
          display_period: period,
          initial_period: initialPeriodToSave,
          parent_id: null,
          isChild: false,
          isGroup: false,
          children: undefined,
        };

        return {
          allTasks: reconstructGroups([...cleanedTasks, updatedTask]),
        };
      });
    }
  },

  handleUpdatePriority: (taskId, priority) => {
    updateTask(taskId, { priority });

    set((state) => ({
      allTasks: state.allTasks.map((t) => {
        let updatedChildren = t.children;
        if (t.children) {
          updatedChildren = t.children.map((c) =>
            c.task_id === taskId ? { ...c, priority } : c
          );
        }
        return {
          ...t,
          ...(t.task_id === taskId ? { priority } : {}),
          children: updatedChildren,
        };
      }),
    }));
  },

  handleReorderTasks: async (draggedId, targetId) => {
    const { allTasks } = get();
    if (draggedId === targetId) return;

    const oldIndex = allTasks.findIndex(t => t.task_id === draggedId);
    const newIndex = allTasks.findIndex(t => t.task_id === targetId);

    if (oldIndex === -1 || newIndex === -1) return;

    const draggedTask = allTasks[oldIndex];
    const targetTask = allTasks[newIndex];

    const updatedDraggedTask = {
      ...draggedTask,
      display_period: targetTask.display_period || draggedTask.display_period,
    };

    const newAllTasks = [...allTasks];
    newAllTasks.splice(oldIndex, 1);
    newAllTasks.splice(newIndex, 0, updatedDraggedTask);

    set({ allTasks: newAllTasks });

    if (draggedTask.display_period !== targetTask.display_period && targetTask.display_period) {
      await updateTask(draggedId, { display_period: targetTask.display_period });
    }
  },

  handleGroupTasks: async (draggedId, targetId) => {
    const { allTasks } = get();
    if (draggedId === targetId) return;

    const findTaskById = (list: ExtendedTask[], id: string): ExtendedTask | null => {
      for (const t of list) {
        if (t.task_id === id) return t;
        if (t.children) {
          const found = findTaskById(t.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const draggedTask = findTaskById(allTasks, draggedId);
    const targetTask = findTaskById(allTasks, targetId);

    if (!draggedTask || !targetTask) return;

    const isSamePatient = draggedTask.patient_id === targetTask.patient_id;
    const draggedSlot = getTaskTimeSlot(draggedTask);
    const targetSlot = getTaskTimeSlot(targetTask);

    const isSameTimeSlot = Boolean(
      draggedSlot && targetSlot && (
        draggedSlot === targetSlot || 
        draggedSlot === 'ANYTIME' || 
        targetSlot === 'ANYTIME'
      )
    );

    if (!isSamePatient && !isSameTimeSlot) {
      alert("「同一の患者」または「同時間帯（午前・午後）」のタスクのみグループ化できます");
      return;
    }

    if (draggedTask.priority === 'high' || targetTask.priority === 'high') {
      alert("優先順位「高」のタスクは誤認防止のため、単独で管理する必要があります");
      return;
    }

    const targetPeriod = targetTask.display_period || "09:00";

    // ターゲットが親グループならそのID、子タスクなら親ID、単独なら null
    const targetGroupId = targetTask.isGroup ? targetTask.task_id : (targetTask.parent_id || null);

    const removeAndClean = (tasks: ExtendedTask[], targetIdsToRemove: string[]): ExtendedTask[] => {
      const flat = flattenTasks(tasks).filter(t => !targetIdsToRemove.includes(t.task_id));
      return reconstructGroups(flat);
    };

    try {
      if (targetGroupId) {
        // =========================================================
        // 【パターンA】ターゲットが「既存のグループ」の場合
        // ドロップ先の groupId にタスクを追加（マージ）する
        // =========================================================
        const existingGroup = allTasks.find(
          (t) => t.isGroup && t.task_id === targetGroupId
        ) || (targetTask.isGroup ? targetTask : undefined);

        if (!existingGroup) return;

        const isAlreadyInside = existingGroup.children?.some(c => c.task_id === draggedId);
        if (isAlreadyInside) return;

        const newChild: ExtendedTask = {
          ...draggedTask,
          isChild: true,
          parent_id: targetGroupId,
          display_period: targetPeriod,
          isGroup: false,
          children: undefined,
        };

        const updatedChildren = [...(existingGroup.children || []).filter(c => c.task_id !== draggedId), newChild];
        const updatedGroup: ExtendedTask = {
          ...existingGroup,
          display_period: targetPeriod,
          children: updatedChildren,
        };

        // 🧠 1. 即座にUIを更新（グループ化完了）
        set((state) => {
          const cleaned = removeAndClean(state.allTasks, [draggedId]);
          const finalTasks = cleaned.map((t) => 
            t.task_id === targetGroupId ? updatedGroup : t
          );
          if (!finalTasks.some(t => t.task_id === targetGroupId)) {
            finalTasks.push(updatedGroup);
          }
          return { allTasks: finalTasks };
        });

        // 🧠 2. バックグラウンド通信
        await updateTask(draggedId, { parent_id: targetGroupId, display_period: targetPeriod });

      } else {
        // =========================================================
        // 【パターンB】ターゲットが「別の単独タスク」の場合
        // 同時間帯に他グループが存在しても干渉せず、新しくユニークな groupId を発行
        // =========================================================
        const newGroupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const currentGroupType = targetTask.groupType || (targetTask.title === draggedTask.title ? 'task' : 'patient');

        const childTarget: ExtendedTask = { 
          ...targetTask, 
          isChild: true, 
          parent_id: newGroupId,
          display_period: targetPeriod,
          isGroup: false,
          children: undefined 
        };
        const childDragged: ExtendedTask = { 
          ...draggedTask, 
          isChild: true, 
          parent_id: newGroupId,
          display_period: targetPeriod,
          isGroup: false,
          children: undefined 
        };

        const groupTitle = targetTask.title === draggedTask.title ? targetTask.title : (currentGroupType === 'patient' ? targetTask.patient_name : targetTask.title);

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

        // 🧠 1. 即座にUIを更新（新規グループ作成）
        set((state) => {
          const cleaned = removeAndClean(state.allTasks, [draggedId, targetId]);
          return { allTasks: [...cleaned, groupNode] };
        });

        // 🧠 2. バックグラウンド通信
        await setDoc(doc(db, "tasks", newGroupId), removeUndefined(groupNode));
        await updateTask(draggedId, { parent_id: newGroupId, display_period: targetPeriod });
        await updateTask(targetId, { parent_id: newGroupId, display_period: targetPeriod });
      }

      set({ groupingMode: null });
    } catch (error) {
      console.error("❌ グループ化処理に失敗しました:", error);
    }
  },

  handleUngroupTask: async (childId: string) => {
    const { allTasks } = get();

    let parentGroup: ExtendedTask | undefined;
    allTasks.forEach((t) => {
      if (t.isGroup && t.children?.some((c) => c.task_id === childId)) {
        parentGroup = t;
      }
    });

    await updateTask(childId, { parent_id: null });

    if (parentGroup && parentGroup.children && Array.isArray(parentGroup.children)) {
      const remainingChildren = parentGroup.children.filter((c) => c.task_id !== childId);

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
          if (task.isGroup && task.children && Array.isArray(task.children)) {
            const nextChildren = task.children.filter((c: ExtendedTask) => c.task_id !== childId);
            if (nextChildren.length <= 1) {
              return null;
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
        if (task.isGroup && task.children && Array.isArray(task.children)) {
          const isTargetGroup = task.children.some((c) => c.task_id === childId);
          if (isTargetGroup) {
            const nextChildren = task.children.filter((c) => c.task_id !== childId);
            if (nextChildren.length <= 1) {
              task.children.forEach((c) => {
                releasedTasks.push({ ...c, parent_id: null, isChild: false, isGroup: false });
              });
            } else {
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
      const nextSosReason = nextIsSos ? (reason || 'タスクの支援要請が発生しました') : '';
      const currentUserId = state.currentUser?.nurse_id || sessionStorage.getItem('nurse_id') || '';
      const currentUserName = state.currentUser?.name || sessionStorage.getItem('nurse_name') || '';

      // 💡 単一関数 toggleTaskSosInFirestore を呼び出し二重通信と競合を廃止
      toggleTaskSosInFirestore(
        taskId,
        nextIsSos,
        nextSosReason,
        currentUserId,
        currentUserName
      );

      const updatedTasks = state.allTasks.map((t) => {
        if (t.task_id === taskId) {
          return {
            ...t,
            is_sos: nextIsSos,
            sos_reason: nextSosReason,
            requested_by_id: nextIsSos ? currentUserId : '',
            requested_by_name: nextIsSos ? currentUserName : '',
          };
        }
        if (t.isGroup && t.children && Array.isArray(t.children)) {
          const hasChild = t.children.some(c => c.task_id === taskId);
          if (hasChild) {
            const newChildren = t.children.map(c => {
              if (c.task_id === taskId) {
                return {
                  ...c,
                  is_sos: nextIsSos,
                  sos_reason: nextSosReason,
                  requested_by_id: nextIsSos ? currentUserId : '',
                  requested_by_name: nextIsSos ? currentUserName : '',
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

  setPatientSosList: (list) => set({ patientSosList: list }),

  togglePatientSos: (patientId, patientName, roomId) => set((state) => {
    const list = state.patientSosList || [];
    const existingIndex = list.findIndex(p => p.patient_id === patientId);
    const isCurrentlySos = existingIndex >= 0;

    const currentUserId = state.currentUser?.nurse_id || sessionStorage.getItem('nurse_id') || '';
    const currentUserName = state.currentUser?.name || sessionStorage.getItem('nurse_name') || '';

    // 📡 Firestoreにリアルタイム同期書き込み（全看護師端末に秒速ブロードキャスト通知）
    togglePatientSosInFirestore(
      patientId,
      patientName,
      roomId,
      !isCurrentlySos,
      currentUserId,
      currentUserName
    );

    let updatedList: PatientSos[] = [];
    if (isCurrentlySos) {
      updatedList = list.filter(p => p.patient_id !== patientId);
    } else {
      const sosReason = `🚨 緊急要請：${patientName}さん (${roomId ? `${roomId}号室` : ''}) で緊急応援要請`;

      const newEntry: PatientSos = {
        patient_id: patientId,
        patient_name: patientName,
        room_id: roomId,
        reason: sosReason,
        requested_by_id: currentUserId,
        requested_by_name: currentUserName,
        created_at: new Date().toISOString(),
      };
      updatedList = [newEntry, ...list];
    }

    return { patientSosList: updatedList };
  }),

  respondToPatientSos: (patientId) => set((state) => {
    togglePatientSosInFirestore(patientId, '', '', false);
    return {
      patientSosList: (state.patientSosList || []).filter(p => p.patient_id !== patientId)
    };
  }),

  respondToTaskSos: (taskId, responderName) => set((state) => {
    toggleTaskSosInFirestore(taskId, false, '', '', '');

    const updatedTasks = state.allTasks.map((t) => {
      if (t.task_id === taskId) {
        return {
          ...t,
          is_sos: false,
          sos_reason: '',
          requested_by_id: '',
          requested_by_name: '',
          responder_name: responderName,
        };
      }
      if (t.isGroup && t.children && Array.isArray(t.children)) {
        const hasChild = t.children.some(c => c.task_id === taskId);
        if (hasChild) {
          const newChildren = t.children.map(c => {
            if (c.task_id === taskId) {
              return {
                ...c,
                is_sos: false,
                sos_reason: '',
                requested_by_id: '',
                requested_by_name: '',
                responder_name: responderName,
              };
            }
            return c;
          });
          return {
            ...t,
            children: newChildren,
          };
        }
      }
      return t;
    });

    return { allTasks: updatedTasks };
  }),

  toggleNurseSos: (nurseId, reason) => set((state) => {
    const nurse = state.nurses.find(n => n.nurse_id === nurseId);
    const nextIsSos = nurse ? !nurse.is_sos : true;
    const nextReason = nextIsSos ? (reason || '緊急応援要請が発生しました') : '';

    updateNurseSos(nurseId, {
      name: nurse?.name,
      is_sos: nextIsSos,
      sos_reason: nextReason,
    });

    return {
      nurses: state.nurses.map((n) =>
        n.nurse_id === nurseId
          ? {
              ...n,
              is_sos: nextIsSos,
              sos_reason: nextIsSos ? nextReason : undefined,
              responder_name: undefined,
            }
          : n
      ),
    };
  }),

  respondToNurseSos: (nurseId, responderName) => set((state) => {
    const nurse = state.nurses.find(n => n.nurse_id === nurseId);

    updateNurseSos(nurseId, {
      name: nurse?.name,
      is_sos: false,
      sos_reason: '',
      responder_name: responderName,
    });

    return {
      nurses: state.nurses.map((n) =>
        n.nurse_id === nurseId
          ? {
              ...n,
              is_sos: false,
              sos_reason: undefined,
              responder_name: responderName,
            }
          : n
      ),
    };
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
    
    try {
      localStorage.setItem('timeline_memos', JSON.stringify(updatedMemos));
    } catch (e) {}

    return { 
      memos: updatedMemos,
      activeMemoTime: null,
      editingMemo: null,
      newMemoText: ""
    };
  }),

  handleDeleteMemo: (memoId) => set((state) => {
    const updatedMemos = state.memos.filter(m => m.id !== memoId);
    try {
      localStorage.setItem('timeline_memos', JSON.stringify(updatedMemos));
    } catch (e) {}

    return {
      memos: updatedMemos,
      activeMemoTime: null,
      editingMemo: null,
      newMemoText: ""
    };
  }),

  duplicateTask: async (taskId, targetPeriod, customNote) => {
    const { allTasks, currentUser } = get();
    
    const findTask = (list: ExtendedTask[]): ExtendedTask | null => {
      for (const t of list) {
        if (t.task_id === taskId) return t;
        if (t.children && t.children.length > 0) {
          const found = findTask(t.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetTask = findTask(allTasks);
    if (!targetTask) return null;

    const timestamp = Date.now();
    const newTaskId = `dup-task-${targetTask.patient_id}-${timestamp}`;
    const period = targetPeriod || targetTask.display_period || '14:00';
    const nurseName = currentUser?.name || sessionStorage.getItem('nurse_name') || targetTask.nurse_name || '';

    const titlePrefix = targetTask.title.includes('【看護判断】') || targetTask.title.includes('【追加実施】') 
      ? '' 
      : '【看護判断・追加】';

    const duplicatedTask: ExtendedTask = {
      ...targetTask,
      task_id: newTaskId,
      emr_order_id: newTaskId,
      title: `${titlePrefix}${targetTask.title}`,
      details: customNote 
        ? `${targetTask.details ? targetTask.details + ' / ' : ''}看護判断備考: ${customNote}` 
        : targetTask.details,
      status: 'untouched',
      display_period: period,
      initial_period: period,
      scheduled_at: `${new Date().toISOString().split('T')[0]}T${period.includes(':') ? period : '14:00'}:00`,
      completed_at: undefined,
      is_additional: true,
      parent_id: null,
      nurse_name: nurseName,
      is_sos: false,
      sos_reason: undefined,
    };

    try {
      await setDoc(doc(db, 'tasks', newTaskId), removeUndefined(duplicatedTask), { merge: true });
      // ⚡ [リアルタイム自動同期] 複製生成された瞬間に自動でGAS API経由でスプレッドシートへ新しい行として送信・追加
      addSingleTaskToGAS(duplicatedTask).catch((err) =>
        console.error("複製タスクのGASリアルタイム送信エラー:", err)
      );
    } catch (e) {
      console.error("複製タスクのFirestore保存エラー:", e);
    }

    set((state) => ({
      allTasks: [duplicatedTask, ...state.allTasks],
    }));

    return duplicatedTask;
  },

  deleteTask: async (taskId: string) => {
    try {
      await setDoc(doc(db, 'tasks', taskId), { status: 'deleted' }, { merge: true });
    } catch (e) {
      console.error("Firestoreタスク論理削除エラー:", e);
    }

    set((state) => {
      const markAsDeleted = (list: ExtendedTask[]): ExtendedTask[] => {
        return list.map((t) => {
          if (t.task_id === taskId || t.emr_order_id === taskId) {
            return { ...t, status: 'deleted' as const };
          }
          if (t.children && t.children.length > 0) {
            return { ...t, children: markAsDeleted(t.children) };
          }
          return t;
        });
      };

      return {
        allTasks: markAsDeleted(state.allTasks),
        activePopupTaskId: state.activePopupTaskId === taskId ? null : state.activePopupTaskId,
      };
    });
  },

  resetAdditionalTasks: async () => {
    const { allTasks } = get();

    const isAdditionalTask = (t: ExtendedTask) => {
      const isAddFlag = t.is_additional === true || String(t.is_additional).toLowerCase() === 'true';
      const isDupId = String(t.task_id).startsWith('dup-task-') || String(t.task_id).startsWith('copied-');
      return isAddFlag || isDupId;
    };

    const targetTasks: ExtendedTask[] = [];
    const findAdditional = (list: ExtendedTask[]) => {
      list.forEach((t) => {
        if (isAdditionalTask(t) && t.status !== 'deleted') {
          targetTasks.push(t);
        }
        if (t.children && t.children.length > 0) {
          findAdditional(t.children);
        }
      });
    };
    findAdditional(allTasks);

    if (targetTasks.length === 0) return 0;

    // 1. スプレッドシート側の追加タスクリセット命令をGASへ送信
    await resetAdditionalTasksInGAS().catch((err) =>
      console.error("GAS一括リセット送信エラー:", err)
    );

    // 2. Firestore 上の追加タスクドキュメントを論理削除 (status = 'deleted')
    const updatePromises = targetTasks.map((t) =>
      setDoc(doc(db, 'tasks', t.task_id), { status: 'deleted' }, { merge: true }).catch((e) =>
        console.error(`追加タスク ${t.task_id} の削除エラー:`, e)
      )
    );
    await Promise.all(updatePromises);

    // 3. ローカルステート内の追加タスクを status = 'deleted' に更新し、画面から非表示化
    set((state) => {
      const markDeleted = (list: ExtendedTask[]): ExtendedTask[] => {
        return list.map((t) => {
          if (isAdditionalTask(t)) {
            return { ...t, status: 'deleted' as const };
          }
          if (t.children && t.children.length > 0) {
            return { ...t, children: markDeleted(t.children) };
          }
          return t;
        });
      };

      return {
        allTasks: markDeleted(state.allTasks),
      };
    });

    return targetTasks.length;
  },
}));