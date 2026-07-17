import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import type { TaskStatus } from '../types/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-JC9si3Oawa9yGswP9mDHXkrBpN-J1Dw",
  authDomain: "nursing-task-app.firebaseapp.com",
  projectId: "nursing-task-app",
  storageBucket: "nursing-task-app.firebasestorage.app",
  messagingSenderId: "586377660681",
  appId: "1:586377660681:web:beadc127edf565d7bc2bd8",
  measurementId: "G-FDPWTSC6MG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app); 
export const db = getFirestore(app);
export { app, analytics };


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