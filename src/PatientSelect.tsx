import { useState, useEffect } from 'react';
// CSSは後でインポートします
// import './style.css'; 

export default function PatientSelect() {
  // 状態管理：いま「メンバー」か「リーダー」か
  const [role, setRole] = useState('member');
  // 状態管理：現在時刻
  const [time, setTime] = useState('--:--');

  // 時計を動かす処理（JavaScriptの部分）
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="select">
        <h1>
          <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" />
          <span className="header-title-text">NurseFlow Dashboard</span>
        </h1>
        <div className="is-login">
          <p>現在時刻：<span id="header-time">{time}</span></p>
          <p>ログイン者：<span id="header-user-name">---</span></p>
        </div>
        <div className="logout" id="logout-btn">
          <img src="/icon_b/logout_48dp.png" alt="ログアウト" />
          <p>ログアウト</p>
        </div>
      </header>

      <main>
        <div className="dashboard-wrapper">
          <div className="toggle-container">
            <input 
              type="radio" 
              name="user-role" 
              id="role-member" 
              value="member" 
              checked={role === 'member'} 
              onChange={() => setRole('member')}
            />
            <label htmlFor="role-member">メンバー</label>
            
            <input 
              type="radio" 
              name="user-role" 
              id="role-leader" 
              value="leader" 
              checked={role === 'leader'}
              onChange={() => setRole('leader')}
            />
            <label htmlFor="role-leader">リーダー</label>
            
            <div className="toggle-slider"></div>
          </div>
        
          <div id="member-selection" className="selection-box">
            <p className="selection-label">
              {role === 'member' ? '患者選択' : 'チーム全体表示'}
            </p>
            {/* ここに patients.json から読み込んだリストを出します */}
            <div id="patient-list-container" className="checkable-list-container">
              {/* Reactではここにループ処理を書きます */}
            </div>
            <button id="get-task-btn" className="submit-btn">タスク取得</button>
          </div>

          <div id="task-display-area" className="simple-task-view">
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