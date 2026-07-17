import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const updateTask = async (
  taskId: string, 
  data: { status?: string; time?: string } // ここで引数を定義
) => {
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      console.log(`タスク ${taskId} を ${newStatus} に更新しました`);
    } catch (error) {
      console.error("更新エラー:", error);
    }
  };

  return { updateTaskStatus };
};