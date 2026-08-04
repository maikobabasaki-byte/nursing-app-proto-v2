import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchGASData, type GASTaskResponse, type GASPatientResponse } from './gasService';
import { getJSTDateString } from '../utils/dateUtils';
import type { TaskDocument, ExtendedTask } from '../types/types';

/**
 * スプレッドシート (GAS) の生データをアプリ用の ExtendedTask 配列に変換する。
 * GAS側で自動結合された patient_name をそのまま活用し、必要に応じて patients リストからの補完も行います。
 */
export const mapGASTaskToExtendedTask = (
  item: GASTaskResponse, 
  index: number, 
  todayJST: string, 
  userName?: string,
  patients?: GASPatientResponse[]
): ExtendedTask => {
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

  // GAS側で結合済みの患者氏名、または Patients 配列からの補完
  const rawItem = item as Record<string, any>;
  const targetPatientId = (item.patient_id || "").trim();
  const matchedPatient = patients?.find(p => String(p.patient_id || p.patientId || p.id || "").trim() === targetPatientId);

  const resolvedPatientName = 
    item.patient_name || 
    rawItem.patientName || 
    rawItem.name || 
    matchedPatient?.name || 
    matchedPatient?.patient_name || 
    (targetPatientId ? `患者(${targetPatientId})` : "患者名未設定");

  const resolvedRoomId = 
    item.room_id || 
    item.room || 
    matchedPatient?.room_id || 
    rawItem['病室'] || 
    "";

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
    patient_id: targetPatientId,
    room_id: resolvedRoomId,
    patient_name: resolvedPatientName,
    nurse_name: item.nurse_name || userName || "",
    unexecuted_reason: item.unexecuted_reason || "",
    is_additional: item.is_additional || "",
    parent_id: null,
    is_sos: false,
    sos_reason: "",
  };
};

/**
 * スプレッドシート (GAS) から全タスク・全患者データを取得し、
 * Firestore に保存・展開する。
 * 🧠 Smart Merge: ユーザーがアプリ上で行ったグループ化 (parent_id) やステータス変更を保護・引き継ぐ。
 */
export const ensureTodayTasksSynced = async (userName?: string): Promise<ExtendedTask[]> => {
  try {
    const todayJST = getJSTDateString();
    console.log(`スプレッドシート (GAS) から全タスク・患者データを取得中...`);
    const { tasks: gasTasks, patients: gasPatients } = await fetchGASData();

    if (!gasTasks || gasTasks.length === 0) {
      console.warn("GASから取得できたタスクが0件です。");
      return [];
    }

    // 💡 既存の Firestore ドキュメントを全件読み込み、ユーザーの変更（parent_id, status 等）を二重保護
    const existingSnapshot = await getDocs(collection(db, 'tasks'));
    const existingTasksMap = new Map<string, any>();
    existingSnapshot.docs.forEach(doc => {
      existingTasksMap.set(doc.id, doc.data());
    });

    const batch = writeBatch(db);
    const mappedTasks: ExtendedTask[] = [];

    gasTasks.forEach((item, index) => {
      const gasMappedTask = mapGASTaskToExtendedTask(item, index, todayJST, userName, gasPatients);
      const existingTask = existingTasksMap.get(gasMappedTask.task_id);

      // 🧠 【スマートマージ】既存の Firestore にユーザー変更（グループ化・ステータス更新）が存在すれば保護・保持
      const mergedTaskDoc: ExtendedTask = {
        ...gasMappedTask,
        parent_id: existingTask?.parent_id !== undefined ? existingTask.parent_id : gasMappedTask.parent_id,
        status: existingTask?.status !== undefined ? existingTask.status : gasMappedTask.status,
        display_period: existingTask?.display_period !== undefined ? existingTask.display_period : gasMappedTask.display_period,
        completed_at: existingTask?.completed_at !== undefined ? existingTask.completed_at : gasMappedTask.completed_at,
        unexecuted_reason: existingTask?.unexecuted_reason !== undefined ? existingTask.unexecuted_reason : gasMappedTask.unexecuted_reason,
        is_sos: existingTask?.is_sos !== undefined ? existingTask.is_sos : gasMappedTask.is_sos,
        sos_reason: existingTask?.sos_reason !== undefined ? existingTask.sos_reason : gasMappedTask.sos_reason,
      };

      mappedTasks.push(mergedTaskDoc);

      const docRef = doc(db, 'tasks', mergedTaskDoc.task_id);
      batch.set(docRef, mergedTaskDoc, { merge: true });
    });

    await batch.commit();
    console.log(`スプレッドシートから取得した ${gasTasks.length} 件のタスクをスマートマージ（ユーザー操作保持）で Firestore に同期完了しました。`);
    return mappedTasks;
  } catch (error) {
    console.error("スプレッドシートタスクの同期処理エラー:", error);
    return [];
  }
};
