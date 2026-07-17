import type { DragEvent } from 'react';

export type TaskStatus = 
  | 'initial'
  | 'untouched'
  | 'progressing'
  | 'pending'
  | 'completed'
  | 'record_start'
  | 'record_pending'
  | 'record_complete'
  | 'unexecuted';

export interface Task {
  task_id: string;
  title: string;
  details: string;
  status: TaskStatus; // stringではなく定義した型を使う
  priority: 'high' | 'medium' | 'low';
  display_period: string;
  initial_period?: string;
  scheduled_at: string;
  patient_id: string;
  room_id: string;
  patient_name: string;

  is_sos?: boolean; 
  sos_reason?: string;

  isGroup?: boolean;
  groupType?: 'patient' | 'task'; // ハイブリッド対応
  children?: Task[]; // グループ内のタスク
  isChild?: boolean; // グループ内のタスクであることのフラグ
}

// 1. 基本となるタスクステータスの拡張
export type ExtendedTaskStatus = TaskStatus | 'record_pending';

// --- 1. DB保存用の純粋なデータ型 ---
// これを Firebase (Firestore) の保存単位として使います
export interface TaskDocument {
  task_id: string;
  title: string;
  details: string;
  status: ExtendedTaskStatus;
  display_period: string;
  initial_period: string;
  priority: 'high' | 'medium' | 'low';
  scheduled_at: string;
  patient_id: string;
  room_id: string;
  patient_name: string;
  parent_id?: string | null;
  is_sos?: boolean; 
  sos_reason?: string;
  updated_by?: string;
}

// --- 2. 画面表示用の型 ---
// TaskDocumentを継承し、UI制御用のプロパティだけを足します
export interface ExtendedTask extends TaskDocument {
  isChild?: boolean;
  isGroup?: boolean;
  children?: ExtendedTask[]; // 子タスクもUI表示用に含めます
  // ↓ DBには保存しない、見た目制御専用のプロパティ
  groupType?: 'patient' | 'task';
  cardColorClass?: string;
  borderStyle?: string;
}

export interface TaskCardProps {
  task: ExtendedTask;
  cardColorClass: string;
  borderStyle: string;
  originalTime?: string;
  time?: string;
  draggable: boolean;
  onEdit: () => void;
  groupingMode: string | null;
  onStartGrouping?: (taskId: string) => void;
}

export type TimelineMode = 15 | 30 | 60;


export  interface TimelineControlsProps {
  timelineMode: TimelineMode;
  setTimelineMode: (value: TimelineMode) => void;
  groupingMode: string | null;            
  setGroupingMode: (id: string | null) => void; 
}

export interface TimelineMainProps {
  timedTasks: ExtendedTask[];
  groupingMode: string | null;
  setGroupingMode: (mode: string | null) => void;
  memos: Memo[];
}

export interface TaskCardPropsInner {
  task: Task;
  cardColorClass?: string;
  borderStyle?: string;
  originalTime?: string;
  onEdit?: () => void;
  style?: React.CSSProperties;
  className?: string;
  groupingMode?: string | null;
  onClick?: () => void;
}
export  interface TimelineRowProps {
    id: string;
    time: string;
    isCurrentRow?: boolean;
    rowTasks: ExtendedTask[];
    placeholders: ExtendedTask[];
    expandedGroups: Record<string, boolean>;
    toggleGroup: (groupId: string) => void;
    onEdit: (task: ExtendedTask) => void;
    onChildClick: (taskId: string) => void;
    onUngroup: any;
    setRowRef: (time: string, el: HTMLDivElement | null) => void;
    // メモ関連のprops
    timeMemos: Memo[];
    onMemoClick: (time: string) => void;
    onEditMemo: (memo: Memo) => void;
    isPastTime: (time: string) => boolean;
    groupingMode: string | null;
    onStartGrouping: (taskId: string) => void;
  }

export interface GroupParentCardProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onClick: () => void;
  groupingMode: string | null;
  onStartGrouping: (taskId: string) => void;
}

export interface GroupingProps {
  task: ExtendedTask;
  onClick: () => void; 
}

export interface Memo {
  id: string;
  text: string;
  time: string;
  scheduledAt?: string;
}