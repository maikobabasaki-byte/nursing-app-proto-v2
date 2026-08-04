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

/**
 * GASのGETエンドポイントから全タスクを取得
 */
export const fetchTasksFromGAS = async (): Promise<GASTaskResponse[]> => {
  if (!GAS_API_URL) {
    console.warn("VITE_GAS_API_URL が設定されていません");
    return [];
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
    // 配列、もしくは { tasks: [...] } や { data: [...] } のラップに対応
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.tasks)) {
      return data.tasks;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("GASタスク取得エラー:", error);
    return [];
  }
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
