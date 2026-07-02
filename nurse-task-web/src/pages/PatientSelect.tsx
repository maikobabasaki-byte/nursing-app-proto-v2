import { useState, useEffect } from 'react';

/**
 * 患者データの基本構造を定義する設計図（インターフェース）
 */
interface Patient {
  patient_id: string;
  name: string;
  adl: string;
  risk_level: string;
  allergy: string;
  room_id: string;
  bed_number: number;
  team: string;
}

interface PatientSelectProps {
  /**
   * 患者の選択が完了したときに呼び出されるコールバック関数
   * @param selectedPatients 画面で選択された患者ID（文字列）の配列
   */
  onSelectComplete: (selectedPatients: string[]) => void;
}

/**
 * 担当患者を選択する画面コンポーネント
 */
export default function PatientSelect({ onSelectComplete }: PatientSelectProps) {
  const [role, setRole] = useState('member');
  const [patients, setPatients] = useState<Patient[]>([]);

  // 選択された患者のIDを記録するステート
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  /**
   * 【画面起動時の初期化処理（マウント時のみ実行）】
   * 1. 患者データ（JSON）の非同期取得
   * 2. 取得した患者データを「病室順 ➔ ベッド番号順」に自動並び替え（ソート）
   */
  // useEffectとは、「関数の実行タイミングをReactのレンダリング後まで遅らせるhook」のこと。副作用（サイドエフェクト）を扱うための仕組み。
  useEffect(() => {
    // --- 患者データの取得と並び替え ---
    fetch('/data/patients.json')
      .then((res) => res.json())
      .then((data: Patient[]) => {
        // 看護現場で使いやすいよう、病室（room_id）順、同室ならベッド番号順にソート
                            // [...data]スプレッド構文。届いたオリジナルデータを、新しい配列に丸ごとコピー（複製）。
                            // .sort() は、元のデータを直接書き換えてしまう性質（破壊的メソッド）があるため、コピーしてからソートすることで、元データを壊さないようにしている。
        const sortedData = [...data].sort((a, b) => {
          // まず病室IDで比較（文字列比較）               // localeCompare：文字列（例: "room_401" と "room_402"）を「あいうえお順・アルファベット順」に比べるための命令
          if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
          // 病室が同じなら、ベッド番号（数値）の昇順で比較
          return a.bed_number - b.bed_number;
        });
        // ソート済みのデータをStateに保存
        setPatients(sortedData);
      })
      // .catch(...)：もしファイルが存在しなかったり、通信エラーが起きたときに、アプリがフリーズしないようコンソールにエラー原因を書き残す保険の処理
      .catch((err) => console.error('データ読み込みエラー:', err));
  }, []); // 依存配列が空のため、コンポーネントが最初に表示された1回だけ実行される

  /**
   * 個人のチェックボックスがクリックされたときの処理
   * * 【トグル動作】
   * すでに選択リストにあれば「消しゴムで消す（削除）」、なければ「末尾に書き足す（追加）」を行います。
   * * @param patientId クリックされた患者の固有ID
   */
  const handlePatientCheck = (patientId: string) => {
    // 1. 現在選択されているIDリストの中に、今クリックされたIDがすでに含まれているか？を判定
    if (selectedPatientIds.includes(patientId)) {
      // 【選択解除】
      // 含まれていたなら、filterを使って「このID以外」を残した新しいリストを作り直してStateを更新
      setSelectedPatientIds(selectedPatientIds.filter(id => id !== patientId));
    } else {
      // 【新規選択】
      // 含まれていなかったら、スプレッド構文（...）を使ってこれまでのリストの末尾にこのIDを追加してStateを更新
      setSelectedPatientIds([...selectedPatientIds, patientId]);
    }
  };

  /**
   * 部屋ごとの一括チェックボックスがクリックされたときの処理
   * * 【一括ON/OFF動作】
   * その部屋の全員にチェックがあれば「部屋ごと一括解除」、1人でも未チェックがいれば「部屋ごと全員選択」にします。
   * * @param roomId クリックされた病室のID（例: "401"）
   */
  const handleRoomCheck = (roomId: string) => {
    // 1. 全患者の中から、この部屋（roomId）に入院している患者のIDだけをガサッと抽出してリスト化
    const roomPatientIds = patients
      .filter(p => p.room_id === roomId)
      .map(p => p.patient_id);

    // 2. 「この部屋の全員」が、すでに自分の選択リスト（selectedPatientIds）に入っているかを判定
    const isAllChecked = roomPatientIds.every(id => selectedPatientIds.includes(id));

    if (isAllChecked) {
      // 【部屋ごと一括解除】
      // すでに全員選ばれている状態なら、現在の選択リストから「この部屋のメンバーのID」だけを綺麗に排除する
      setSelectedPatientIds(selectedPatientIds.filter(id => !roomPatientIds.includes(id)));
    } else {
      // 【部屋ごと全員選択（漏れ防止）】
      // 1人でも選ばれていない人がいるなら、一度現在のリストからこの部屋のメンバーを引いて（重複防止）、
      // 「他の部屋の選択中メンバー」＋「この部屋の全員」を綺麗に合体させる
      const otherPatientIds = selectedPatientIds.filter(id => !roomPatientIds.includes(id));
      setSelectedPatientIds([...otherPatientIds, ...roomPatientIds]);
    }
  };

  /**
   * リーダーモード等で「病棟全体」を一括チェックしたときの処理
   * * 【病棟全体の一括ON/OFF動作】
   * チェックボックスがONになったら全患者のIDをリストに叩き込み、OFFになったらリストを空っぽにします。
   * * @param checked チェックボックスの現在の状態（true: ON / false: OFF）
   */
  const handleSelectAllPatients = (checked: boolean) => {
    // 1. チェックボックスがON（true）になったかどうかを判定
    if (checked) {
      // 【全体一括選択】
      // 全患者データ（patients）から、mapを使って「全員分のID」だけを集めた配列を作成
      const allIds = patients.map(p => p.patient_id);
      // 全員のIDをそのまま選択リストに上書き保存する
      setSelectedPatientIds(allIds);
    } else {
      // 【全体一括解除】
      // チェックボックスがOFFになったら、選択リストに空の配列（[]）を渡して完全にリセットする
      setSelectedPatientIds([]);
    }
  };

  /**
   * 🛠️ 👥 チームごと（Aチーム / Bチームなど）の一括チェックボックスがクリックされたときの処理
   * * 【チーム一括ON/OFF動作】
   * そのチームの全員にチェックがあれば「チームごと一括解除」、1人でも未チェックがいれば「チームごと全員選択」にします。
   * * @param teamName クリックされたチーム名（例: "A", "B"）
   */
  const handleTeamCheck = (teamName: string) => {
    // 1. 全患者の中から、指定されたチーム（teamName）に所属する患者のIDだけをガサッと抽出してリスト化
    // ※今後、Patientインターフェースに「team: string」が追加される前提の処理です
    const teamPatientIds = patients
      .filter(p => p.team === teamName)
      .map(p => p.patient_id);

    // 2. 「そのチームの全員」が、すでに自分の選択リスト（selectedPatientIds）に入っているかを判定
    const isAllChecked = teamPatientIds.every(id => selectedPatientIds.includes(id));

    if (isAllChecked) {
      // 【チームごと一括解除】
      // すでに全員選ばれている状態なら、現在の選択リストから「このチームのメンバーのID」だけを綺麗に排除する
      setSelectedPatientIds(selectedPatientIds.filter(id => !teamPatientIds.includes(id)));
    } else {
      // 【チームごと全員選択（漏れ防止）】
      // 1人でも選ばれていない人がいるなら、一度現在のリストからこのチームのメンバーを引いて（重複防止）、
      // 「他のチームの選択中メンバー」＋「このチームの全員」を綺麗に合体させる
      const otherPatientIds = selectedPatientIds.filter(id => !teamPatientIds.includes(id));
      setSelectedPatientIds([...otherPatientIds, ...teamPatientIds]);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center">
        
        {/* 🔘 メンバー / リーダー 切り替え */}
        <div className="bg-sky-100 w-[24em] h-[3em] rounded-4xl m-4 flex justify-evenly !items-center">
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`w-[8em] h-[2em] flex items-center justify-center text-gray-700 cursor-pointer font-medium transition-all leading-none ${
              role === 'member' ? '!bg-white font-bold shadow-sm !rounded-4xl ' : ''
            }`}
          >
            メンバー
          </button>
          <button
            type="button"
            onClick={() => setRole('leader')}
            className={`w-[8em] h-[2em] flex items-center justify-center text-gray-700 cursor-pointer font-medium transition-all leading-none ${
              role === 'leader' ? '!bg-white font-bold shadow-sm !rounded-4xl ' : ''
            }`}
          >
            リーダー
          </button>
        </div>
      
        <div id="member-selection" className="text-gray-700 bg-sky-100 w-[40em] flex flex-col items-center rounded-[10px] p-4">
          <p className="p-[0.3em] font-bold">
            {role === 'member' ? '患者選択' : 'チーム全体表示'}
          </p>

          {/* メンバーモード */}
          {role === 'member' && (
            <div id="patient-list-container" className="w-100 max-h-[40vh] overflow-y-auto border border-[#ddd] rounded-[8px] bg-white text-gray-800">
              {patients.map((patient, index) => {
                    // 1. 【部屋の切り替わり判定】
                    // 名簿の一番最初（index が 0）であるか、または「1個前の患者の病室ID」と「今の患者の病室ID」が違う場合、
                    // そこが新しい病室の始まり（1人目の住人）となるため true になる。
                    const isFirstInRoom = index === 0 || patients[index - 1].room_id !== patient.room_id;

                    // 2. 【この部屋の住人リスト作成】
                    // 現在注目している部屋（patient.room_id）と同じ部屋にいる患者全員のIDをガサッと集めて配列にする。
                    const roomPatientIds = patients.filter(p => p.room_id === patient.room_id).map(p => p.patient_id);

                    // 3. 【部屋ごと一括チェックの状態判定】
                    // 集めた「この部屋の住人全員」が、現在の選択リスト（selectedPatientIds）に漏れなく含まれているかを判定する。
                    const isRoomAllChecked = roomPatientIds.every(id => selectedPatientIds.includes(id));

                    return (
                      <div key={patient.patient_id}>
                        {/* 🏢 部屋番号の見出し行 */}
                        {/* isFirstInRoom が true（その部屋の1人目の患者）の時だけ、部屋ごとのヘッダー行を自動で差しこむ */}
                        {isFirstInRoom && (
                          <div className="flex items-center gap-3.75 py-2 px-5 bg-[#f0f8fa] border-b border-[#eee] font-bold text-[#1A365D] text-[1.1rem]">
                            <input 
                              type="checkbox"
                              id={`room-${patient.room_id}`}
                              checked={isRoomAllChecked}
                              onChange={() => handleRoomCheck(patient.room_id)}
                              className="w-5 h-5 m-0 cursor-pointer shrink-0 border border-gray-400 rounded accent-[#1A365D] !appearance-auto"
                            />
                            <label htmlFor={`room-${patient.room_id}`} className="cursor-pointer select-none">
                              {patient.room_id} 号室
                            </label>
                          </div>
                        )}
                        
                    
                    {/* 患者個人の行 */}
                    <div className="flex items-center gap-3.75 py-3 pr-5 pl-11 bg-white border-b border-[#eee] hover:bg-[#f9f9f9] transition-colors">
                      <input 
                        type="checkbox" 
                        id={`patient-${patient.patient_id}`}
                        checked={selectedPatientIds.includes(patient.patient_id)}
                        onChange={() => handlePatientCheck(patient.patient_id)}
                        className="w-5 h-5 m-0 cursor-pointer shrink-0 border border-gray-400 rounded accent-[#1A365D] !appearance-auto" 
                      />
                      <label 
                        htmlFor={`patient-${patient.patient_id}`} 
                        className="flex-1 flex items-center cursor-pointer select-none"
                      >
                        <span className="text-[1.1rem] font-medium text-gray-500 w-[2em] shrink-0">
                          {patient.bed_number}
                        </span>
                        <span className="text-[1.1rem] font-bold text-[#333]">
                          {patient.name} 様
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* リーダーモード */}
          {role === 'leader' && (
            <div id="team-selection-container" className="py-[2.5em] px-[3em] flex flex-col gap-5 bg-white border border-[#ddd] rounded-[8px] text-gray-800">
              <div className="flex flex-col gap-4">
                {/* 全体チーム */}
                <div className="flex items-center gap-[15px] py-[10px] px-[15px] bg-[#f0f8fa] rounded-[6px] hover:bg-[#e6f4f7] transition-colors">
                  <input 
                    type="checkbox" 
                    id="team-all"
                    checked={patients.length > 0 && selectedPatientIds.length === patients.length}
                    onChange={(e) => handleSelectAllPatients(e.target.checked)}
                    className="w-[22px] h-[22px] m-0 cursor-pointer flex-shrink-0 border border-gray-400 rounded accent-[#1A365D] !appearance-auto" 
                  />
                  <label htmlFor="team-all" className="flex-1 cursor-pointer select-none text-[1.1rem] font-bold text-[#1A365D]">
                    病棟全体（すべてのチーム）
                  </label>
                </div>

                {/* Aチーム / Bチーム（モック） */}
                <div className="flex items-center gap-[15px] py-[10px] px-[15px] border border-[#eee] rounded-[6px] hover:bg-[#f9f9f9] transition-colors">
                  <input 
                    type="checkbox" 
                    id="team-a" 
                    checked={patients.filter(p => p.team === 'A').length > 0 && patients.filter(p => p.team === 'A').every(p => selectedPatientIds.includes(p.patient_id))}
                    onChange={() => handleTeamCheck('A')} // 💡 ここで関数を呼び出す
                    className="w-[22px] h-[22px] accent-[#1A365D] !appearance-auto" 
                  />
                  <label htmlFor="team-a" className="flex-1 cursor-pointer text-[1.1rem] font-bold text-gray-700">Aチーム</label>
                </div>
                <div className="flex items-center gap-[15px] py-[10px] px-[15px] border border-[#eee] rounded-[6px] hover:bg-[#f9f9f9] transition-colors">
                  <input 
                    type="checkbox" 
                    id="team-b" 
                    checked={patients.filter(p => p.team === 'B').length > 0 && patients.filter(p => p.team === 'B').every(p => selectedPatientIds.includes(p.patient_id))}
                    onChange={() => handleTeamCheck('B')} // 💡 ここで関数を呼び出す
                    className="w-[22px] h-[22px] accent-[#1A365D] !appearance-auto" 
                  />
                  <label htmlFor="team-b" className="flex-1 cursor-pointer text-[1.1rem] font-bold text-gray-700">Bチーム</label>
                </div>
              </div>
            </div>
          )}
          
          {/* タスク取得ボタン */}
          <button 
            id="get-task-btn" 
            className="text-[1.25em] !bg-[#1A365D] !text-white rounded-[10px] !p-[0.5em] !mt-[1em] !rounded w-fit text-center !font-bold hover:bg-[#112540] transition-colors mt-4"
            onClick={() => onSelectComplete(selectedPatientIds)} 
          >
            タスク取得（タイムライン表示）
          </button>
        </div>
      </div>
    </>
  );
}