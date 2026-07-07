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

  // 検索ワードを管理するStateを追加
  const [searchWord, setSearchWord] = useState('');

  useEffect(() => {
    console.log("🚀 データ取得開始: /data/patients.json");
    // 🌟Promise.all を使って、患者データとタスクデータを同時に取得する
    Promise.all([
      fetch('/data/patients.json').then((res) => {
      if (!res.ok) throw new Error("patients.json が見つかりません");
      return res.json();
    }),
      fetch('/data/tasks.json').then((res) => {
      if (!res.ok) throw new Error("tasks.json が見つかりません");
      return res.json();
    })
    ])
      .then(([rawPatients, rawTasks]: [Patient[], Task[]]) => {
        
        // 1. 患者データにタスクデータを紐づける
        const mergedPatients = rawPatients.map(patient => {
          const myTasks = rawTasks.filter(task => task.patient_id === patient.patient_id);
          return {
            ...patient,
            tasks: myTasks
          };
        });

        // 2. 部屋番号 ➡️ ベッド番号の順でソート
        const sortedData = mergedPatients.sort((a, b) => {
          if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
          return a.bed_number - b.bed_number;
        });

        // 3. 選択された患者だけに絞り込む
        const filteredData = sortedData.filter((p) => selectedIds.includes(p.patient_id));
        console.log("🔍 紐付け後の患者データ例:", mergedPatients[0]);// 💡 これが出るか確認
        setPatients(filteredData);
      })
      .catch((err) => {
    console.error('❌ データ取得失敗:', err);
    alert("エラー: " + err.message + "\npublic/data/ フォルダにJSONがあるか確認してください！");
  });
        }, [selectedIds]);

// 🌟 3. 表示する直前で、検索ワードにヒットする患者だけに絞り込む
  const filteredPatients = patients.filter((patient) => {
    // 検索ワードが空なら全員表示
    if (!searchWord.trim()) return true;

    const word = searchWord.toLowerCase();

    // ① 患者名に検索ワードが含まれているか？
    const matchPatientName = patient.name.toLowerCase().includes(word);

    // ② タスク名（title）のなかに検索ワードが含まれているか？
    const matchTaskTitle = patient.tasks?.some((task) =>
      task.title.toLowerCase().includes(word)
    ) ?? false;

    // ①か②のどちらかがヒットすれば画面に残す
    return matchPatientName || matchTaskTitle;
  });

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 bg-slate-300 text-slate-800 font-sans overflow-y-auto">
      
      {/* ＝ 1. 上部サブステータスバー & 検索エリア ＝ */}
      <div className="flex flex-col gap-4 bg-white/50 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-h-[36px]">
          <div className="text-sm font-bold text-slate-700">
            <span className="text-cyan-700">総受け持ち数：{patients.length} 名</span>
            <span className="text-slate-400 mx-2">/</span>
            <span>タスク検索・抽出</span>
          </div>
          
          <div className="flex-1 flex justify-center w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="患者名、またはタスク名で検索" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full sm:w-64 !px-3 !py-1 !bg-white !border !border-slate-300 !rounded !text-sm !shadow-inner focus:!outline-none focus:!border-cyan-500"
            />
          </div>
          <div className="w-32 hidden lg:block"></div>
        </div>
      </div>

      {/* ＝ 2. 【検索時のみ出現】 上部の検索結果特設エリア ＝ */}
      {searchWord.trim() && (
        <div className="flex flex-col gap-3 bg-cyan-50/80 border border-cyan-200 rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between border-b border-cyan-200 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-900">
              <span className="text-base">🔍</span>
              <span>
                検索結果：「<span className="underline decoration-cyan-500 decoration-2">{searchWord}</span>」に該当（{filteredPatients.length} 名）
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setSearchWord('')}
              className="flex items-center gap-1 text-xs font-bold bg-white hover:bg-cyan-100 text-cyan-700 border border-cyan-300 rounded px-3 py-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <span>✕</span>
              <span>元の受け持ち一覧に戻す</span>
            </button>
          </div>

          {/* 検索結果のカード一覧 */}
          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-1">
              {filteredPatients.map((patient, index) => (
                <div key={`search-${patient.patient_id}`} className="bg-white rounded shadow-md border-2 border-cyan-400 flex flex-col min-h-[160px] overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex justify-between items-center bg-cyan-50 text-xs">
                    <span className="font-bold text-cyan-900 text-sm">
                      {patient.room_id}号室 ({patient.bed_number}) {patient.name} 様
                    </span>
                    {(patient.risk_level === '高' || patient.risk_level === 'high') && (
                      <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px] font-bold">転倒高リスク</span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2 justify-center text-sm font-medium">
                    {patient.tasks?.map((task, idx) => (
                      <div key={task.task_id || idx} className="flex items-center gap-2 text-slate-700">
                        <span className="w-12 text-xs text-slate-400 shrink-0">{task.display_period}</span>
                        <span className={task.title.toLowerCase().includes(searchWord.toLowerCase()) ? "bg-yellow-100 px-1 rounded font-bold text-cyan-900" : ""}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2 text-center">該当する患者・タスクは見つかりませんでした</p>
          )}
        </div>
      )}

      {/* 🌟 3. 【未検索時のみ表示】 下方の通常受け持ち一覧 */}
      {!searchWord.trim() && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-600 pl-1">
            本日の受け持ち患者一覧
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient, index) => (
              <div 
                key={`normal-${patient.patient_id}`} 
                className="bg-white rounded shadow-sm border border-slate-200 flex flex-col min-h-[160px] overflow-hidden opacity-95"
              >
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-xs">
                  <span className="text-slate-400 font-mono">{`[Alt+${index + 1}]`}</span>
                  <span className="font-bold text-slate-700 text-sm">
                    {patient.room_id}号室 ({patient.bed_number}) {patient.name} 様
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2 justify-center text-sm font-medium">
                  {patient.tasks && patient.tasks.length > 0 ? (
                    patient.tasks.map((task, idx) => {
                      const isUnrecorded = task.status === 'completed';
                      const isRecorded = task.status === 'record_complete';
                      let textColor = 'text-slate-700';
                      if (isUnrecorded) textColor = 'text-sky-600 font-bold';
                      if (isRecorded)   textColor = 'text-sky-300/80';

                      return (
                        <div key={task.task_id || idx} className={`flex items-center gap-2 ${textColor}`}>
                          {isUnrecorded ? <span className="text-sky-500 text-xs shrink-0">●</span> : <span className="w-2 shrink-0"></span>}
                          <span className={`w-12 text-xs shrink-0 ${isUnrecorded ? 'text-sky-500' : isRecorded ? 'text-sky-200' : 'text-slate-400'}`}>
                            {task.display_period}
                          </span>
                          <span>{task.title}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic text-center">本日のタスクなし</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}