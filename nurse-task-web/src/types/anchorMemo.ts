export type TaskType = 'emr_instruction' | 'user_memo';

export type TaskStatus = 'initial' | 'pool' | 'scheduled' | 'completed' | 'in_progress';

export interface EMRTask {
  id: string;
  type: 'emr_instruction';
  title: string;
  details: string;
  patientId: string;
  patientName: string;
  roomId: string;
  scheduledTime?: string; // 例: "10:30" (poolの場合は未設定)
  status: TaskStatus; // 'pool' は時間未定のフリータスク
  priority: 'high' | 'medium' | 'low';
  category: '清拭' | '物品補充' | '処置' | '点滴' | '観察';
  estimatedMinutes: number; // 想定所要時間（分）
}

export interface UserMemo {
  id: string;
  type: 'user_memo';
  text: string;
  roomId: string; // 紐付く部屋番号（例: "203"）
  patientId?: string;
  patientName?: string;
  time: string; // 例: "10:30"
  color: 'red' | 'default';
  isAnchor: boolean; // アンカー（基準点）フラグ
  isCompleted?: boolean;
  createdAt: string;
}

export type TimelineItem = EMRTask | UserMemo;

// ロジックによるクラスタリング結果（紐付け提案）
export interface AnchorCluster {
  anchorMemo: UserMemo;
  suggestedTimeWindow: {
    startTime: string; // 例: "10:15"
    endTime: string;   // 例: "10:30"
  };
  suggestedTasks: EMRTask[];
  totalEstimatedMinutes: number;
  reason: string;
}

export interface TimelineOptimizationResult {
  clusters: AnchorCluster[];
  unclusteredTasks: EMRTask[];
  allMemos: UserMemo[];
}
