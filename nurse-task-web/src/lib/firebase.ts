import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import type { TaskStatus } from '../types/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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