import { useState, useEffect } from 'react';

// --- 型定義 ---
interface Patient {
  patient_id: string;
  name: string;
  adl: string;
  risk_level: string;
  allergy: string;
  room_id: string;
  bed_number: number;
  tasks?: Task[]; // 💡 紐づけたタスクを格納する場所をオプショナルで定義
}

interface Task {
  task_id: string;
  title: string;
  details: string;
  status: 'untouched' | 'progressing' | 'completed' | 'record_complete'; // 💡 JSONのステータス名に合わせる
  priority: string;
  display_period: string; // "10:00" など
  patient_id: string;
}

interface DashboardProps {
  selectedIds: string[];
}

export default function PatientMasterPage({ selectedIds }: DashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
  fetch('/data/patients.json')
    .then((res) => res.json())
    .then((rawContents: any[]) => {
      // 1. 配列の中から「患者」と「タスク」をきれいに分離する
      const rawPatients: Patient[] = rawContents.filter(item => item.patient_id && item.name);
      const rawTasks: Task[] = rawContents.filter(item => item.task_id);

      // 💡 2. 日付での絞り込みはせず、JSONにあるタスクをそのまま患者IDで紐づける
      const mergedPatients = rawPatients.map(patient => {
        const myTasks = rawTasks.filter(task => task.patient_id === patient.patient_id);
        return {
          ...patient,
          tasks: myTasks
        };
      });

      // 3. 部屋番号 ➡️ ベッド番号の順でソート
      const sortedData = mergedPatients.sort((a, b) => {
        if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
        return a.bed_number - b.bed_number;
      });

      // 4. 親から渡された selectedIds（選ばれた患者）だけに絞り込む
      const filteredData = sortedData.filter((p) => selectedIds.includes(p.patient_id));
      setPatients(filteredData);
    })
    .catch((err) => console.error('データ読み込みエラー:', err));
}, [selectedIds]);

  return (
    <main className="flex-1 p-6 flex flex-col gap-4 bg-slate-300 text-slate-800 font-sans overflow-y-auto">
      
      {/* 上部サブステータスバー */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-h-[36px]">
        <div className="text-sm font-bold text-slate-700">
          <span className="text-cyan-600">表示中：{patients.length} 名</span>
          <span className="text-slate-400 mx-2">/</span>
          <span>選択された患者のタスク一覧</span>
        </div>
        <div className="flex-1 flex justify-center w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="クイック検索" 
            className="w-full sm:w-64 px-3 py-1 bg-white border border-slate-300 rounded text-sm text-center shadow-inner focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="w-32 hidden lg:block"></div>
      </div>

      {/* 患者カード一覧（3列グリッド） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
        {patients.map((patient, index) => (
          <div 
            key={patient.patient_id} 
            className="bg-white rounded shadow-sm border border-slate-200 flex flex-col min-h-[160px] overflow-hidden"
          >
            {/* カード上部：部屋・ベッド番号・氏名 */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-xs">
              <span className="text-slate-400 font-mono">{`[Alt+${index + 1}]`}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-sm">
                  {patient.room_id}号室 ({patient.bed_number}床) {patient.name} 様
                </span>
                {patient.risk_level === '高' || patient.risk_level === 'high' ? (
                  <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px] font-bold">
                    転倒高リスク
                  </span>
                ) : null}
              </div>
            </div>

            {/* カード下部：紐づいたタスクのスケジュール表示 */}
            <div className="p-4 flex-1 flex flex-col gap-2 justify-center text-sm font-medium">
              {patient.tasks && patient.tasks.length > 0 ? (
                patient.tasks.map((task, idx) => {
                  
                  // 💡 JSONのステータス名に合わせた見た目の判定
                  const isUnrecorded = task.status === 'completed';       // 実施完了・記録未（青丸・青文字）
                  const isRecorded = task.status === 'record_complete';   // 記録完了（薄い青）

                  // 💡 ステータスに応じた文字色の切り替え
                  let textColor = 'text-slate-700'; // 未着手 (untouched / progressing)
                  if (isUnrecorded) textColor = 'text-sky-600 font-bold';
                  if (isRecorded)   textColor = 'text-sky-300/80';

                  return (
                    <div key={task.task_id || idx} className={`flex items-center gap-2 ${textColor}`}>
                      
                      {/* 青丸の出し分け */}
                      {isUnrecorded ? (
                        <span className="text-sky-500 text-xs shrink-0">●</span>
                      ) : (
                        <span className="w-2 shrink-0"></span>
                      )}

                      {/* 時間表示（JSONの display_period を使用） */}
                      <span className={`w-12 text-xs shrink-0 ${
                        isUnrecorded ? 'text-sky-500' : isRecorded ? 'text-sky-200' : 'text-slate-400'
                      }`}>
                        {task.display_period}
                      </span>

                      {/* タスク名（JSONの title を使用） */}
                      <span>{task.title}</span>
                      
                    </div>
                  );
                })
              ) : (
                // タスクが本当に1件もない場合の表示
                <span className="text-xs text-slate-400 italic text-center">本日のタスクなし</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}