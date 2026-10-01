import { useTimelineStore } from '../../../stores/useTimelineStore';
import { useTheme, type AppTheme } from '../../../hooks/useTheme';

import type { NavigationScreen } from './MainLayout';

interface GlobalFooterProps {
  onNavigate?: (screen: NavigationScreen) => void;
}

// 🎨 各テーマ別設定アイコン画像マッピング
const SETTINGS_ICONS: Record<AppTheme, string> = {
  vital: '/app/icon_b/settings_48dp.png',
  serene: '/app/icon_s/settings_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  dark: '/app/icon_g/settings_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
};

export default function GlobalFooter({ onNavigate }: GlobalFooterProps) {
  const { theme, currentConfig } = useTheme();
  const currentUser = useTimelineStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.name || '').includes('師長') || (currentUser?.nurse_id || '').includes('admin');
  const settingsIconSrc = SETTINGS_ICONS[theme] || SETTINGS_ICONS.vital;

  return (
    <footer
      className="w-full min-h-[50px] flex justify-between items-center px-6 border-t border-white/10 transition-colors duration-300 shrink-0"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      {/* ⚙️ 左側エリア：ナビゲーション群（flexで横並びに） */}
      <div className="flex items-center gap-4 flex-wrap">
        
        {/* 既存：システム設定 */}
        <div 
          id="footer-settings-btn"
          onClick={() => onNavigate?.('settings')}
          className="setting flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: currentConfig.accentColor }}
        >
          <img 
            src={settingsIconSrc} 
            alt="システム設定" 
            className="w-5 h-5 mr-1.5 object-contain transition-all duration-300" 
          />
          <p className="text-sm font-bold">システム設定</p>
        </div>

        {/* 📊 拡張ダッシュボードへの切り替え */}
        <div 
          onClick={() => onNavigate?.('personalDashboard')}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg"
          style={{ color: currentConfig.accentColor }}
        >
          <span className="text-sm mr-1">📋</span>
          <p className="text-xs font-bold">個人用ダッシュボード</p>
        </div>

        {isAdmin && (
          <div 
            onClick={() => onNavigate?.('adminDashboard')}
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg"
            style={{ color: currentConfig.accentColor }}
          >
            <span className="text-sm mr-1">📊</span>
            <p className="text-xs font-bold">師長用ダッシュボード</p>
          </div>
        )}

      </div>

      {/* ⌨️ 右側：ショートカット */}
      <div className="shortcut text-xs text-right space-y-0.5 opacity-90 transition-colors duration-300" style={{ color: currentConfig.accentColor }}>
        <p>Ctrl + Tab でカルテへ切り替え</p>
        <p>Alt + A で患者マスターへ切り替え</p>
      </div>
    </footer>
  );
}