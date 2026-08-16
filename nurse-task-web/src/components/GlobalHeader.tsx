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
  account_circle: '/app/icon_active/account_circle_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  event_note: '/app/icon_active/event_note_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  pin_drop: '/app/icon_active/pin_drop_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
  add_task: '/app/icon_active/add_task_48dp_155DFC_FILL1_wght400_GRAD0_opsz48.png',
};

// 🎨 各テーマ別：非アクティブ（通常時）アイコン画像パス
const INACTIVE_NAV_ICONS: Record<AppTheme, Record<string, string>> = {
  vital: {
    account_circle: '/app/icon_b/account_circle_48dp.png',
    event_note: '/app/icon_b/event_note_48dp.png',
    pin_drop: '/app/icon_b/pin_drop_48dp.png',
    add_task: '/app/icon_b/add_task_48dp_1A365D.png',
  },
  serene: {
    account_circle: '/app/icon_s/account_circle_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/app/icon_s/event_note_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/app/icon_s/pin_drop_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/app/icon_s/add_task_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  },
  dark: {
    account_circle: '/app/icon_g/account_circle_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    event_note: '/app/icon_g/event_note_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    pin_drop: '/app/icon_g/pin_drop_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
    add_task: '/app/icon_g/add_task_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
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
  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true
  );
  const isLeader = isGuestUser
    ? (currentUser ? currentUser.is_leader === true : sessionStorage.getItem('nurseflow_guest_role') === 'leader')
    : Boolean(currentUser?.is_leader);
  const { theme, currentConfig } = useTheme();

  const selectedDate = useTimelineStore((state) => state.selectedDate);
  const activeDates = useTimelineStore((state) => state.activeDates || []);
  const isReadOnly = useTimelineStore((state) => state.isReadOnly);
  const setSelectedDate = useTimelineStore((state) => state.setSelectedDate);

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

  const formatOptionDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    const month = parts[1];
    const day = parts[2];
    const formatted = `${parseInt(month || '0', 10)}月${parseInt(day || '0', 10)}日`;
    if (dateStr === new Date().toISOString().split('T')[0]) {
      return `📅 ${formatted} の記録 (本日)`;
    }
    return `📜 ${formatted} の記録 (過去閲覧)`;
  };

  return (
    <header
      className="flex justify-between items-center p-2 border-b w-full shadow-md transition-colors duration-300 shrink-0 tutorial-header"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-1.5 lg:gap-2">
        <h1 className="cursor-pointer flex items-center" onClick={handleLogoClick}>
          <img src="/app/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-2" />
          <span className="font-bold text-lg transition-colors duration-300" style={{ color: currentConfig.accentColor }}>
            NurseFlowApp
          </span>
        </h1>

        {/* 📅 タブレット・スマホ対応：日付選択とナースコール対応の縦並び配置エリア */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="!bg-white !text-slate-800 !font-extrabold !text-xs !px-2 !py-0.5 !rounded-lg !border !border-slate-300 !shadow-sm !cursor-pointer hover:!bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              title="表示する記録の日付を選択"
            >
              {activeDates.map((d) => (
                <option key={d} value={d}>
                  {formatOptionDateLabel(d)}
                </option>
              ))}
            </select>

            {/* 🔒 過去履歴の閲覧専用（ReadOnly）警告バッジ */}
            {isReadOnly && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                🔒 過去履歴閲覧モード (編集不可)
              </span>
            )}

          </div>

          {/* 📞 タブレット・スマホ等で日付選択の下に縦並び表示されるナースコール対応ボタン */}
          {/* 📞 タブレット・スマホ等で日付選択の下に縦並び表示されるナースコール対応ボタン */}
          {!isReadOnly && (
            <button
              id="tutorial-nurse-call"
              type="button"
              onClick={async () => {
                const { triggerNurseCallInterruption } = await import('../hooks/useTaskUpdate');
                triggerNurseCallInterruption({
                  sosReason: 'ナースコール緊急割り込み対応',
                });
              }}
              className="!bg-rose-600 hover:!bg-rose-700 !text-white !font-black !text-xs !px-2.5 !py-0.5 !rounded-full !shadow-md !transition-all !cursor-pointer !flex !items-center !gap-1 !border-2 !border-rose-300 !whitespace-nowrap tutorial-nurse-call"
              title="実施中タスクを自動中断し、現在時刻でナースコール割り込み対応実績を作成します"
            >
              <span>ナースコール対応</span>
            </button>
          )}
        </div>
      </div>
      
      {/* 💻 デスクトップ版ヘッダーナビゲーション (lg以上で表示) */}
      <nav className={`hidden lg:flex ${isLeader ? "w-96" : "w-72"}`}>
        <ul className="flex justify-between items-center text-center text-xs w-full">
          {/* 👥 患者マスター */}
          <li id="tutorial-nav-patient" className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('patientMaster')}>
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
          <li id="tutorial-nav-timeline" className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('timeline')}>
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
          <li id="tutorial-nav-map" className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('map')}>
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
            <li id="tutorial-nav-leader-todo" className="cursor-pointer flex flex-col items-center justify-center" onClick={() => onNavigate('leaderTodo')}>
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

      {/* 右側：ユーザー情報・ログアウト */}
      <div className="flex items-center gap-3">

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
                (e.target as HTMLImageElement).src = "/app/icon_b/logout_48dp.png";
              }}
            />
            <p className="font-bold mt-0.5">ログアウト</p>
          </div>
        </div>
      </div>
    </header>
  );
}