import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, updateDoc, setDoc, runTransaction, collection, serverTimestamp } from "firebase/firestore"; 
import type { TaskStatus, LeaderTodo } from '../types/types';

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
export const db = getFirestore(app);
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

    await updateDoc(taskRef, updatePayload);
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

// 💡 看護師ごとの選択患者リスト（受け持ち割り当て）をFirestoreに保存・更新する関数
export const updateNurseAssignedPatients = async (
  nurseId: string,
  assignedPatients: string[]
) => {
  if (!nurseId) return;
  try {
    const nurseRef = doc(db, 'nurses', nurseId);
    await setDoc(
      nurseRef,
      {
        nurse_id: nurseId,
        assigned_patients: assignedPatients,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("看護師の受け持ち患者更新に失敗しました:", error);
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