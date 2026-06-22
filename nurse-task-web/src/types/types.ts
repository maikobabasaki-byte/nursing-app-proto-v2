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

  isGroup?: boolean;
  groupType?: 'patient' | 'task'; // ハイブリッド対応
  children?: Task[]; // グループ内のタスク
  isChild?: boolean; // グループ内のタスクであることのフラグ
}

export interface ExtendedTask extends Task {
  patient_name: string;
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

  // 💡 記録中断のステータス（型定義の拡張対応）
export  type ExtendedTaskStatus = TaskStatus | 'record_pending';
// Task型の拡張（コンポーネント内部で安全に使うため）
export  interface ExtendedTask extends Omit<Task, 'status'> {
    status: ExtendedTaskStatus;
    isChild?: boolean;
    isGroup?: boolean;
    children?: ExtendedTask[];
    initial_period?: string;
  }

export  interface TimelineControlsProps {
  timelineMode: TimelineMode;
  setTimelineMode: (value: TimelineMode) => void;
  groupingMode: string | null;            
  setGroupingMode: (id: string | null) => void; 
}

export  interface TimelineMainProps {
    allTasks: ExtendedTask[];
    timedTasks: Task[]; 
    onUpdateTaskPeriod: (taskId: string, newPeriod: string) => void; 
    onUpdateTaskStatus?: (taskId: string, newStatus: ExtendedTaskStatus) => void;
    onGroupTasks: (draggedId: string, targetId: string) => void;
    onUngroupTask: (groupId: string, childTaskId: string, currentPeriod: string) => void;
    groupingMode: string | null;
    setGroupingMode: (id: string | null) => void;
    onStartGrouping: (taskId: string) => void;
    memos: any[];
    onSaveMemo: (updatedMemo: any) => void;
    onDeleteMemo: (memoId: string) => void;
  }

export interface TaskCardPropsInner {
  task: Task;
  cardColorClass?: string;
  borderStyle?: string;
  originalTime?: string;
  onEdit?: () => void;
  style?: React.CSSProperties;
  className?: string;
  onStartGrouping?: (taskId: string) => void;
  groupingMode?: string | null;
}
export  interface TimelineRowProps {
    id: string;
    time: string;
    isCurrentRow?: boolean;
    rowTasks: ExtendedTask[];
    placeholders: ExtendedTask[];
    expandedGroups: Record<string, boolean>;
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

export interface Memo {
  id: string;
  text: string;
  time: string;
  scheduledAt?: string;
}