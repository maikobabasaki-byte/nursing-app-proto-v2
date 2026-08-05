import { useTimer } from "../hooks/useTimer";
import { useUserName } from '../hooks/useUserName';
import { useLogout } from '../hooks/useLogout';
import { useTimelineStore } from '../stores/useTimelineStore';

interface GlobalHeaderProps {
  currentPage: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo';
  // 💡 画面遷移を実行するための関数Propを追加
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo') => void;
  onLogout?: () => void; // ログアウト用（必要に応じて）
}

export default function GlobalHeader({ currentPage, onNavigate}: GlobalHeaderProps) {
   const { time } = useTimer();
   const userName = useUserName();
   const logout = useLogout();
   const currentUser = useTimelineStore((state) => state.currentUser);
   const isLeader = currentUser?.is_leader === true;

  // 💡 「患者マスター」タブを青くアクティブにする条件（マスター画面 or 患者選択画面のとき）
  const isMasterActive = currentPage === 'patientMaster' || currentPage === 'patientSelect';

  // 💡 ロゴクリック時の確認ハンドラーを追加
  const handleLogoClick = () => {
    // すでに患者選択画面にいる場合は何もせずにリターン
    if (currentPage === 'patientSelect') return;

    // 確認ダイアログを表示
    const isConfirmed = window.confirm("患者選択画面に戻りますか？\n（現在の画面は閉じられます）");
    
    // 「OK」が押された場合のみ遷移を実行
    if (isConfirmed) {
      onNavigate('patientSelect');
    }
  };

  return (
    <header className="flex justify-between items-center p-2 bg-sky-200 border-b w-full">
      {/* 💡 onClickを handleLogoClick に変更 */}
      <h1 className="cursor-pointer" onClick={handleLogoClick}>
        <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-2" />
        <span className="header-title-text font-bold text-lg">NurseFlowApp</span>
      </h1>
      
      <nav className={isLeader ? "w-96" : "w-72"}>
        <ul className="flex justify-between items-center text-center text-xs">
          {/* 👥 患者マスター */}
          <li className="cursor-pointer" onClick={() => onNavigate('patientMaster')}>
            <img 
              src={isMasterActive 
                ? "/icon_active/account_circle_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/account_circle_48dp.png"
              } 
              alt="患者マスター" 
              className="mx-auto w-8 h-8" 
            />
            <span className={isMasterActive ? "text-blue-600 font-bold" : "text-gray-600"}>
              患者マスター
            </span>
          </li>
          
          {/* 🗓️ タイムライン */}
          <li className="cursor-pointer" onClick={() => onNavigate('timeline')}>
            <img 
              src={currentPage === 'timeline' 
                ? "/icon_active/event_note_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/event_note_48dp.png"
              } 
              alt="タイムライン" 
              className="mx-auto w-8 h-8" 
            />
            <span className={currentPage === 'timeline' ? "text-blue-600 font-bold" : "text-gray-600"}>タイムライン</span>
          </li>

          {/* 📍 マップ */}
          <li className="cursor-pointer" onClick={() => onNavigate('map')}>
            <img 
              src={currentPage === 'map' 
                ? "/icon_active/pin_drop_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/pin_drop_48dp.png"
              } 
              alt="マップ" 
              className="mx-auto w-8 h-8" 
            />
            <span className={currentPage === 'map' ? "text-blue-600 font-bold" : "text-gray-600"}>マップ</span>
          </li>

          {/* 📋 リーダーTODO（💡 リーダー権限保持者のみ表示） */}
          {isLeader && (
            <li className="cursor-pointer" onClick={() => onNavigate('leaderTodo')}>
              <img 
              src={currentPage === 'leaderTodo' 
                ? "/icon_active/add_task_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png" 
                : "/icon_b/add_task_48dp_1A365D.png"
              } 
              alt="リーダーTODO" 
              className="mx-auto w-8 h-8" 
            />
              <span className={currentPage === 'leaderTodo' ? "text-blue-600 font-bold" : "text-gray-600"}>リーダーTODO</span>
            </li>
          )}
        </ul>
      </nav>

      {/* ユーザー情報・ログアウト */}
      <div className="w-50 text-sm flex items-center space-x-4 text-gray-700">
        <div>
          <p>現在時刻：<span id="header-time">{time}</span></p>
          <p>ログイン者：<span>{userName}</span></p>
        </div>

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