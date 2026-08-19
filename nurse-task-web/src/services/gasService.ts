import type { ExtendedTask } from '../types/types';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;
console.log("【確認用】現在のGAS_API_URL:", GAS_API_URL);

export interface GASTaskPayload {
  emr_order_id: string;
  status: string;
  completed_at?: string;
  nurse_name?: string;
  unexecuted_reason?: string;
  is_additional?: boolean | string;
}

export interface GASTaskResponse {
  emr_order_id: string;
  patient_id: string;
  patient_name?: string;
  room?: string;
  room_id?: string;
  origin?: string;
  title: string;
  scheduled_time?: string;
  scheduled_at?: string;
  status?: string;
  completed_at?: string;
  is_additional?: boolean | string;
  nurse_name?: string;
  nurse_id?: string;
  staff_id?: string;
  team?: string;
  unexecuted_reason?: string;
  display_period?: string;
  details?: string;
  instruction_type?: string;
  placement_type?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface GASPatientResponse {
  patient_id: string;
  name?: string;
  patient_name?: string;
  gender?: string;
  room_id?: string;
  bed_number?: number | string;
  team?: string;
  [key: string]: any;
}

export interface GASNurseMasterResponse {
  nurse_id: string;
  name: string;
  gender?: string;
  team?: string;
  email?: string;
  is_leader?: boolean;
}

export interface GASFetchResult {
  tasks: GASTaskResponse[];
  patients: GASPatientResponse[];
  rooms?: any[];
  facilities?: any[];
  nurses: GASNurseMasterResponse[];
}

// 💡 429エラー（リクエスト過多）を防ぐためのキャッシュ管理変数
let cacheData: GASFetchResult | null = null;
let lastFetchTime = 0;
let ongoingFetchPromise: Promise<GASFetchResult> | null = null;
const CACHE_TTL_MS = 10000; // 10秒間は同じデータをキャッシュから返す（GASへの連続アクセスを完全ブロック）

/**
 * GASのGETエンドポイントから全マスターデータ (Tasks, Patients, Rooms, Facilities, Nurses) を取得
 * ※ 10秒以内の重複リクエストはキャッシュを返し、同時並行リクエストは一本化します
 */
export const fetchGASData = async (): Promise<GASFetchResult> => {
  if (!GAS_API_URL) {
    console.warn("VITE_GAS_API_URL が設定されていません");
    return { tasks: [], patients: [], rooms: [], facilities: [], nurses: [] };
  }

  const now = Date.now();

  // 1. キャッシュが有効な期間内であれば、APIを叩かずにキャッシュを即時返却
  if (cacheData && (now - lastFetchTime < CACHE_TTL_MS)) {
    console.log("⚡ GASデータをキャッシュから返却します（429対策）");
    return cacheData;
  }

  // 2. すでに同じリクエストが走っている場合は、新しいリクエストを作らずにその結果を共有（重複排除）
  if (ongoingFetchPromise) {
    console.log("⏳ すでに実行中のGAS取得リクエストを共有します");
    return ongoingFetchPromise;
  }

  ongoingFetchPromise = (async (): Promise<GASFetchResult> => {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error("⚠️ [GAS API 404 Error] GAS WebアプリのデプロイURLが無効か、再デプロイが必要です。GASエディタの「デプロイの管理」から最新URLを確認して .env の VITE_GAS_API_URL を更新してください。");
        }
        throw new Error(`GAS APIからの取得に失敗しました: Status ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("GASから取得したデータ:", data);

      let tasks: GASTaskResponse[] = [];
      let patients: GASPatientResponse[] = [];
      let rooms: any[] = [];
      let facilities: any[] = [];
      let nurses: GASNurseMasterResponse[] = [];

      if (Array.isArray(data)) {
        tasks = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.tasks)) tasks = data.tasks;
        else if (Array.isArray(data.data)) tasks = data.data;

        if (Array.isArray(data.patients)) patients = data.patients;
        if (Array.isArray(data.rooms)) rooms = data.rooms;
        if (Array.isArray(data.facilities)) facilities = data.facilities;
        if (Array.isArray(data.nurses)) nurses = data.nurses;
      }

      const result: GASFetchResult = { tasks, patients, rooms, facilities, nurses };
      
      // キャッシュを更新
      cacheData = result;
      lastFetchTime = Date.now();

      return result;
    } catch (error) {
      console.error("GASデータ取得エラー:", error);
      // エラー時も直前のキャッシュがあればそれをフォールバックとして返す
      return { tasks: [], patients: [], rooms: [], facilities: [], nurses: [] };
    } finally {
      ongoingFetchPromise = null;
    }
  })();

  return ongoingFetchPromise;
};

/**
 * GASのGETエンドポイントから全タスクを取得 (後方互換用)
 */
export const fetchTasksFromGAS = async (): Promise<GASTaskResponse[]> => {
  const result = await fetchGASData();
  return result.tasks;
};

/**
 * タスクのステータス変更（completed/unexecuted等）をGAS（doGet クエリパラメータ）へ送信してスプレッドシートに書き戻す
 */
export const syncTaskToGAS = async (payload: GASTaskPayload): Promise<boolean> => {
  if (!GAS_API_URL) {
    console.warn("VITE_GAS_API_URL が設定されていないため、GAS同期をスキップします");
    return false;
  }

  if (!payload.emr_order_id) {
    console.warn("emr_order_id が存在しないため、GAS書き戻しをスキップします", payload);
    return false;
  }

  try {
    const params = new URLSearchParams({
      emr_order_id: String(payload.emr_order_id),
      status: payload.status || 'untouched',
      completed_at: payload.completed_at || '',
      nurse_name: payload.nurse_name || '',
      unexecuted_reason: payload.unexecuted_reason || '',
    });

    if (payload.is_additional !== undefined && payload.is_additional !== null && payload.is_additional !== '') {
      params.append('is_additional', String(payload.is_additional));
    }

    const url = `${GAS_API_URL}?${params.toString()}`;
    console.log("GASへ書き戻し送信中 (GET):", url);

    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    });

    console.log("GAS書き戻しリクエストを安全に送信しました");
    return true;
  } catch (error) {
    console.warn("GASへの書き戻し送信スキップ/通知:", error);
    return false;
  }
};

/**
 * 💡 臨時追加されたタスク群を GAS API 経由でスプレッドシート（Tasksシート）へ一括保存・同期する
 */
export const saveAdditionalTasksToGAS = async (tasks: ExtendedTask[]): Promise<boolean> => {
  if (!GAS_API_URL || tasks.length === 0) {
    return true;
  }

  try {
    const promises = tasks.map(async (task) => {
      const params = new URLSearchParams({
        action: 'add_task',
        emr_order_id: String(task.task_id || task.emr_order_id),
        patient_id: String(task.patient_id || ''),
        title: String(task.title || ''),
        details: String(task.details || ''),
        instruction_type: String(task.instruction_type || '看護指示'),
        display_period: String(task.display_period || '14:00'),
        placement_type: String(task.placement_type || 'time_slot'),
        priority: String(task.priority || 'medium'),
        status: String(task.status || 'untouched'),
        completed_at: String(task.completed_at || ''),
        is_additional: 'true',
        nurse_id: String(task.nurse_id || ''),
        nurse_name: String(task.nurse_name || ''),
        unexecuted_reason: String(task.unexecuted_reason || ''),
      });

      const url = `${GAS_API_URL}?${params.toString()}`;
      console.log("GASへ臨時追加タスク保存送信中:", url);

      const res = await fetch(url, { method: 'GET' });
      return res.ok;
    });

    const results = await Promise.all(promises);
    return results.every((r) => r);
  } catch (err) {
    console.error("GASへの追加タスク一括保存エラー:", err);
    return false;
  }
};

/**
 * 💡 タスクが複製・臨時追加された瞬間に、自動でGAS API経由でスプレッドシートへリアルタイム送信・追加する
 */
export const addSingleTaskToGAS = async (task: ExtendedTask): Promise<boolean> => {
  if (!GAS_API_URL) {
    console.warn("VITE_GAS_API_URL が設定されていないため、GASリアルタイム送信をスキップします");
    return false;
  }

  try {
    const params = new URLSearchParams({
      action: 'add_task',
      emr_order_id: String(task.task_id || task.emr_order_id),
      patient_id: String(task.patient_id || ''),
      room_id: String(task.room_id || ''),
      title: String(task.title || ''),
      details: String(task.details || ''),
      instruction_type: String(task.instruction_type || '看護指示'),
      display_period: String(task.display_period || '14:00'),
      placement_type: String(task.placement_type || 'time_slot'),
      priority: String(task.priority || 'medium'),
      status: String(task.status || 'untouched'),
      completed_at: String(task.completed_at || ''),
      is_additional: 'true',
      nurse_name: String(task.nurse_name || ''),
      unexecuted_reason: String(task.unexecuted_reason || ''),
    });

    const url = `${GAS_API_URL}?${params.toString()}`;
    console.log("⚡ [自動同期] 臨時追加タスクをGASへ送信中:", url);

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      console.warn("GASリアルタイム追加レスポンス異常:", response.statusText);
      return false;
    }

    const data = await response.json().catch(() => ({}));
    console.log("⚡ [自動同期] GAS追加結果:", data);
    return true;
  } catch (error) {
    console.error("GASへのリアルタイムタスク追加エラー:", error);
    return false;
  }
};

/**
 * 💡 スプレッドシート上の臨時追加タスクを一括リセット・削除するシグナルをGASへ送信
 */
export const resetAdditionalTasksInGAS = async (): Promise<boolean> => {
  if (!GAS_API_URL) return true;

  try {
    const params = new URLSearchParams({
      action: 'reset_additional_tasks',
      reset_additional: 'true',
    });

    const url = `${GAS_API_URL}?${params.toString()}`;
    console.log("🧹 [一括リセット] GASへリセット命令送信中:", url);

    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.error("GASリセット送信エラー:", error);
    return false;
  }
};