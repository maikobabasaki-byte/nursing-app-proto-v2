import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchGASData, type GASTaskResponse, type GASPatientResponse } from './gasService';
import { getJSTDateString } from '../utils/dateUtils';
import type { ExtendedTask } from '../types/types';

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
  const taskId = String(item.emr_order_id || (item as any).task_id || `GAS_TASK_${index + 1}`).trim();
  
  // 💡 Sat Dec 30 1899... などの不用なDate文字列を除去し、HH:mm 表記へ正規化
  const rawPeriod = String(item.display_period || item.scheduled_time || item.scheduled_at || "").trim();
  let period = "";
  
  const timeMatch = rawPeriod.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    period = `${hh}:${mm}`;
  } else if (!rawPeriod.includes('1899') && !rawPeriod.includes('GMT') && !rawPeriod.includes('1900')) {
    period = rawPeriod;
  }

  const rawItem = item as Record<string, any>;
  const targetPatientId = String(item.patient_id || rawItem.patientId || "").trim();
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

  const resolvedTitle = 
    item.title || 
    rawItem.task_name || 
    "無題タスク";

  const resolvedNurseId = String(item.nurse_id || rawItem.nurse_id || item.staff_id || rawItem.staffId || rawItem.assigned_nurse_id || '').trim();
  const resolvedStaffId = String(item.staff_id || rawItem.staffId || rawItem.assigned_nurse_id || item.nurse_id || rawItem.nurse_id || '').trim();
  const resolvedNurseName = String(item.nurse_name || rawItem.nurseName || userName || '').trim();
  const resolvedTeam = String(item.team || rawItem.team || matchedPatient?.team || '').trim();

  return {
    task_id: taskId,
    emr_order_id: taskId,
    title: String(resolvedTitle).trim(),
    details: item.details || "",
    status: (item.status as any) || 'untouched',
    display_period: period,
    initial_period: period,
    priority: item.priority || 'medium',
    scheduled_at: period.includes(':') ? `${todayJST}T${period}:00` : '',
    completed_at: item.completed_at || "",
    patient_id: targetPatientId,
    room_id: String(resolvedRoomId).trim(),
    patient_name: String(resolvedPatientName).trim(),
    nurse_name: resolvedNurseName,
    nurse_id: resolvedNurseId || resolvedStaffId || "",
    staff_id: resolvedStaffId || resolvedNurseId || "",
    assigned_nurse_id: resolvedStaffId || resolvedNurseId || "",
    team: resolvedTeam,
    instruction_type: item.instruction_type || rawItem.instruction_type || rawItem['指示区分'] || '医師指示',
    placement_type: item.placement_type || rawItem.placement_type || rawItem['配置区分'] || '',
    unexecuted_reason: item.unexecuted_reason || "",
    is_additional: item.is_additional || "",
    parent_id: null,
    is_sos: false,
    sos_reason: "",
  };
};

/**
 * 💡 Firestore書き込み直前にオブジェクト内のすべての undefined プロパティを全自動でクリーンアップする関数
 */
export const cleanUndefinedFields = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefinedFields);
  const cleaned: Record<string, any> = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
};

// 💡 同期処理自体の重複実行を完全に防ぐためのロック用変数
let ongoingSyncPromise: Promise<ExtendedTask[]> | null = null;

/**
 * スプレッドシート (GAS) から全タスク・全患者データを取得し、
 * Firestore に保存・展開する。
 * 🧠 Smart Merge: ユーザーがアプリ上で行ったグループ化 (parent_id) やステータス変更を保護・引き継ぐ。
 * ※ 同時並行で呼び出された場合、リクエストを一本化して429エラーを防ぎます。
 */
export const ensureTodayTasksSynced = async (userName?: string): Promise<ExtendedTask[]> => {
  if (ongoingSyncPromise) {
    console.log("⏳ すでに同期処理が実行中のため、既存の同期プロセス結果を共有します（429防止）");
    return ongoingSyncPromise;
  }

  ongoingSyncPromise = (async (): Promise<ExtendedTask[]> => {
    try {
      const todayJST = getJSTDateString();
      console.log(`スプレッドシート (GAS) から全タスク・患者データを取得中...`);
      const { tasks: gasTasks, patients: gasPatients } = await fetchGASData();

      if (!gasTasks || gasTasks.length === 0) {
        console.warn("GASから取得できたタスクが0件です。");
        return [];
      }

      // 💡 既存の Firestore ドキュメントを全件読み込み（クォータオーバー時も安全にフォールバック）
      let existingTasksMap = new Map<string, any>();
      try {
        const existingSnapshot = await getDocs(collection(db, 'tasks'));
        existingSnapshot.docs.forEach(docSnap => {
          existingTasksMap.set(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.warn("Firestoreからの既存タスク読み込みに失敗しました（クォータ超過等）。GASデータを優先適用します:", e);
      }

      const batch = writeBatch(db);
      const mappedTasks: ExtendedTask[] = [];

      gasTasks.forEach((item, index) => {
        const gasMappedTask = mapGASTaskToExtendedTask(item, index, todayJST, userName, gasPatients);
        const existingTask = existingTasksMap.get(gasMappedTask.task_id);

        const mergedTaskDoc: ExtendedTask = {
          ...gasMappedTask,
          parent_id: existingTask?.parent_id !== undefined ? existingTask.parent_id : gasMappedTask.parent_id,
          status: existingTask?.status !== undefined ? existingTask.status : gasMappedTask.status,
          display_period: existingTask?.display_period !== undefined ? existingTask.display_period : gasMappedTask.display_period,
          completed_at: existingTask?.completed_at !== undefined ? existingTask.completed_at : gasMappedTask.completed_at,
          unexecuted_reason: existingTask?.unexecuted_reason !== undefined ? existingTask.unexecuted_reason : gasMappedTask.unexecuted_reason,
          is_sos: existingTask?.is_sos !== undefined ? existingTask.is_sos : gasMappedTask.is_sos,
          sos_reason: existingTask?.sos_reason !== undefined ? existingTask.sos_reason : gasMappedTask.sos_reason,
          instruction_type: existingTask?.instruction_type || gasMappedTask.instruction_type || '医師指示',
          placement_type: existingTask?.placement_type || gasMappedTask.placement_type || '',
          nurse_id: existingTask?.nurse_id || existingTask?.staff_id || existingTask?.assigned_nurse_id || gasMappedTask.nurse_id || "",
          staff_id: existingTask?.staff_id || existingTask?.assigned_nurse_id || existingTask?.nurse_id || gasMappedTask.staff_id || "",
          assigned_nurse_id: existingTask?.assigned_nurse_id || existingTask?.staff_id || existingTask?.nurse_id || gasMappedTask.assigned_nurse_id || "",
          nurse_name: existingTask?.nurse_name || gasMappedTask.nurse_name || "",
          team: existingTask?.team || gasMappedTask.team || "",
        };

        const cleanedDoc = cleanUndefinedFields(mergedTaskDoc);
        mappedTasks.push(cleanedDoc);

        const docRef = doc(db, 'tasks', cleanedDoc.task_id);
        batch.set(docRef, cleanedDoc, { merge: true });
      });

      try {
        await batch.commit();
        console.log(`スプレッドシートから取得した ${gasTasks.length} 件のタスクをスマートマージで Firestore に同期完了しました。`);
      } catch (e) {
        console.warn("Firestoreへの同期コミットエラー（クォータ等）:", e);
      }

      return mappedTasks;
    } catch (error) {
      console.error("スプレッドシートタスクの同期処理エラー:", error);
      return [];
    } finally {
      // 処理が終わったらロックを解除
      ongoingSyncPromise = null;
    }
  })();

  return ongoingSyncPromise;
};