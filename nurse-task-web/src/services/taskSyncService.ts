import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db, registerActiveDateInFirestore } from '../lib/firebase';
import { fetchGASData, type GASTaskResponse, type GASPatientResponse } from './gasService';
import { getJSTDateString } from '../utils/dateUtils';
import type { ExtendedTask } from '../types/types';
import { assignDefaultPriority } from '../utils/taskLogic';
import { useTimelineStore } from '../stores/useTimelineStore';

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

  // 現場ルールに基づく優先度の自動判定
  const assignedPriority = assignDefaultPriority({
    title: resolvedTitle,
    details: item.details,
    priority: item.priority,
    requiresAssist: Boolean(rawItem.requiresAssist || rawItem.requires_assist)
  });

  return {
    task_id: taskId,
    emr_order_id: taskId,
    title: String(resolvedTitle).trim(),
    details: item.details || "",
    status: (item.status as any) || 'untouched',
    display_period: period,
    initial_period: period,
    priority: assignedPriority,
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
    target_date: todayJST,
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

/**
 * GASデータの必須項目（タスク名など）を検証するバリデーション関数。
 * 不完全なデータ（部屋番号だけが入力されている空行・ゴーストタスク等）を除外します。
 */
export const isValidGASTask = (item: GASTaskResponse): boolean => {
  if (!item) return false;
  const rawItem = item as Record<string, any>;
  const title = String(item.title || rawItem.task_name || rawItem.taskName || rawItem['タスク名'] || rawItem['指示内容'] || '').trim();

  // タスク名が空文字、null、undefined、無題タスクの場合は除外
  if (!title || title === '無題タスク') {
    return false;
  }

  return true;
};

// 💡 同期処理自体の重複実行を完全に防ぐためのロック用変数
let ongoingSyncPromise: Promise<ExtendedTask[]> | null = null;

/**
 * スプレッドシート (GAS) から全タスク・全患者データを取得し、
 * Firestore および Zustand を正のデータで完全リセット・同期する。
 */
export const ensureTodayTasksSynced = async (userName?: string): Promise<ExtendedTask[]> => {
  if (ongoingSyncPromise) {
    console.log("⏳ すでに同期処理が実行中のため、既存の同期プロセス結果を共有します（429防止）");
    return ongoingSyncPromise;
  }

  ongoingSyncPromise = (async (): Promise<ExtendedTask[]> => {
    try {
      const todayJST = getJSTDateString();
      console.log(`🚀 スプレッドシート (GAS) から正のデータを取得中...`);
      const { tasks: gasTasks, patients: gasPatients } = await fetchGASData();

      if (!gasTasks || gasTasks.length === 0) {
        console.warn("GASから取得できたタスクが0件です。");
        return [];
      }

      // ① スプレッドシートの正データをアプリ用型に変換（不完全な空タスクを除外）
      const validGasTasks = gasTasks.filter(isValidGASTask);
      const canonicalTasks: ExtendedTask[] = validGasTasks.map((item, index) =>
        cleanUndefinedFields(mapGASTaskToExtendedTask(item, index, todayJST, userName, gasPatients))
      );

      // ② 不要な旧タスクの削除と正のタスクの保存を単一の Batch でアトミック（原子性）処理
      // (※別々のBatchコミットにすると一時的にタスク0件となり画面が消える現象が発生するためアトミック化)
      const syncBatch = writeBatch(db);
      const canonicalIds = new Set(canonicalTasks.map(t => t.task_id));

      try {
        const existingSnapshot = await getDocs(collection(db, 'tasks'));
        if (!existingSnapshot.empty) {
          existingSnapshot.docs.forEach(docSnap => {
            const id = docSnap.id;
            // 正のタスク一覧に含まれず、かつデモ/システム用でない旧タスクを削除対象に追加
            if (!canonicalIds.has(id) && !id.startsWith('system-') && !id.startsWith('patient-sos-')) {
              syncBatch.delete(docSnap.ref);
            }
          });
        }
      } catch (e) {
        console.warn("Firestoreからの旧タスク整理中の警告:", e);
      }

      // ③ 正のタスクデータを一括セット
      canonicalTasks.forEach(task => {
        const docRef = doc(db, 'tasks', task.task_id);
        syncBatch.set(docRef, task);
      });

      // ⚡ アトミックに一括コミット（0件になる中間状態を排除しチラつき完全防止）
      await syncBatch.commit();
      await registerActiveDateInFirestore(todayJST);
      console.log(`✅ 正のタスク ${canonicalTasks.length} 件を Firestore にアトミック一括同期完了しました。`);

      // ④ Zustand ストアのタスクデータも一括更新
      useTimelineStore.getState().setTasks(canonicalTasks);

      return canonicalTasks;
    } catch (error) {
      console.error("スプレッドシートタスクの同期処理エラー:", error);
      return [];
    } finally {
      ongoingSyncPromise = null;
    }
  })();

  return ongoingSyncPromise;
};

export const resetAndSyncFromSpreadsheet = ensureTodayTasksSynced;