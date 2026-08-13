import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ExtendedTaskStatus } from '../types/types';
import { syncTaskToGAS } from '../services/gasService';
import { getJSTISOString } from '../utils/dateUtils';

/**
 * Firestore上のタスク情報を更新する関数
 * @param taskId 更新対象のタスクID
 * @param data 更新するデータ
 */
export const updateTask = async (
  taskId: string, 
  data: { 
    status?: ExtendedTaskStatus; 
    display_period?: string; 
    time?: string; 
    parent_id?: string | null;
    is_sos?: boolean;
    sos_reason?: string;
    unexecuted_reason?: string;
    initial_period?: string;
    nurse_name?: string;
    assigned_nurse_id?: string;
    staff_id?: string;
    completed_at?: string;
    emr_order_id?: string;
    priority?: 'high' | 'medium' | 'low';
  }
) => {
  // 🛡️ チュートリアル用のデモタスク（demo-task-tutorial）は Firestore / GAS への送信をスキップ
  if (taskId === 'demo-task-tutorial') {
    return;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(taskRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};

    // Firestore のドキュメント構造にマッピングして保存
    const updatePayload: any = {
      updatedAt: serverTimestamp(),
    };

    if (data.priority !== undefined) {
      updatePayload.priority = data.priority;
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }

    if (data.display_period !== undefined) {
      updatePayload.display_period = data.display_period;
    } else if (data.time !== undefined) {
      updatePayload.display_period = data.time;
    }

    if (data.parent_id !== undefined) {
      updatePayload.parent_id = data.parent_id;
    }

    if (data.is_sos !== undefined) {
      updatePayload.is_sos = data.is_sos;
    }

    if (data.sos_reason !== undefined) {
      updatePayload.sos_reason = data.sos_reason;
    }

    if (data.unexecuted_reason !== undefined) {
      updatePayload.unexecuted_reason = data.unexecuted_reason;
    }

    if (data.initial_period !== undefined) {
      updatePayload.initial_period = data.initial_period;
    }

    if (data.nurse_name !== undefined) {
      updatePayload.nurse_name = data.nurse_name;
    }

    if (data.assigned_nurse_id !== undefined) {
      updatePayload.assigned_nurse_id = data.assigned_nurse_id;
    }

    if (data.staff_id !== undefined) {
      updatePayload.staff_id = data.staff_id;
    }

    // ステータスが completed の場合、completed_at が渡されていなければ日本時間の現在時刻をセット
    let completedAtToSave = data.completed_at;
    if (data.status === 'completed' && !completedAtToSave) {
      completedAtToSave = getJSTISOString();
    }

    if (completedAtToSave !== undefined) {
      updatePayload.completed_at = completedAtToSave;
    }

    if (data.emr_order_id !== undefined) {
      updatePayload.emr_order_id = data.emr_order_id;
    }

    await updateDoc(taskRef, updatePayload);
    console.log(`Firestoreのタスク ${taskId} を更新しました:`, updatePayload);

    // 💡 スプレッドシートへの書き戻し条件：実施完了（completed / record_complete）または 未実施（unexecuted）
    const newStatus = data.status || existingData.status;
    const isCompletedStatus = newStatus === 'completed' || newStatus === 'record_complete';
    const isUnexecutedStatus = newStatus === 'unexecuted';

    if (isCompletedStatus || isUnexecutedStatus) {
      const emrOrderId = data.emr_order_id || existingData.emr_order_id || taskId;
      const nurseName = data.nurse_name || existingData.nurse_name || '';
      const unexecutedReason = data.unexecuted_reason !== undefined ? data.unexecuted_reason : (existingData.unexecuted_reason || '');
      const finalCompletedAt = completedAtToSave || existingData.completed_at || (isCompletedStatus ? getJSTISOString() : '');

      console.log(`📡 GASへの書き戻しを実行します: ID[${emrOrderId}], Status[${newStatus}]`);
      syncTaskToGAS({
        emr_order_id: emrOrderId,
        status: newStatus,
        completed_at: finalCompletedAt,
        nurse_name: nurseName,
        unexecuted_reason: unexecutedReason,
      });
    }
  } catch (error) {
    console.error("Firestoreタスクの更新エラー:", error);
  }
};