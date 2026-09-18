// 💬 看護師向け 個人パフォーマンス＆タイムラインダッシュボード 型定義

export interface UserRoleInfo {
  id: string;
  name: string;
  role: 'admin' | 'nurse';
}

export interface TimelineItem {
  id: string;
  time: string;
  room: string;
  patientName: string;
  taskTitle: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
}

export interface SkillItem {
  subject: string;
  score: number;
  rationale: string; // 評価の根拠テキスト
  fullMark?: number;
}

export interface PaceItem {
  time: string;
  planned: number;
  actual: number;
}

export interface AIFeedback {
  strengths: string[];
  improvements: string[];
  recommendation: string;
  evalSummary: string;
}

// 💬 各振り返り項目直下に埋め込まれるインライン対話チャットメッセージの型定義
export interface ItemChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'nurse';
  senderAvatarEmoji: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KPTReflection {
  keep: string;
  problem: string;
  try: string;
}

export interface KolbReflection {
  experience: string;  // 具体的経験
  reflection: string;  // 内省的観察
  conceptual: string;  // 抽象的概念化
  experiment: string;  // 能動的試行
}

// 🧱 モジュール型課題カード（課題ブロック）の型定義
export interface ModularReflection {
  id: string;
  type: string; // '課題' | '学び' | '改善点' | 'その他'
  title: string;
  content: string;
  comments: ItemChatMessage[]; // この課題カード専用のチャット対話スレッド
  createdAt?: string;
}

export interface StaffReflection {
  format: 'free' | 'kpt' | 'kolb' | 'modular';
  nurseSelfReflection: string;
  kpt: KPTReflection;
  kolb: KolbReflection;
  reflections: ModularReflection[]; // モジュール型課題カードの配列
  preceptorComment: string;
  preceptorName: string;
}

export interface StaffProfile {
  user: {
    id: string;
    name: string;
    role: 'admin' | 'nurse';
    rank: string;
    ward: string;
    avatarEmoji: string;
  };
  timeline: TimelineItem[];
  skillData: SkillItem[];
  paceData: PaceItem[];
  feedback: AIFeedback;
  reflection: StaffReflection;
}

export interface GapItem {
  id: string;
  startTimeStr: string;
  endTimeStr: string;
  startMin: number;
  endMin: number;
  gapMinutes: number;
  topPx: number;
  heightPx: number;
}

export interface GapSubSegment {
  id: string;
  minutes: number;
  activity: string;
}

// ☕ Gap行動のプルダウン選択肢オプション
export const GAP_ACTIVITY_OPTIONS = [
  '👇 行動を選択してください...',
  '📝 看護記録・SOAP入力',
  '🍱 昼休憩・食事',
  '🏃 割り込み対応・ナースコール',
  '🤝 他ナースのフォロー・ペア介助',
  '🚶 患者搬送・検査同行',
  '🧹 備品整理・消毒・片付け',
  '💬 カンファレンス・申し送り',
  '☕ 休憩・小休止',
];
