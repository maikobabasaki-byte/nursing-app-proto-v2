import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  runTransaction, 
  collection, 
  serverTimestamp,
  arrayUnion
} from "firebase/firestore"; 
import type { TaskStatus, LeaderTodo } from '../types/types';

// 💡 複数タブ起動時のプライマリーリース取得情報ログ（Failed to obtain primary lease）を抑制
setLogLevel('error');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,                                                                                                                                                  
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,                                                                                                                                          
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,                                                                                                                                            
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,                                                                                                                                    
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,                                                                                                                           
  appId: import.meta.env.VITE_FIREBASE_APP_ID,                                                                                                                                                    
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app); 

// 💡 Firebase SDK v10+ 推奨のマルチタブ対応 IndexedDB キャッシュ設定 (HMR 再読み込み時の二重初期化エラーを回避)
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

export { app, analytics };

export interface RespondSosResult {
  success: boolean;
  alreadyResponded?: boolean;
  responderName?: string;
}

// 状態と時間を一緒に更新する関数
export const updateTask = async (
  taskId: string, 
  data: { 
    status?: TaskStatus; 
    time?: string; // 変更された時間（例: "14:30" など）
  }
) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    
    // 更新内容をまとめる
    const updatePayload: any = {
      updatedAt: serverTimestamp(),
      ...data // status や time があれば追加される
    };

    await setDoc(taskRef, updatePayload, { merge: true });
  } catch (error) {
    console.error("タスクの更新に失敗しました:", error);
  }
};

// 看護師SOSの状態をFirestoreに同期・更新する関数
export const updateNurseSos = async (
  nurseId: string,
  data: {
    name?: string;
    is_sos: boolean;
    sos_reason?: string;
    responder_name?: string;
  }
) => {
  try {
    const nurseRef = doc(db, 'nurses', nurseId);
    await setDoc(
      nurseRef,
      {
        nurse_id: nurseId,
        is_sos: data.is_sos,
        sos_reason: data.sos_reason || '',
        responder_name: data.responder_name || '',
        updatedAt: serverTimestamp(),
        ...(data.name ? { name: data.name } : {}),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("看護師SOSの更新に失敗しました:", error);
  }
};

// 💡 看護師ピンのマップ座標 (x_percent, y_percent) をFirestoreに即座に保存・更新する関数
export const updateNursePositionInFirestore = async (
  nurseId: string,
  x_percent: number,
  y_percent: number
) => {
  if (!nurseId) return;
  try {
    const nurseRef = doc(db, 'nurses', nurseId);
    await setDoc(
      nurseRef,
      {
        nurse_id: nurseId,
        x_percent,
        y_percent,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("看護師ピンの位置更新に失敗しました:", error);
  }
};

import { getJSTDateString } from '../utils/dateUtils';

// 💡 看護師ごとの選択患者リスト（受け持ち割り当て）および本日セットアップ日付をFirestoreに保存・更新する関数
export const updateNurseAssignedPatients = async (
  nurseId: string,
  assignedPatients: string[]
) => {
  if (!nurseId) return;
  try {
    const todayStr = getJSTDateString(); // 🇯🇵 JST日付に統一
    const nurseRef = doc(db, 'nurses', nurseId);
    await setDoc(
      nurseRef,
      {
        nurse_id: nurseId,
        assigned_patients: assignedPatients,
        last_setup_date: todayStr,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("看護師の受け持ち患者更新に失敗しました:", error);
  }
};

/**
 * 💡 ユーザーログイン時に nurses コレクションへ自身のドキュメントを Upsert（更新または挿入）する関数。
 * すでに自分の nurse_id のドキュメントが存在する場合は位置情報(x_percent, y_percent)等を維持してログイン状態のみ更新、
 * 存在しない場合のみ新規作成（setDoc + merge: true）します。
 */
export const upsertNurseOnLogin = async (userProfile: {
  nurse_id: string;
  name: string;
  email?: string;
  role?: string;
  team?: string;
  is_leader?: boolean;
}) => {
  const nurseId = String(userProfile.nurse_id || '').trim();
  if (!nurseId) return;

  try {
    const nurseRef = doc(db, 'nurses', nurseId);
    const nurseSnap = await getDoc(nurseRef);

    if (nurseSnap.exists()) {
      // 既存ドキュメントが存在する場合：位置情報(x_percent, y_percent)は維持し、ログイン状態と更新日時のみ同期更新
      await setDoc(
        nurseRef,
        {
          nurse_id: nurseId,
          name: userProfile.name,
          email: userProfile.email || '',
          is_logged_in: true,
          updatedAt: serverTimestamp(),
          ...(userProfile.team ? { team: userProfile.team } : {}),
          ...(userProfile.is_leader !== undefined ? { is_leader: userProfile.is_leader } : {}),
        },
        { merge: true }
      );
      console.log(`✅ [NurseUpsert] 既存のナースピン(${nurseId})の位置情報を維持し、ログイン状態を更新しました`);
    } else {
      // ドキュメントが存在しない場合：デフォルト初期位置とともに新規作成
      await setDoc(
        nurseRef,
        {
          nurse_id: nurseId,
          name: userProfile.name,
          email: userProfile.email || '',
          role: userProfile.is_leader ? '日勤リーダー' : '日勤メンバー',
          is_leader: Boolean(userProfile.is_leader),
          color: userProfile.is_leader ? '#4F46E5' : '#059669',
          team: userProfile.team || 'Aチーム',
          assigned_patients: [],
          is_logged_in: true,
          is_sos: false,
          x_percent: 48.0,
          y_percent: 45.0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`✨ [NurseUpsert] ナースピン(${nurseId})を新規作成しました`);
    }
  } catch (error) {
    console.error("ナースログイン時のUpsert処理エラー:", error);
  }
};

// 💡 トランザクションを用いた競合回避付きSOS対応処理
export const respondToNurseSosWithTransaction = async (
  nurseId: string,
  responderName: string
): Promise<RespondSosResult> => {
  try {
    const nurseRef = doc(db, 'nurses', nurseId);

    const result = await runTransaction(db, async (transaction) => {
      const nurseDoc = await transaction.get(nurseRef);

      if (nurseDoc.exists()) {
        const data = nurseDoc.data();
        // すでに他のスタッフが対応済み（is_sosがfalse または responder_nameが存在する）場合
        if (data.is_sos === false || (data.responder_name && data.responder_name !== '')) {
          return {
            success: false,
            alreadyResponded: true,
            responderName: data.responder_name || '別のスタッフ',
          };
        }
      }

      // 未対応の場合、自分が第一対応者として原子的アトミック更新
      transaction.set(
        nurseRef,
        {
          nurse_id: nurseId,
          is_sos: false,
          sos_reason: '',
          responder_name: responderName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('トランザクション更新エラー:', error);
    return { success: false };
  }
};

// 💡 タスクSOSの状態をFirestoreに同期する関数
export const toggleTaskSosInFirestore = async (
  taskId: string,
  isSos: boolean,
  reason?: string,
  requestedById?: string,
  requestedByName?: string
) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await setDoc(
      taskRef,
      {
        is_sos: isSos,
        sos_reason: isSos ? (reason || 'タスクの支援要請が発生しました') : '',
        requested_by_id: isSos ? (requestedById || '') : '',
        requested_by_name: isSos ? (requestedByName || '') : '',
        responder_name: '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('タスクSOSの更新に失敗しました:', error);
  }
};

// 💡 トランザクションを用いた競合回避付きタスクSOS対応処理
export const respondToTaskSosWithTransaction = async (
  taskId: string,
  responderName: string
): Promise<RespondSosResult> => {
  try {
    const taskRef = doc(db, 'tasks', taskId);

    const result = await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);

      if (taskDoc.exists()) {
        const data = taskDoc.data();
        if (data.is_sos === false || (data.responder_name && data.responder_name !== '')) {
          return {
            success: false,
            alreadyResponded: true,
            responderName: data.responder_name || '別のスタッフ',
          };
        }
      }

      transaction.set(
        taskRef,
        {
          is_sos: false,
          sos_reason: '',
          requested_by_id: '',
          requested_by_name: '',
          responder_name: responderName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('タスクSOSトランザクション更新エラー:', error);
    return { success: false };
  }
};

// 💡 リーダーTODOのFirestore保存関数
export const saveLeaderTodoInFirestore = async (todoData: Omit<LeaderTodo, 'todo_id'>): Promise<string> => {
  try {
    const todosRef = collection(db, 'leader_todos');
    const newDocRef = doc(todosRef);
    const payload = {
      ...todoData,
      todo_id: newDocRef.id,
      updated_at: serverTimestamp(),
    };
    await setDoc(newDocRef, payload);
    return newDocRef.id;
  } catch (error) {
    console.error('リーダーTODOの保存に失敗しました:', error);
    throw error;
  }
};

// 💡 リーダーTODOのFirestore更新関数
export const updateLeaderTodoInFirestore = async (todoId: string, updatePayload: Partial<LeaderTodo>): Promise<void> => {
  try {
    const todoRef = doc(db, 'leader_todos', todoId);
    await setDoc(
      todoRef,
      {
        ...updatePayload,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('リーダーTODOの更新に失敗しました:', error);
    throw error;
  }
};

// 💡 リーダーTODOのFirestore論理削除（ソフトデリート）関数
export const deleteLeaderTodoInFirestore = async (todoId: string): Promise<void> => {
  try {
    const todoRef = doc(db, 'leader_todos', todoId);
    await setDoc(
      todoRef,
      {
        status: 'deleted',
        is_deleted: true,
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('リーダーTODOの論理削除に失敗しました:', error);
    throw error;
  }
};

// 💡 患者SOSの状態をFirestore (tasksコレクション内独立ドキュメント) にリアルタイム同期する関数
export const togglePatientSosInFirestore = async (
  patientId: string,
  patientName: string,
  roomId?: string,
  isSos: boolean = true,
  requestedById?: string,
  requestedByName?: string
) => {
  try {
    const docId = `patient-sos-${patientId}`;
    const taskRef = doc(db, 'tasks', docId);

    if (!isSos) {
      await deleteDoc(taskRef);
    } else {
      const sosReason = `🚨 緊急要請：${patientName}さん (${roomId ? `${roomId}号室` : ''}) で緊急応援要請`;
      await setDoc(
        taskRef,
        {
          task_id: docId,
          patient_id: patientId,
          patient_name: patientName,
          room_id: roomId || '',
          reason: sosReason,
          sos_reason: sosReason,
          requested_by_id: requestedById || '',
          requested_by_name: requestedByName || '',
          is_sos: true,
          is_patient_sos: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('患者SOSの更新に失敗しました:', error);
  }
};

// 💡 データが存在する稼働日（YYYY-MM-DD）をFirestoreの全端末共有ドキュメントに追加保存する関数
export const registerActiveDateInFirestore = async (dateStr: string): Promise<void> => {
  if (!dateStr) return;
  try {
    const metaRef = doc(db, 'tasks', 'system-active-dates');
    await setDoc(
      metaRef,
      {
        task_id: 'system-active-dates',
        is_active_dates: true,
        active_dates: arrayUnion(dateStr),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('稼働日アクティブ日付の追加登録に失敗しました:', error);
  }
};