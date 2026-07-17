import { useTimer } from "../hooks/useTimer";
import { useUserName } from '../hooks/useUserName';
import { useLogout } from '../hooks/useLogout';

interface GlobalHeaderProps {
  currentPage: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map';
  // 💡 画面遷移を実行するための関数Propを追加
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map') => void;
  onLogout?: () => void; // ログアウト用（必要に応じて）
}

export default function GlobalHeader({ currentPage, onNavigate, onLogout }: GlobalHeaderProps) {
   const { time } = useTimer();
   const userName = useUserName();
   const logout = useLogout();
  // 💡 「患者マスター」タブを青くアクティブにする条件（マスター画面 or 患者選択画面のとき）
  const isMasterActive = currentPage === 'patientMaster' || currentPage === 'patientSelect';

  return (
    <header className="flex justify-between items-center p-2 bg-sky-200 border-b w-full">
      <h1>
        <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-2" />
        <span className="header-title-text font-bold text-lg">NurseFlowApp</span>
      </h1>
      
      <nav className="w-72">
        <ul className="flex justify-between text-center">
          {/* 👥 患者マスター */}
          {/* 💡 クリックしたら 'patientMaster' 画面へ遷移。表示条件は isMasterActive を使う */}
          <li className="cursor-pointer" onClick={() => onNavigate('patientMaster')}>
            <img 
              src={isMasterActive 
                ? "/icon_active/account_circle_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/account_circle_48dp.png"
              } 
              alt="患者マスター" 
              className="mx-auto w-10 h-10" 
            />
            <span className={isMasterActive ? "text-blue-600 font-bold" : "text-gray-600"}>
              患者マスター
            </span>
          </li>
          
          {/* 🗓️ タイムライン */}
          {/* 💡 onClick で timeline を指定 */}
          <li className="cursor-pointer" onClick={() => onNavigate('timeline')}>
            <img 
              src={currentPage === 'timeline' 
                ? "/icon_active/event_note_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/event_note_48dp.png"
              } 
              alt="タイムライン" 
              className="mx-auto w-10 h-10" 
            />
            <span className={currentPage === 'timeline' ? "text-blue-600 font-bold" : "text-gray-600"}>タイムライン</span>
          </li>

          {/* 📍 マップ */}
          {/* 💡 onClick で map を指定 */}
          <li className="cursor-pointer" onClick={() => onNavigate('map')}>
            <img 
              src={currentPage === 'map' 
                ? "/icon_active/pin_drop_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/pin_drop_48dp.png"
              } 
              alt="マップ" 
              className="mx-auto w-10 h-10" 
            />
            <span className={currentPage === 'map' ? "text-blue-600 font-bold" : "text-gray-600"}>マップ</span>
          </li>
        </ul>
      </nav>

      {/* ユーザー情報・ログアウト */}
      <div className="w-50 text-sm flex items-center space-x-4 text-gray-700">
        <div>
          <p>現在時刻：<span id="header-time">{time}</span></p>
          <p>ログイン者：<span>{userName}</span></p>
        </div>
        {/* 💡 必要であればログアウト処理を繋ぎ込めるように */}
        <div 
          className="logout cursor-pointer text-center text-xs" 
          id="logout-btn"
          onClick={logout}
        >
          <img src="/icon_b/logout_48dp.png" alt="ログアウト" className="mx-auto w-6 h-6" />
          <p>ログアウト</p>
        </div>
      </div>
    </header>
  );
}