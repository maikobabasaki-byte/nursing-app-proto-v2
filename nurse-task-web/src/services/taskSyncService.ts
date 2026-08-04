import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchTasksFromGAS, type GASTaskResponse } from './gasService';
import { getJSTDateString } from '../utils/dateUtils';
import type { TaskDocument, ExtendedTask } from '../types/types';

/**
 * スプレッドシート (GAS) の生データをアプリ用の ExtendedTask 配列に変換する
 */
export const mapGASTaskToExtendedTask = (item: GASTaskResponse, index: number, todayJST: string, userName?: string): ExtendedTask => {
  const taskId = item.emr_order_id || `GAS_TASK_${index + 1}`;
  let period = String(item.display_period || item.scheduled_time || "").trim();

  let scheduledAtJST = "";
  if (period.includes(':')) {
    const timeMatch = period.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, '0');
      const mm = timeMatch[2];
      period = `${hh}:${mm}`; // 💡 09:00 のような2桁HH:mm表記に統一
      scheduledAtJST = `${todayJST}T${hh}:${mm}:00`;
    }
  }

  return {
    task_id: taskId,
    emr_order_id: item.emr_order_id || taskId,
    title: item.title || "無題タスク",
    details: item.details || "",
    status: (item.status as any) || 'untouched',
    display_period: period,
    initial_period: period,
    priority: item.priority || 'medium',
    scheduled_at: scheduledAtJST,
    completed_at: item.completed_at || "",
    patient_id: item.patient_id || "",
    room_id: item.room_id || item.room || "",
    patient_name: item.patient_name || "",
    nurse_name: item.nurse_name || userName || "",
    unexecuted_reason: item.unexecuted_reason || "",
    is_additional: item.is_additional || "",
    parent_id: null,
    is_sos: false,
    sos_reason: "",
  };
};

/**
 * スプレッドシート (GAS) から全タスクを絶対正本として取得し、
 * Firestore に保存・展開する。
 */
export const ensureTodayTasksSynced = async (userName?: string): Promise<ExtendedTask[]> => {
  try {
    const todayJST = getJSTDateString();
    console.log(`スプレッドシート (GAS) から全タスクデータを直読み込み中...`);
    const gasTasks = await fetchTasksFromGAS();

    if (!gasTasks || gasTasks.length === 0) {
      console.warn("GASから取得できたタスクが0件です。");
      return [];
    }

    const batch = writeBatch(db);
    const mappedTasks: ExtendedTask[] = [];

    gasTasks.forEach((item, index) => {
      const taskDoc = mapGASTaskToExtendedTask(item, index, todayJST, userName);
      mappedTasks.push(taskDoc);

      const docRef = doc(db, 'tasks', taskDoc.task_id);
      batch.set(docRef, taskDoc, { merge: true });
    });

    await batch.commit();
    console.log(`スプレッドシートから取得した ${gasTasks.length} 件のタスクを Firestore に上書き保存完了しました。`);
    return mappedTasks;
  } catch (error) {
    console.error("スプレッドシートタスクの同期処理エラー:", error);
    return [];
  }
};
