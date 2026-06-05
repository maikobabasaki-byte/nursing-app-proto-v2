import { useState, useEffect } from 'react';

interface Patient {
  patient_id: string;
  name: string;
  adl: string;
  risk_level: string;
  allergy: string;
  room_id: string;
  bed_number: number;
}

interface PatientSelectProps {
  onSelectComplete: (selectedPatients: string[]) => void;
}

export default function PatientSelect({ onSelectComplete }: PatientSelectProps) {
  const [role, setRole] = useState('member');
  const [time, setTime] = useState('--:--');
  const [patients, setPatients] = useState<Patient[]>([]);

  // 💡 選択された患者のIDを記録するステート
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    fetch('/data/patients.json')
      .then((res) => res.json())
      .then((data: Patient[]) => {
        const sortedData = [...data].sort((a, b) => {
          if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
          return a.bed_number - b.bed_number;
        });
        setPatients(sortedData);
      })
      .catch((err) => console.error('データ読み込みエラー:', err));

    return () => clearInterval(timer);
  }, []);

  // 🛠️ 個人のチェックボックスがクリックされたときの処理
  const handlePatientCheck = (patientId: string) => {
    if (selectedPatientIds.includes(patientId)) {
      setSelectedPatientIds(selectedPatientIds.filter(id => id !== patientId));
    } else {
      setSelectedPatientIds([...selectedPatientIds, patientId]);
    }
  };

  // 🛠️ 🏢 部屋ごとの一括チェックボックスがクリックされたときの処理
  const handleRoomCheck = (roomId: string) => {
    const roomPatientIds = patients
      .filter(p => p.room_id === roomId)
      .map(p => p.patient_id);

    const isAllChecked = roomPatientIds.every(id => selectedPatientIds.includes(id));

    if (isAllChecked) {
      setSelectedPatientIds(selectedPatientIds.filter(id => !roomPatientIds.includes(id)));
    } else {
      const otherPatientIds = selectedPatientIds.filter(id => !roomPatientIds.includes(id));
      setSelectedPatientIds([...otherPatientIds, ...roomPatientIds]);
    }
  };

  // 🛠️ 👥 リーダーモード等で「病棟全体」を一括チェックしたときの処理
  const handleSelectAllPatients = (checked: boolean) => {
    if (checked) {
      const allIds = patients.map(p => p.patient_id);
      setSelectedPatientIds(allIds);
    } else {
      setSelectedPatientIds([]);
    }
  };

  return (
    <>
      <main>
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

            {/* 👤 メンバーモード */}
            {role === 'member' && (
              <div id="patient-list-container" className="w-100 max-h-[40vh] overflow-y-auto border border-[#ddd] rounded-[8px] bg-white text-gray-800">
                {patients.map((patient, index) => {
                  const isFirstInRoom = index === 0 || patients[index - 1].room_id !== patient.room_id;
                  const roomPatientIds = patients.filter(p => p.room_id === patient.room_id).map(p => p.patient_id);
                  const isRoomAllChecked = roomPatientIds.every(id => selectedPatientIds.includes(id));

                  return (
                    <div key={patient.patient_id}>
                      {/* 🏢 部屋番号の見出し行 */}
                      {isFirstInRoom && (
                        <div className="flex items-center gap-[15px] py-[8px] px-[20px] bg-[#f0f8fa] border-b border-[#eee] font-bold text-[#1A365D] text-[1.1rem]">
                          <input 
                            type="checkbox"
                            id={`room-${patient.room_id}`}
                            checked={isRoomAllChecked}
                            onChange={() => handleRoomCheck(patient.room_id)}
                            className="w-[20px] h-[20px] m-0 cursor-pointer flex-shrink-0 border border-gray-400 rounded accent-[#1A365D] !appearance-auto"
                          />
                          <label htmlFor={`room-${patient.room_id}`} className="cursor-pointer select-none">
                            {patient.room_id} 号室
                          </label>
                        </div>
                      )}
                      
                      {/* 患者個人の行 */}
                      <div className="flex items-center gap-[15px] py-[12px] pr-[20px] pl-[45px] bg-white border-b border-[#eee] hover:bg-[#f9f9f9] transition-colors">
                        <input 
                          type="checkbox" 
                          id={`patient-${patient.patient_id}`}
                          checked={selectedPatientIds.includes(patient.patient_id)}
                          onChange={() => handlePatientCheck(patient.patient_id)}
                          className="w-[20px] h-[20px] m-0 cursor-pointer flex-shrink-0 border border-gray-400 rounded accent-[#1A365D] !appearance-auto" 
                        />
                        <label 
                          htmlFor={`patient-${patient.patient_id}`} 
                          className="flex-1 flex items-center cursor-pointer select-none"
                        >
                          <span className="text-[1.1rem] font-medium text-gray-500 w-[2em] flex-shrink-0">
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

            {/* 👥 リーダーモード */}
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

                  {/* Aチーム / Bチーム（モックとして残しています） */}
                  <div className="flex items-center gap-[15px] py-[10px] px-[15px] border border-[#eee] rounded-[6px] hover:bg-[#f9f9f9] transition-colors">
                    <input type="checkbox" id="team-a" className="w-[22px] h-[22px] accent-[#1A365D] !appearance-auto" />
                    <label htmlFor="team-a" className="flex-1 cursor-pointer text-[1.1rem] font-bold text-gray-700">Aチーム</label>
                  </div>
                  <div className="flex items-center gap-[15px] py-[10px] px-[15px] border border-[#eee] rounded-[6px] hover:bg-[#f9f9f9] transition-colors">
                    <input type="checkbox" id="team-b" className="w-[22px] h-[22px] accent-[#1A365D] !appearance-auto" />
                    <label htmlFor="team-b" className="flex-1 cursor-pointer text-[1.1rem] font-bold text-gray-700">Bチーム</label>
                  </div>
                </div>
              </div>
            )}
            
            {/* 💡 修正箇所：選択されたID配列（selectedPatientIds）を親に引き渡して画面遷移する */}
            <button 
              id="get-task-btn" 
              className="text-[1.25em] !bg-[#1A365D] !text-white rounded-[10px] !p-[0.5em] !mt-[1em] !rounded w-fit text-center !font-bold hover:bg-[#112540] transition-colors mt-4"
              onClick={() => onSelectComplete(selectedPatientIds)} 
            >
              タスク取得（タイムライン表示）
            </button>
          </div>
        </div>
      </main>

      <footer></footer>
    </>
  );
}