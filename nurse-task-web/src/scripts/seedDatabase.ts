import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { prepareTasksForFirestore } from "./seedConverter";

export const seedDatabase = async () => {
  const tasks = prepareTasksForFirestore();
  const batch = writeBatch(db);
  const tasksRef = collection(db, "tasks");

  tasks.forEach((task) => {
    // task_id をドキュメントIDとして使用
    const docRef = doc(tasksRef, task.task_id);
    batch.set(docRef, task);
  });

  try {
    await batch.commit();
    console.log(`完了: ${tasks.length} 件のタスクを投入しました。`);
  } catch (error) {
    console.error("投入エラー:", error);
  }
};