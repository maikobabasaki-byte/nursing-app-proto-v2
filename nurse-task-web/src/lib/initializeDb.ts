import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// JSONを読み込んで登録する関数
export const seedDatabase = async (jsonData: any[]) => {
  const tasksCollection = collection(db, "tasks");

  for (const task of jsonData) {
    await addDoc(tasksCollection, {
      title: task.title,
      patient_id: task.patient_id,
      patient_name: task.patient_name,
      status: task.status || "untouched",
      // ★ ここで最初から定義しておく（未設定なら空文字）
      display_period: task.display_period || "", 
      initial_period: task.initial_period || "",
      // ...他のフィールド
    });
  }
  console.log("データの投入が完了しました");
};