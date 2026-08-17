import { useState, useEffect, useMemo } from 'react';
import { useTimelineStore } from '../stores/useTimelineStore';
import { checkIsLeader } from '../utils/userUtils';
import { normalizeToHHMM, flattenTasks, sortTasksChronologically } from '../utils/taskLogic';

// --- 型定義 ---
interface Patient {
  patient_id: string;
  name: string;
  gender?: string;
  adl: string;
  risk_level: string;
  allergy: string;
  room_id: string;
  bed_number: number;
  tasks?: Task[];
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
  const [rawPatients, setRawPatients] = useState<Patient[]>([]);
  const allTasks = useTimelineStore((state) => state.allTasks);
  const currentUser = useTimelineStore((state) => state.currentUser);

  // 検索ワードを管理するStateを追加
  const [searchWord, setSearchWord] = useState('');

  // 親グループを展開（フラット化）したタスク一覧を作成
  const flatTasks = useMemo(() => {
    return flattenTasks(allTasks);
  }, [allTasks]);

  // 💡 ゲスト判定およびリーダー/メンバー判定（is_guest_session / isAnonymous のみで厳密評価）
  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true
  );
  const isLeader = checkIsLeader(currentUser);

  // 1. マウント時に患者マスタの静的データだけを取得 (プロダクション /app/ パス対応)
  useEffect(() => {
    const candidatePaths = [
      `/app/data/patients.json`,
      `${import.meta.env.BASE_URL || '/app/'}data/patients.json`.replace(/\/+/g, '/'),
      `/data/patients.json`,
    ];
    const loadData = async () => {
      for (const path of candidatePaths) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setRawPatients(data);
              return;
            }
          }
        } catch (e) {}
      }
      console.error('❌ 患者データ取得失敗');
    };
    loadData();
  }, []);

  // 2. リアルタイムのタスクデータと結合し、フィルタリング・ソートを行う
  const patients = useMemo(() => {
    // 💡 rawPatients をベースとし、flatTasks から動的に患者情報を補完
    const patientMap = new Map<string, Patient>();
    rawPatients.forEach((p) => patientMap.set(p.patient_id, p));

    // タスクが存在する動的患者情報（GASコピー結果）をマップへ登録
    flatTasks.forEach((t) => {
      if (t.patient_id && !patientMap.has(t.patient_id)) {
        patientMap.set(t.patient_id, {
          patient_id: t.patient_id,
          name: t.patient_name || `患者 (${t.patient_id})`,
          room_id: t.room_id || '',
          bed_number: 1,
          adl: '要観察',
          risk_level: '中',
          allergy: 'なし',
        });
      }
    });

    const allPatientsList = Array.from(patientMap.values());
    if (allPatientsList.length === 0) return [];

    const mergedPatients = allPatientsList.map((patient) => {
      // 親グループが展開されたフラットなタスク群から該当患者のタスクを紐付け
      const myTasks = flatTasks.filter((task) => {
        if (task.patient_id !== patient.patient_id || task.status === 'deleted') return false;
        // 💡 ゲストユーザー時はゲスト作成タスクのみ抽出（正規タスクとの二重混在を排除）
        if (isGuestUser) {
          const isGuestTask = task.task_id?.startsWith('GUEST-') || task.nurse_id === currentUser?.nurse_id || task.assigned_nurse_id === currentUser?.nurse_id || (task as any).is_guest === true;
          if (!isGuestTask) return false;
        }
        return true;
      }) as any[];

      // 💡 タスクの二重重複表示を防止（正規化時間 + トリムタイトル + patient_id でアトミック重複除去）
      const seenTaskKeys = new Set<string>();
      const deduplicatedMyTasks = myTasks.filter((t) => {
        const normTime = normalizeToHHMM(t.display_period);
        const normTitle = (t.title || '').trim();
        const key = `${t.patient_id}_${normTitle}_${normTime}`;
        if (seenTaskKeys.has(key)) return false;
        seenTaskKeys.add(key);
        return true;
      });

      // 💡 朝から順（時系列昇順）にカスタムソートを適用
      const sortedTasks = sortTasksChronologically(deduplicatedMyTasks);
      return {
        ...patient,
        tasks: sortedTasks,
      };
    });

    // 🎯 1. ユーザー選択（selectedIds）の優先フィルタリング
    let filteredBySelection = mergedPatients;
    if (selectedIds && selectedIds.length > 0) {
      filteredBySelection = mergedPatients.filter((p) => selectedIds.includes(p.patient_id));
    } else {
      filteredBySelection = mergedPatients.filter((p) => p.tasks && p.tasks.length > 0);
    }

    // 🎯 2. ゲストメンバーの場合：タイムライン画面と完全同期し、202号室・203号室の患者のみ表示
    let finalPatients = filteredBySelection;
    if (isGuestUser && !isLeader) {
      finalPatients = filteredBySelection.filter((p) => {
        return p.room_id === '202' || p.room_id === '203' || p.room_id?.includes('202') || p.room_id?.includes('203');
      });
    }

    // 部屋番号 ➡️ ベッド番号の順でソート
    return finalPatients.sort((a, b) => {
      if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
      return a.bed_number - b.bed_number;
    });
  }, [rawPatients, flatTasks, selectedIds, currentUser, isGuestUser, isLeader]);

// 🌟 3. 表示する直前で、検索ワードにヒットする患者だけに絞り込む
  const filteredPatients = patients.filter((patient) => {
    // 検索ワードが空なら全員表示
    if (!searchWord.trim()) return true;

    const word = searchWord.toLowerCase();

    // ① 患者名に検索ワードが含まれているか？
    const matchPatientName = patient.name.toLowerCase().includes(word);

    // ② タスク名（title）のなかに検索ワードが含まれているか？
    const matchTaskTitle = patient.tasks?.some((task: Task) =>
      task.title.toLowerCase().includes(word)
    ) ?? false;

    // ①か②のどちらかがヒットすれば画面に残す
    return matchPatientName || matchTaskTitle;
  });

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 bg-slate-300 text-slate-800 font-sans overflow-y-auto">
      
      {/* ＝ 1. 上部サブステータスバー & 検索エリア ＝ */}
      <div id="patient-master-header" className="flex flex-col gap-4 bg-white/50 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-h-[36px]">
          <div className="text-sm font-bold text-slate-700">
            <span className="text-cyan-700">総受け持ち数：{patients.length} 名</span>
            <span className="text-slate-400 mx-2">/</span>
            <span>タスク検索・抽出</span>
          </div>
          
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 w-full sm:w-auto">
            <input 
              id="patient-master-search"
              type="text" 
              maxLength={30}
              placeholder="患者名、またはタスク名で検索" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full sm:w-64 !px-3 !py-1 !bg-white !border !border-slate-300 !rounded !text-sm !shadow-inner focus:!outline-none focus:!border-cyan-500"
            />
            {searchWord.length > 0 && (
              <span className={`text-xs font-mono select-none ${searchWord.length >= 30 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                {searchWord.length}/30
              </span>
            )}
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
              {filteredPatients.map((patient) => (
                <div key={`search-${patient.patient_id}`} className="bg-white rounded shadow-md border-2 border-cyan-400 flex flex-col min-h-[160px] overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-col gap-1.5 bg-cyan-50 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-900 text-sm">
                        {patient.room_id}号室 ({patient.bed_number}) {patient.name} 様
                      </span>
                    </div>
                    {/* 💡 属性タグバー（絵文字なし・洗練されたフラットカラーデザイン） */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {patient.gender && (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                          patient.gender === '男' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                          {patient.gender === '男' ? '男' : '女'}
                        </span>
                      )}
                      {patient.adl && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                          ADL: {patient.adl}
                        </span>
                      )}
                      {patient.risk_level && (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] border ${
                          patient.risk_level === '高' || patient.risk_level === 'high' 
                            ? 'bg-red-50 text-red-700 border-red-200 font-bold' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          リスク: {patient.risk_level === 'high' ? '高' : patient.risk_level}
                        </span>
                      )}
                      {patient.allergy && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          アレルギー: {patient.allergy}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2 justify-center text-sm font-medium">
                    {patient.tasks?.map((task: Task, idx: number) => (
                      <div key={task.task_id || idx} className="flex items-center gap-2 text-slate-700">
                        <span className="w-12 text-xs text-slate-400 shrink-0">{normalizeToHHMM(task.display_period)}</span>
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
          
          <div id="patient-master-cards-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 tutorial-patient-master">
            {patients.map((patient, index) => (
              <div 
                key={`normal-${patient.patient_id}`} 
                className="bg-white rounded shadow-sm border border-slate-200 flex flex-col min-h-[160px] overflow-hidden opacity-95"
              >
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-col gap-1.5 bg-slate-50/70 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-mono">{`[Alt+${index + 1}]`}</span>
                    <span className="font-bold text-slate-700 text-sm">
                      {patient.room_id}号室 ({patient.bed_number}) {patient.name} 様
                    </span>
                  </div>
                  {/* 💡 属性タグバー（絵文字なし・洗練されたフラットカラーデザイン） */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {patient.gender && (
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                        patient.gender === '男' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                      }`}>
                        {patient.gender === '男' ? '男' : '女'}
                      </span>
                    )}
                    {patient.adl && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                        ADL: {patient.adl}
                      </span>
                    )}
                    {patient.risk_level && (
                      <span className={`px-1.5 py-0.5 rounded text-[11px] border ${
                        patient.risk_level === '高' || patient.risk_level === 'high' 
                          ? 'bg-red-50 text-red-700 border-red-200 font-bold' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        リスク: {patient.risk_level === 'high' ? '高' : patient.risk_level}
                      </span>
                    )}
                    {patient.allergy && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        アレルギー: {patient.allergy}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2 justify-center text-sm font-medium">
                  {patient.tasks && patient.tasks.length > 0 ? (
                    patient.tasks.map((task: Task, idx: number) => {
                      const isUnrecorded = task.status === 'completed';
                      const isRecorded = task.status === 'record_complete';
                      let textColor = 'text-slate-700';
                      if (isUnrecorded) textColor = 'text-sky-600 font-bold';
                      if (isRecorded)   textColor = 'text-sky-300/80';

                      return (
                        <div key={task.task_id || idx} className={`flex items-center gap-2 ${textColor}`}>
                          {isUnrecorded ? <span className="text-sky-500 text-xs shrink-0">●</span> : <span className="w-2 shrink-0"></span>}
                          <span className={`w-12 text-xs shrink-0 ${isUnrecorded ? 'text-sky-500' : isRecorded ? 'text-sky-200' : 'text-slate-400'}`}>
                            {normalizeToHHMM(task.display_period)}
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