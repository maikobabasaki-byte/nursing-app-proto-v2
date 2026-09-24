import { useState, useEffect } from 'react';
import { useTimer } from "../../../hooks/useTimer";
import { useUserName } from '../../../hooks/useUserName';
import { useLogout } from '../../../hooks/useLogout';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { checkIsLeader } from '../../../utils/userUtils';
import { getJSTDateString, recordLoginDate } from '../../../utils/dateUtils';
import { useTheme, type AppTheme } from '../../../hooks/useTheme';
import CalendarModal from './CalendarModal';
import DemoScenarioBar from './DemoScenarioBar';

import type { NavigationScreen } from './MainLayout';

interface GlobalHeaderProps {
  currentPage: NavigationScreen;
  onNavigate: (screen: NavigationScreen) => void;
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
  const isLeader = checkIsLeader(currentUser);
  const { theme, currentConfig } = useTheme();

  const selectedDate = useTimelineStore((state) => state.selectedDate) || getJSTDateString();
  const isReadOnly = useTimelineStore((state) => state.isReadOnly);
  const setSelectedDate = useTimelineStore((state) => state.setSelectedDate);
  const targetUserId = useTimelineStore((state) => state.targetUserId);
  const setTargetUserId = useTimelineStore((state) => state.setTargetUserId);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // マウント時に本日のログイン実績を記憶
  useEffect(() => {
    recordLoginDate();
  }, []);

  const handlePrevDay = () => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() - 1);
    setSelectedDate(getJSTDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() + 1);
    setSelectedDate(getJSTDateString(d));
  };

  const handleToday = () => {
    setSelectedDate(getJSTDateString());
  };

  const isMasterActive = currentPage === 'patientMaster' || currentPage === 'patientSelect';
  const isExtendedView = currentPage === 'personalDashboard' || currentPage === 'adminDashboard';
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
      className="flex flex-nowrap items-center justify-between px-3 py-1.5 gap-3 w-full max-w-full shadow-md transition-colors duration-300 shrink-0 tutorial-header min-w-0 overflow-x-auto whitespace-nowrap"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      <div className="flex flex-nowrap items-center gap-2 shrink-0">
        {/* アプリロゴ・タイトル */}
        <h1 className="cursor-pointer flex items-center shrink-0 mr-1" onClick={handleLogoClick}>
          <img src="/app/icon_b/local_hospital_48dp.png" alt="NurseFlow Dashboard" className="w-8 h-8 inline mr-1.5" />
          <span className="font-bold text-lg transition-colors duration-300 whitespace-nowrap" style={{ color: currentConfig.accentColor }}>
            NurseFlowApp
          </span>
          {currentPage === 'personalDashboard' && (
            <span className="hidden md:inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 font-extrabold text-xs px-2.5 py-1 rounded-xl shadow-2xs ml-2 whitespace-nowrap">
              <span>📋</span> 個人パフォーマンスダッシュボード
            </span>
          )}
        </h1>

        {/* 📅 コントロール群 (日付選択・デモシナリオ 縦並び) */}
        <div className="flex flex-nowrap items-center gap-2 shrink-0">
          <div className="flex flex-col gap-1 justify-center shrink-0">
            {/* 📅 日付選択＆過去履歴切り替えコントロール */}
            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 p-0.5 rounded-xl shadow-2xs text-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="!px-2 !py-0.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white !font-bold !rounded-md !shadow-2xs !cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="ログイン実績のある日をハイライト表示するカレンダーを開きます"
              >
                <span>📅</span>
                <span>カレンダー</span>
              </button>

              <button
                type="button"
                onClick={handlePrevDay}
                className="!px-2 !py-0.5 !bg-white hover:!bg-indigo-100 !text-indigo-900 !font-bold !rounded-md !border !border-indigo-300 !shadow-2xs !cursor-pointer"
                title="前日へ"
              >
                ◀
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="!bg-white !text-indigo-950 !font-black !text-xs !px-2 !py-0.5 !rounded-md !border !border-indigo-300 focus:!outline-none focus:!ring-1 focus:!ring-indigo-500 !cursor-pointer !shadow-2xs"
              />
              <button
                type="button"
                onClick={handleNextDay}
                className="!px-2 !py-0.5 !bg-white hover:!bg-indigo-100 !text-indigo-900 !font-bold !rounded-md !border !border-indigo-300 !shadow-2xs !cursor-pointer"
                title="翌日へ"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="!px-2 !py-0.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white !font-black !text-[11px] !rounded-md !shadow-2xs !cursor-pointer whitespace-nowrap"
                title="本日に戻る"
              >
                今日
              </button>
            </div>

            {/* 🎬 デモシナリオ切り替えバー (面接デモプレゼン時のみ表示) */}
            {typeof window !== 'undefined' && sessionStorage.getItem('is_demo_presenter_session') === 'true' && (
              <DemoScenarioBar />
            )}
          </div>

          {/* 👩‍⚕️ 表示対象スタッフ選択（ダッシュボード閲覧時 & 管理者権限） */}
          {currentPage === 'personalDashboard' && (isLeader || currentUser?.role === 'admin') && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl shadow-2xs text-xs shrink-0">
              <label htmlFor="staff-select-header" className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1 shrink-0">
                <span>👩‍⚕️</span> 対象:
              </label>
              <select
                id="staff-select-header"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="!bg-white !text-slate-800 !font-extrabold !text-xs !px-2 !py-0.5 !rounded-lg !border !border-amber-300 !shadow-2xs !cursor-pointer focus:!outline-none focus:!ring-2 focus:!ring-amber-500"
              >
                <option value="N001">N001: 師長 (山田 師長)</option>
                <option value="N002">N002: Satou Yui (佐藤 由衣)</option>
                <option value="N003">N003: Suzuki Yuka (鈴木 優花)</option>
              </select>
            </div>
          )}

          {/* 🔒 過去履歴の閲覧専用（ReadOnly）警告バッジ */}
          {isReadOnly && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse shrink-0">
              🔒 過去履歴閲覧モード (編集不可)
            </span>
          )}

          {/* 📞 ナースコール対応ボタン */}
          {!isReadOnly && (
            <button
              id="tutorial-nurse-call"
              type="button"
              onClick={async () => {
                const { triggerNurseCallInterruption } = await import('../../../hooks/useTaskUpdate');
                triggerNurseCallInterruption({
                  sosReason: 'ナースコール緊急割り込み対応',
                });
              }}
              className="!bg-rose-600 hover:!bg-rose-700 !text-white !font-black !text-xs !px-2.5 !py-1 !rounded-full !shadow-md !transition-all !cursor-pointer !flex !items-center !gap-1 !border-2 !border-rose-300 !whitespace-nowrap shrink-0 tutorial-nurse-call"
              title="実施中タスクを自動中断し、現在時刻でナースコール割り込み対応実績を作成します"
            >
              <span>ナースコール対応</span>
            </button>
          )}
        </div>
      </div>
      
      {/* 💻 デスクトップ版ヘッダーナビゲーション (lg以上で表示) */}
      {isExtendedView ? (
        /* 🚀 拡張版ダッシュボード表示時：専用ヘッダーナビ（「タスク管理画面に戻る」ボタン付き） */
        <nav className="hidden lg:flex items-center gap-3 shrink-0">
          {/* 🔙 タスク管理画面に戻る ボタン */}
          <button
            id="nav-back-to-task-app"
            type="button"
            onClick={() => onNavigate('timeline')}
            className="!bg-sky-600 hover:!bg-sky-700 !text-white !font-black !text-xs !px-3.5 !py-1.5 !rounded-xl !shadow-md !transition-all !cursor-pointer !flex !items-center !gap-1.5 !border-2 !border-sky-300 active:!scale-95"
            title="標準の臨床タスク管理（タイムライン）画面に戻ります"
          >
            <span className="text-sm">↩️</span>
            <span className="whitespace-nowrap">タスク管理画面に戻る</span>
          </button>

          
        </nav>
      ) : (
        /* 🩺 標準タスク管理アプリ表示時：タスク管理専用ヘッダーナビ */
        <nav className={`hidden lg:flex shrink-0 ${isLeader ? "w-96" : "w-72"}`}>
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
      )}

      {/* 右側：ユーザー情報・ログアウト */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        {/* ユーザー情報・ログアウト */}
        <div className="flex items-center space-x-3 sm:space-x-4 transition-colors duration-300 shrink-0" style={{ color: currentConfig.accentColor }}>
          <div className="flex flex-col whitespace-nowrap text-right">
            <p className="font-medium text-[11px] sm:text-xs whitespace-nowrap">現在時刻：<span id="header-time" className="font-bold">{time}</span></p>
            <p className="font-medium text-[11px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap">
              <span className="whitespace-nowrap">ログイン者：<strong className="font-bold">{userName}</strong></span>
              <span
                className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                  isLeader || currentUser?.role === 'admin'
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {isLeader || currentUser?.role === 'admin' ? '👑 師長' : '🩺 一般看護師'}
              </span>
            </p>
          </div>

          <div 
            className="logout cursor-pointer text-center text-xs hover:opacity-80 transition-opacity shrink-0 px-1" 
            id="logout-btn"
            onClick={logout}
            style={{ color: currentConfig.accentColor }}
          >
            <img
              src={logoutIconSrc}
              alt="ログアウト"
              className="mx-auto w-5 h-5 sm:w-6 sm:h-6 object-contain transition-all duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/app/icon_b/logout_48dp.png";
              }}
            />
            <p className="font-bold text-[10px] sm:text-xs mt-0.5 whitespace-nowrap">ログアウト</p>
          </div>
        </div>
      </div>

      {/* 📅 過去履歴ログインカレンダーモーダル */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate(date)}
      />
    </header>
  );
}