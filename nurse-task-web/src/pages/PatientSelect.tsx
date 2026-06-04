import { useState, useEffect } from 'react';

// 患者データの型（見出し）を定義
interface Patient {
  id: string;
  name: string;
  room?: string;       // 101号室 など
  isHeader?: boolean;  // 部屋全体の行かどうかのフラグ
}

// 親（App.tsx）から受け取るPropsの型を定義
interface PatientSelectProps {
  onSelectComplete: () => void;
}

export default function PatientSelect({ onSelectComplete }: PatientSelectProps) {
  // 状態管理：いま「メンバー」か「リーダー」か
  const [role, setRole] = useState('member');
  // 状態管理：現在時刻
  const [time, setTime] = useState('--:--');
  
  // 読み込んだ患者リストを保存するステート
  const [patients, setPatients] = useState<Patient[]>([]);

  // 時計を動かす処理と、★JSONデータの読み込み処理
  useEffect(() => {
    // 1. 時計のタイマー
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    // 2. JSONファイルから患者データを取得
    fetch('/data/patients.json')
      .then((res) => res.json())
      .then((data: Patient[]) => {
        setPatients(data);
      })
      .catch((err) => console.error('データ読み込みエラー:', err));

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <main>
        <div className="m-[5vh] flex flex-col items-center">
          <div className="text-[1.25em] bg-[#99D3DF] !w-[24em] h-[3em] rounded-[25px] flex justify-evenly !items-center">
            <input 
              type="radio" 
              name="user-role" 
              className="peer hidden"
              id="role-member" 
              value="member" 
              checked={role === 'member'} 
              onChange={() => setRole('member')}
            />
            <label 
              htmlFor="role-member" 
              className="w-[8em] h-[2em] flex items-center justify-center text-gray-700 cursor-pointer font-medium transition-all peer-checked:!bg-white peer-checked:!rounded-[1em] !leading-none"
            >
              メンバー
            </label>
            
            <input 
              type="radio" 
              name="user-role" 
              className="peer hidden"
              id="role-leader" 
              value="leader" 
              checked={role === 'leader'}
              onChange={() => setRole('leader')}
            />
            <label 
              htmlFor="role-leader" 
              className='w-[8em] h-[2em] flex items-center justify-center text-gray-700 cursor-pointer font-medium transition-all peer-checked:!bg-white peer-checked:!rounded-[1em] !leading-none'
            >
              リーダー
            </label>
          </div>
        
          <div id="member-selection" className="text-white bg-[#99D3DF] w-[40em] my-[1.5em] flex flex-col items-center rounded-[10px]">
            <p className="text-[1.25em] p-[0.3em]">
              {role === 'member' ? '患者選択' : 'チーム全体表示'}
            </p>

            {/* 📁 patients.json から読み込んだリストを出すコンテナ */}
            {/* 💡 w-full（横幅いっぱい）を足して、中の要素が綺麗に広がるようにしています */}
            <div id="patient-list-container" className="w-full max-h-[50vh] overflow-y-auto border border-[#ddd] rounded-[8px] bg-white">
              
              {/* 🔄 ★追加：ここで.map()を使ってループ処理を書き込みました */}
              {patients.map((patient) => {
                // 👥 部屋全体の行（isHeader: true の場合）
                if (patient.isHeader) {
                  return (
                    <div key={patient.id} className="flex items-center gap-[15px] py-[12px] !px-[20px] cursor-pointer border-b border-[#eee] !bg-[#f0f8fa] font-bold text-gray-800">
                      <input type="checkbox" className="w-[20px] h-[20px] m-0 cursor-pointer flex-shrink-0" />
                      <span className="text-[1.1rem] min-w-[3em] text-[#333]">{patient.room}</span>
                      <span className="text-[1.1rem] text-[#333]">{patient.name}</span>
                    </div>
                  );
                }

                // 👤 通常の「患者さん個人」の行
                return (
                  <div key={patient.id} className="flex items-center gap-[15px] py-[12px] !pr-[20px] !pl-[45px] cursor-pointer border-b border-[#eee] bg-white text-gray-800">
                    <input type="checkbox" className="w-[20px] h-[20px] m-0 cursor-pointer flex-shrink-0" />
                    <span className="text-[1.1rem] min-w-[3em] text-[#333]">{patient.room}</span>
                    <span className="text-[1.1rem] text-[#333]">{patient.name} 様</span>
                  </div>
                );
              })}

            </div>
            
            {/* 「タスク取得」ボタン */}
            <button 
              id="get-task-btn" 
              className="text-[1.25em] bg-[#1A365D] text-white rounded-[10px] p-[0.3em] m-[0.5em] w-1/2 text-center font-bold hover:bg-[#112540] transition-colors"
              onClick={onSelectComplete} 
            >
              タスク取得（タイムライン表示）
            </button>
          </div>

          <div id="task-display-area" className="">
            <p style={{ color: '#999', textAlign: 'center' }}>
              患者を選択してボタンを押してください
            </p>
          </div>
        </div>
      </main>

      <footer></footer>
    </>
  );
}