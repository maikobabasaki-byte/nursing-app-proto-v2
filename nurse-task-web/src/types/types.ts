
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
}