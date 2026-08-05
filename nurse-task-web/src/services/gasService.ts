/**
 * Google Apps Script (GAS) Web API とのハイブリッド同期サービス（429エラー対策キャッシュ付き）
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
  nurse_id?: string;
  staff_id?: string;
  team?: string;
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

      const result: GASFetchResult = { tasks, patients, rooms, facilities, nurses };
      
      // キャッシュを更新
      cacheData = result;
      lastFetchTime = Date.now();

      return result;
    } catch (error) {
      console.error("GASデータ取得エラー:", error);
      // エラー時も直前のキャッシュがあればそれをフォールバックとして返す
      if (cacheData) {
        console.warn("⚠️ 通信エラーが発生したため、古いキャッシュデータを返します");
        return cacheData;
      }
      return { tasks: [], patients: [], rooms: [], facilities: [], nurses: [] };
    } finally {
      // 処理が終わったら進行中フラグをクリア
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