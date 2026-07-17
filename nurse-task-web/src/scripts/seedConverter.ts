import type{ TaskDocument } from "../types/types"; // 型定義をインポート

// JSONデータ（インポート）
import tasksData from "../../public/data/tasks.json"; // タスクのダミーデータ
import patientsData from "../../public/data/patients.json";
import roomsData from "../../public/data/rooms.json"; // { rooms: [], facilities: [] }

export const prepareTasksForFirestore = (): TaskDocument[] => {
  // 施設情報と部屋情報を統合して検索しやすくする
  const allRooms = [...roomsData.rooms, ...roomsData.facilities];

  return tasksData.map((task: any) => {
    // 患者情報を取得
    const patient = patientsData.find(p => p.patient_id === task.patient_id);
    // 部屋情報を取得
    const room = allRooms.find(r => r.room_id === task.room_id);

    // 変換後のオブジェクト
    const integratedTask: TaskDocument = {
      task_id: task.task_id,
      title: task.title,
      details: task.details,
      status: task.status,
      display_period: task.display_period || "", 
      initial_period: task.initial_period || "",
      priority: task.priority as 'high' | 'medium' | 'low',
      scheduled_at: task.scheduled_at,
      patient_id: task.patient_id,
      room_id: task.room_id,
      patient_name: patient?.name || "氏名不明", // 見つからない場合のフォールバック
      parent_id: null, // 初期値
      is_sos: false,   // デフォルト値
      sos_reason: "",  // デフォルト値
    };

    return integratedTask;
  });
};