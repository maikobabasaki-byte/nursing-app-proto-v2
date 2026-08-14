import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ExtendedTaskStatus } from '../types/types';
import { syncTaskToGAS } from '../services/gasService';
import { getJSTISOString, getJSTDateString } from '../utils/dateUtils';

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
      const isAdditional = existingData.is_additional || '';

      console.log(`📡 GASへの書き戻しを実行します: ID[${emrOrderId}], Status[${newStatus}]`);
      syncTaskToGAS({
        emr_order_id: emrOrderId,
        status: newStatus,
        completed_at: finalCompletedAt,
        nurse_name: nurseName,
        unexecuted_reason: unexecutedReason,
        is_additional: isAdditional,
      });
    }
  } catch (error) {
    console.error("Firestoreタスクの更新エラー:", error);
  }
};

/**
 * ⚡ 「ナースコール・SOS対応」割り込みタスクの動的生成と自動ステータス変更
 * 1. 既存の「実施中 (progressing)」タスクを自動的に「中断中 (pending)」へ変更
 * 2. 現在時刻（HH:mm）で新しい「ナースコール・SOS急変対応」タスクを生成してFirestoreへ保存
 * 3. 新規タスクを「実施中 (progressing)」として登録
 */
export const triggerNurseCallInterruption = async (options?: {
  patientId?: string;
  patientName?: string;
  roomId?: string;
  sosReason?: string;
  title?: string;
}) => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hh}:${mm}`;

  const { useTimelineStore } = await import('../stores/useTimelineStore');
  const { flattenTasks } = await import('../utils/taskLogic');
  const store = useTimelineStore.getState();
  const allTasks = store.allTasks;
  const currentUser = store.currentUser;

  const nurseId = String(currentUser?.nurse_id || currentUser?.staff_id || 'guest_nurse').trim();
  const nurseName = String(currentUser?.name || '自分').trim();

  // 1. 既存の「実施中 (progressing)」および「記録中 (record_start)」タスクを自動的に「中断中」へ一括切り替え
  const flat = flattenTasks(allTasks);
  const activeTasks = flat.filter((t) => t.status === 'progressing' || t.status === 'record_start');
  
  for (const activeTask of activeTasks) {
    const nextStatus = activeTask.status === 'record_start' ? 'record_pending' : 'pending';
    store.handleUpdateStatus(activeTask.task_id, nextStatus);
  }

  // ログイン看護師のアクティブタスク患者情報を優先適用
  const firstActive = activeTasks[0];
  const defaultPatientId = options?.patientId || firstActive?.patient_id || '';
  const defaultPatientName = options?.patientName || firstActive?.patient_name || '';
  const defaultRoomId = options?.roomId || firstActive?.room_id || '';

  // 2. 新規割り込みタスク（実績ドキュメント）の生成
  const taskId = `CALL_INTERRUPT_${Date.now()}`;
  const taskTitle = options?.title || '📞 ナースコール対応';
  const newTask: any = {
    task_id: taskId,
    emr_order_id: taskId,
    patient_id: defaultPatientId,
    patient_name: defaultPatientName,
    room_id: defaultRoomId,
    title: taskTitle,
    details: `【突発割り込み実績】${options?.sosReason || '離床センサー検知・ナースコール緊急対応'} (対応開始: ${currentTimeStr})`,
    status: 'progressing', // 🔵 新規タスクを実施中にセット
    scheduled_at: currentTimeStr,
    initial_period: currentTimeStr,
    display_period: currentTimeStr,
    category: '処置',
    priority: 'high',
    instruction_type: '', // 💡 不要な「医師指示」バッジを付与しない
    isDoctorOrder: false,
    isRestricted: false,
    requiresAssist: false,
    is_additional: true, // 💡 臨時追加割り込みフラグ
    is_sos: false,
    nurse_id: nurseId,
    nurse_name: nurseName,
    staff_id: nurseId,
    assigned_nurse_id: nurseId,
    isGroup: false,
    isChild: false,
    target_date: store.selectedDate || getJSTDateString(),
  };

  // 3. Store へ即時反映 (0秒 UI 反映) ＆ Firestore へ動的書き込み
  store.addTask(newTask);

  try {
    const taskRef = doc(db, 'tasks', taskId);
    await setDoc(taskRef, {
      ...newTask,
      created_at: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("⚡ ナースコール割り込みタスクを動的追加・実施中に設定しました:", newTask);
  } catch (err) {
    console.error("ナースコール割り込みタスクFirestore保存エラー:", err);
  }

  return newTask;
};