import { useTimer } from "../hooks/useTimer";
import { useUserName } from '../hooks/useUserName';
import { useLogout } from '../hooks/useLogout';
import { useTimelineStore } from '../stores/useTimelineStore';
import { useTheme, type AppTheme } from '../hooks/useTheme';

interface GlobalHeaderProps {
  currentPage: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings';
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings') => void;
  onLogout?: () => void;
}

// 🖼️ 全カラーテーマ共通：アクティブ時（選択中）アイコン画像パス（/icon_active/ フォルダ）
const ACTIVE_NAV_ICONS: Record<string, string> = {
  account_circle: '/icon_active/account_circle_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  event_note: '/icon_active/event_note_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  pin_drop: '/icon_active/pin_drop_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  add_task: '/icon_active/add_task_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
};

// 🎨 各テーマ別：非アクティブ（通常時）アイコン画像パス
const INACTIVE_NAV_ICONS: Record<AppTheme, Record<string, string>> = {
  vital: {
    account_circle: '/icon_b/account_circle_48dp.png',
    event_note: '/icon_b/event_note_48dp.png',
    pin_drop: '/icon_b/pin_drop_48dp.png',
    add_task: '/icon_b/add_task_48dp_1A365D.png',
  },
  serene: {
    account_circle: '/icon_s/account_circle_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/icon_s/event_note_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/icon_s/pin_drop_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/icon_s/add_task_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  },
  dark: {
    account_circle: '/icon_g/account_circle_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/icon_g/event_note_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/icon_g/pin_drop_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/icon_g/add_task_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
  },
};

// 🎨 各テーマ別ログアウトSVG画像
const LOGOUT_ICONS: Record<AppTheme, string> = {
  vital: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231A365D"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
  serene: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FAF3E0"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
  dark: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232DD4BF"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
};

export default function GlobalHeader({ currentPage, onNavigate}: GlobalHeaderProps) {
  const { time } = useTimer();
  const userName = useUserName();
  const logout = useLogout();
  const currentUser = useTimelineStore((state) => state.currentUser);
  const isLeader = currentUser?.is_leader === true;
  const { theme, currentConfig } = useTheme();

  const isMasterActive = currentPage === 'patientMaster' || currentPage === 'patientSelect';
  const inactiveIcons = INACTIVE_NAV_ICONS[theme] || INACTIVE_NAV_ICONS.vital;
  const logoutIconSrc = LOGOUT_ICONS[theme] || LOGOUT_ICONS.vital;

  const handleLogoClick = () => {
    if (currentPage === 'patientSelect') return;
    const isConfirmed = window.confirm("患者選択画面に戻りますか？\n（現在の画面は閉じられます）");
    if (isConfirmed) {
      onNavigate('patientSelect');
    }
  };

  return (
    <header
      className="flex justify-between items-center p-2 border-b w-full shadow-md transition-colors duration-300 shrink-0"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      <h1 className="cursor-pointer flex items-center" onClick={handleLogoClick}>
        <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-2" />
        <span className="font-bold text-lg transition-colors duration-300" style={{ color: currentConfig.accentColor }}>
          NurseFlowApp
        </span>
      </h1>
      
      {/* 💻 デスクトップ版ヘッダーナビゲーション */}
      <nav className={`hidden md:flex ${isLeader ? "w-96" : "w-72"}`}>
        <ul className="flex justify-between items-center text-center text-xs w-full">
          {/* 👥 患者マスター */}
          <li className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('patientMaster')}>
            <img 
              src={isMasterActive ? ACTIVE_NAV_ICONS.account_circle : inactiveIcons.account_circle} 
              alt="患者マスター" 
              className={`mx-auto w-8 h-8 transition-all duration-300 ${isMasterActive ? 'scale-110 drop-shadow-md' : 'opacity-85 hover:opacity-100'}`} 
            />
            <span
              className={`mt-0.5 transition-colors duration-300 ${isMasterActive ? 'font-black' : 'font-extrabold'}`}
              style={{ color: isMasterActive ? '#155DFC' : currentConfig.accentColor }}
            >
              患者マスター
            </span>
          </li>
          
          {/* 🗓️ タイムライン */}
          <li className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('timeline')}>
            <img 
              src={currentPage === 'timeline' ? ACTIVE_NAV_ICONS.event_note : inactiveIcons.event_note} 
              alt="タイムライン" 
              className={`mx-auto w-8 h-8 transition-all duration-300 ${currentPage === 'timeline' ? 'scale-110 drop-shadow-md' : 'opacity-85 hover:opacity-100'}`} 
            />
            <span
              className={`mt-0.5 transition-colors duration-300 ${currentPage === 'timeline' ? 'font-black' : 'font-extrabold'}`}
              style={{ color: currentPage === 'timeline' ? '#155DFC' : currentConfig.accentColor }}
            >
              タイムライン
            </span>
          </li>

          {/* 📍 マップ */}
          <li className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('map')}>
            <img 
              src={currentPage === 'map' ? ACTIVE_NAV_ICONS.pin_drop : inactiveIcons.pin_drop} 
              alt="マップ" 
              className={`mx-auto w-8 h-8 transition-all duration-300 ${currentPage === 'map' ? 'scale-110 drop-shadow-md' : 'opacity-85 hover:opacity-100'}`} 
            />
            <span
              className={`mt-0.5 transition-colors duration-300 ${currentPage === 'map' ? 'font-black' : 'font-extrabold'}`}
              style={{ color: currentPage === 'map' ? '#155DFC' : currentConfig.accentColor }}
            >
              マップ
            </span>
          </li>

          {/* 📋 リーダーTODO */}
          {isLeader && (
            <li className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('leaderTodo')}>
              <img 
                src={currentPage === 'leaderTodo' ? ACTIVE_NAV_ICONS.add_task : inactiveIcons.add_task} 
                alt="リーダーTODO" 
                className={`mx-auto w-8 h-8 transition-all duration-300 ${currentPage === 'leaderTodo' ? 'scale-110 drop-shadow-md' : 'opacity-85 hover:opacity-100'}`} 
              />
              <span
                className={`mt-0.5 transition-colors duration-300 ${currentPage === 'leaderTodo' ? 'font-black' : 'font-extrabold'}`}
                style={{ color: currentPage === 'leaderTodo' ? '#155DFC' : currentConfig.accentColor }}
              >
                リーダーTODO
              </span>
            </li>
          )}
        </ul>
      </nav>

      {/* ユーザー情報・ログアウト */}
      <div className="w-50 text-sm flex items-center space-x-4 transition-colors duration-300" style={{ color: currentConfig.accentColor }}>
        <div>
          <p className="font-medium">現在時刻：<span id="header-time" className="font-bold">{time}</span></p>
          <p className="font-medium">ログイン者：<span className="font-bold">{userName}</span></p>
        </div>

        <div 
          className="logout cursor-pointer text-center text-xs hover:opacity-80 transition-opacity" 
          id="logout-btn"
          onClick={logout}
          style={{ color: currentConfig.accentColor }}
        >
          <img
            src={logoutIconSrc}
            alt="ログアウト"
            className="mx-auto w-6 h-6 object-contain transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/icon_b/logout_48dp.png";
            }}
          />
          <p className="font-bold mt-0.5">ログアウト</p>
        </div>
      </div>
    </header>
  );
}