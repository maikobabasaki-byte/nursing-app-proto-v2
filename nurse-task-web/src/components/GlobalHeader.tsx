interface GlobalHeaderProps {
  currentPage: 'patientMaster' | 'timeline' | 'map';
}

export default function GlobalHeader({ currentPage }: GlobalHeaderProps) {
  return (
    <header className="flex justify-between items-center p-4 bg-sky-200 border-b">
      <h1>
        <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-2" />
        <span className="header-title-text font-bold text-lg">NurseFlowApp</span>
      </h1>
      
      <nav className="min-w-64">
        <ul className="flex justify-between text-center">
          {/* 👥 患者マスター */}
          <li className="cursor-pointer">
            <img 
              src={currentPage === 'patientMaster' ? "/icon_b/account_circle_48dp.png" : "/icon_b/account_circle_48dp.png"} 
              alt="患者マスター" 
              className="mx-auto w-10 h-10" 
            />
            <span className={currentPage === 'patientMaster' ? "text-blue-600 font-bold" : "text-gray-600"}>患者マスター</span>
          </li>

          {/* 🗓️ タイムライン */}
          <li className="cursor-pointer">
            <img 
              src={currentPage === 'timeline' ? "/icon_b/event_note_blue_48dp.png" : "/icon_b/event_note_48dp.png"} 
              alt="タイムライン" 
              className="mx-auto w-10 h-10" 
            />
            <span className={currentPage === 'timeline' ? "text-blue-600 font-bold" : "text-gray-600"}>タイムライン</span>
          </li>

          {/* 📍 マップ */}
          <li className="cursor-pointer">
            <img 
              src={currentPage === 'map' ? "/icon_b/pin_drop_blue_48dp.png" : "/icon_b/pin_drop_48dp.png"} 
              alt="マップ" 
              className="mx-auto w-10 h-10" 
            />
            <span className={currentPage === 'map' ? "text-blue-600 font-bold" : "text-gray-600"}>マップ</span>
          </li>
        </ul>
      </nav>

      {/* ユーザー情報・ログアウト */}
      <div className="is-login text-sm flex items-center space-x-4">
        <div>
          <p>現在時刻：<span id="header-time">--:--</span></p>
          <p>ログイン者：<span id="header-user-name">---</span></p>
        </div>
        <div className="logout cursor-pointer text-center text-xs" id="logout-btn">
          <img src="/icon_b/logout_48dp.png" alt="ログアウト" className="mx-auto w-6 h-6" />
          <p>ログアウト</p>
        </div>
      </div>
    </header>
  );
}