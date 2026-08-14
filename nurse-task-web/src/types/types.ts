export type TaskStatus = 
  | 'initial'
  | 'untouched'
  | 'progressing'
  | 'pending'
  | 'completed'
  | 'record_start'
  | 'record_pending'
  | 'record_complete'
  | 'unexecuted'
  | 'deleted';

export type InstructionType = '医師指示' | '看護指示';

export interface Task {
  task_id: string;
  emr_order_id?: string;
  title: string;
  details: string;
  status: TaskStatus; // stringではなく定義した型を使う
  priority: 'high' | 'medium' | 'low';
  instruction_type?: InstructionType | string;
  placement_type?: string;
  display_period: string;
  initial_period?: string;
  scheduled_at: string;
  scheduled_time?: string;
  completed_at?: string;
  patient_id: string;
  room_id: string;
  patient_name: string;
  nurse_name?: string;
  nurseName?: string;
  nurse_id?: string;
  staff_id?: string;
  assigned_nurse_id?: string;
  team?: string;
  is_additional?: boolean | string;

  is_sos?: boolean; 
  sos_reason?: string;
  requested_by_id?: string;
  requested_by_name?: string;
  responder_name?: string;
  unexecuted_reason?: string;

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
  emr_order_id?: string;
  title: string;
  details: string;
  status: ExtendedTaskStatus;
  instruction_type?: InstructionType | string;
  placement_type?: string;
  display_period: string;
  initial_period?: string;
  priority: 'high' | 'medium' | 'low';
  scheduled_at: string;
  scheduled_time?: string;
  completed_at?: string;
  patient_id: string;
  room_id: string;
  patient_name: string;
  nurse_name?: string;
  nurseName?: string;
  nurse_id?: string;
  staff_id?: string;
  assigned_nurse_id?: string;
  team?: string;
  is_additional?: boolean | string;
  parent_id?: string | null;
  is_sos?: boolean; 
  sos_reason?: string;
  requested_by_id?: string;
  requested_by_name?: string;
  unexecuted_reason?: string;
  updated_by?: string;
  category?: string;
  target_date?: string;
}

export interface Patient {
  patient_id: string;
  name: string;
  gender?: string;
  adl?: '全介助' | '一部介助' | '自立' | string;
  risk_level?: '高' | '中' | '低' | string;
  allergy?: string;
  team?: string;
  room_id: string;
  bed_number?: number | string;
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


export interface TimelineControlsProps {
  timelineMode: TimelineMode;
  setTimelineMode: (value: TimelineMode) => void;
}

export interface TimelineMainProps {
  selectedPatients: string[];
}

export interface TaskCardPropsInner {
  task: ExtendedTask;
  cardColorClass?: string;
  borderStyle?: string;
  originalTime?: string;
  onEdit?: () => void;
  style?: React.CSSProperties;
  className?: string;
  groupingMode?: string | null;
  onClick?: () => void;
  onStartGrouping?: (taskId: string) => void;
  isSortMode?: boolean;
  isOverlay?: boolean;
}

export interface TimelineRowProps {
    id: string;
    time: string;
    isCurrentRow?: boolean;
    rowTasks: ExtendedTask[];
    placeholders: ExtendedTask[];
    expandedGroups: Record<string, boolean>;
    toggleGroup: (groupId: string) => void;
    onEdit?: (task: ExtendedTask) => void;
    onChildClick?: (taskId: string) => void;
    onUngroup?: (childId: string) => Promise<void> | void;
    setRowRef: (time: string, el: HTMLDivElement | null) => void;
    // メモ関連のprops
    timeMemos: Memo[];
    onMemoClick?: (time: string) => void;
    onEditMemo?: (memo: Memo) => void;
    isPastTime: (time: string) => boolean;
    groupingMode?: string | null;
    onStartGrouping?: (taskId: string) => void;
    isSortMode?: boolean;
    activeId?: string | null;
    timelineMode?: number;
  }

export interface GroupParentCardProps {
  task: ExtendedTask;
  isExpanded: boolean;
  onClick: () => void;
  groupingMode?: string | null;
  onStartGrouping?: (taskId: string) => void;
  isSortMode?: boolean;
  isOverlay?: boolean;
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
  target_room_id?: string;
  is_completed?: boolean;
}

export type LeaderTodoCategory = '患者対応' | '家族対応' | '医師への連絡' | '検査・処置' | 'その他';
export type LeaderTodoPriority = 'highest' | 'high' | 'medium' | 'low';

export interface LeaderTodo {
  todo_id: string;
  nurse_id?: string;
  user_id?: string;
  patient_id: string;
  patient_name: string;
  room_id: string;
  category: LeaderTodoCategory;
  title: string;
  scheduled_at: string;
  priority: LeaderTodoPriority;
  requires_double_check: boolean;
  status: 'untouched' | 'in_progress' | 'completed' | 'pending' | 'deleted';
  is_deleted?: boolean;
  deleted_at?: string | null;
  result_outcome?: string;
  doctor_instructions?: string;
  updated_by?: string;
  updated_at?: string | null;
}