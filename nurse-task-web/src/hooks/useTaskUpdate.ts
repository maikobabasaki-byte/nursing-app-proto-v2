import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TaskStatus } from '../types/types';

/**
 * Firestore上のタスク情報を更新する関数
 * @param taskId 更新対象のタスクID
 * @param data 更新するデータ（status, display_period, または互換用の time）
 */
export const updateTask = async (
  taskId: string, 
  data: { 
    status?: TaskStatus; 
    display_period?: string; 
    time?: string; 
    parent_id?: string | null;
    is_sos?: boolean;
    sos_reason?: string;
  }
) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    
    // Firestore のドキュメント構造（display_period）にマッピングして保存
    const updatePayload: any = {
      updatedAt: serverTimestamp(),
    };

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }

    if (data.display_period !== undefined) {
      updatePayload.display_period = data.display_period;
    } else if (data.time !== undefined) {
      // 互換性のため、timeが渡された場合はdisplay_periodにマッピング
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

    await updateDoc(taskRef, updatePayload);
    console.log(`Firestoreのタスク ${taskId} を更新しました:`, updatePayload);
  } catch (error) {
    console.error("Firestoreタスクの更新エラー:", error);
  }
};