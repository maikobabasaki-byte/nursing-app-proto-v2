import { useTheme, type AppTheme } from '../../../hooks/useTheme';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { checkIsLeader } from '../../../utils/userUtils';

import type { NavigationScreen } from './MainLayout';

interface GlobalFooterProps {
  onNavigate?: (screen: NavigationScreen) => void;
  currentScreen?: NavigationScreen;
}

// 🎨 各テーマ別設定アイコン画像マッピング
const SETTINGS_ICONS: Record<AppTheme, string> = {
  vital: '/app/icon_b/settings_48dp.png',
  serene: '/app/icon_s/settings_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  dark: '/app/icon_g/settings_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
};

export default function GlobalFooter({ onNavigate, currentScreen }: GlobalFooterProps) {
  const { theme, currentConfig } = useTheme();
  const settingsIconSrc = SETTINGS_ICONS[theme] || SETTINGS_ICONS.vital;
  const currentUser = useTimelineStore((state) => state.currentUser);
  const isLeaderOrAdmin = currentUser?.role === 'admin' || checkIsLeader(currentUser);

  return (
    <footer
      className="w-full min-h-[50px] flex justify-between items-center px-6 border-t border-white/10 transition-colors duration-300 shrink-0"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      {/* ⚙️ 左側エリア：ナビゲーション群（flexで横並びに） */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap py-1.5">
        
        {/* 既存：システム設定 */}
        <button 
          id="footer-settings-btn"
          type="button"
          onClick={() => onNavigate?.('settings')}
          className={`flex items-center cursor-pointer hover:bg-white/10 transition-all px-2.5 py-1 rounded-lg border ${
            currentScreen === 'settings'
              ? 'bg-white/20 border-white/40 font-black'
              : 'border-transparent opacity-90 hover:opacity-100'
          }`}
          style={{ color: currentConfig.accentColor }}
        >
          <img 
            src={settingsIconSrc} 
            alt="システム設定" 
            className="w-4 h-4 mr-1.5 object-contain transition-all duration-300" 
          />
          <span className="text-xs font-bold whitespace-nowrap">システム設定</span>
        </button>

        {/* 📋 個人用ダッシュボード */}
        <button 
          type="button"
          onClick={() => onNavigate?.('personalDashboard')}
          className={`flex items-center cursor-pointer hover:bg-white/10 transition-all px-2.5 py-1 rounded-lg border ${
            currentScreen === 'personalDashboard'
              ? 'bg-white/20 border-white/40 font-black'
              : 'border-transparent opacity-90 hover:opacity-100'
          }`}
          style={{ color: currentConfig.accentColor }}
        >
          <span className="text-xs mr-1">📋</span>
          <span className="text-xs font-bold whitespace-nowrap">個人用ダッシュボード</span>
        </button>

        {/* 📊 師長用ダッシュボード（管理者・指導者のみ表示、一般看護師フッターからは削除） */}
        {isLeaderOrAdmin && (
          <button 
            type="button"
            onClick={() => onNavigate?.('adminDashboard')}
            className={`flex items-center cursor-pointer hover:bg-white/10 transition-all px-2.5 py-1 rounded-lg border ${
              currentScreen === 'adminDashboard'
                ? 'bg-white/20 border-white/40 font-black'
                : 'border-transparent opacity-90 hover:opacity-100'
            }`}
            style={{ color: currentConfig.accentColor }}
          >
            <span className="text-xs mr-1">📊</span>
            <span className="text-xs font-bold whitespace-nowrap">師長用ダッシュボード</span>
          </button>
        )}

      </div>

      {/* ⌨️ 右側：ショートカット */}
      <div className="shortcut text-xs text-right space-y-0.5 opacity-90 transition-colors duration-300 hidden md:block" style={{ color: currentConfig.accentColor }}>
        <p>Ctrl + Tab でカルテへ切り替え</p>
        <p>Alt + A で患者マスターへ切り替え</p>
      </div>
    </footer>
  );
}