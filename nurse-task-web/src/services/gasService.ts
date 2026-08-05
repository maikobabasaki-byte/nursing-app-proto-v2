/**
 * Google Apps Script (GAS) Web API とのハイブリッド同期サービス
 */

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

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
  unexecuted_reason?: string;
  display_period?: string;
  details?: string;
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

/**
 * GASのGETエンドポイントから全マスターデータ (Tasks, Patients, Rooms, Facilities, Nurses) を取得
 */
export const fetchGASData = async (): Promise<GASFetchResult> => {
  if (!GAS_API_URL) {
    console.warn("VITE_GAS_API_URL が設定されていません");
    return { tasks: [], patients: [], rooms: [], facilities: [], nurses: [] };
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GAS APIからの取得に失敗しました: ${response.statusText}`);
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

    return { tasks, patients, rooms, facilities, nurses };
  } catch (error) {
    console.error("GASデータ取得エラー:", error);
    return { tasks: [], patients: [], rooms: [], facilities: [], nurses: [] };
  }
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

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`GAS書き戻しレスポンスエラー: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("GAS書き戻し成功レスポンス:", result);
    return result.success ?? true;
  } catch (error) {
    console.error("GASへの書き戻し同期エラー:", error);
    return false;
  }
};
