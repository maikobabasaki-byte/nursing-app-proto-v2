import { useTheme, type AppTheme } from '../../../hooks/useTheme';

// 💡 1. onNavigate の型に 'adminDashboard' を追加
interface GlobalFooterProps {
  onNavigate?: (screen: 'settings' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'adminDashboard') => void;
}

// 🎨 各テーマ別設定アイコン画像マッピング
const SETTINGS_ICONS: Record<AppTheme, string> = {
  vital: '/app/icon_b/settings_48dp.png',
  serene: '/app/icon_s/settings_48dp_FAF3E0_FILL1_wght400_GRAD0_opsz48.png',
  dark: '/app/icon_g/settings_48dp_2DD4BF_FILL1_wght400_GRAD0_opsz48.png',
};

export default function GlobalFooter({ onNavigate }: GlobalFooterProps) {
  const { theme, currentConfig } = useTheme();
  const settingsIconSrc = SETTINGS_ICONS[theme] || SETTINGS_ICONS.vital;

  return (
    <footer
      className="w-full min-h-[50px] flex justify-between items-center px-6 border-t border-white/10 transition-colors duration-300 shrink-0"
      style={{ backgroundColor: currentConfig.mainColor }}
    >
      {/* ⚙️ 左側エリア：ナビゲーション群（flexで横並びに） */}
      <div className="flex items-center gap-6">
        
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

        {/* 📊 新規追加：改善ダッシュボード（拡張版） */}
        <div 
          onClick={() => onNavigate?.('adminDashboard')}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity  px-3 py-1.5 rounded-lg"
          style={{ color: currentConfig.accentColor }}
        >
          <span className="text-base mr-1.5">📊</span>
          <p className="text-sm font-bold">改善ダッシュボード</p>
        </div>

      </div>

      {/* ⌨️ 右側：ショートカット */}
      <div className="shortcut text-xs text-right space-y-0.5 opacity-90 transition-colors duration-300" style={{ color: currentConfig.accentColor }}>
        <p>Ctrl + Tab でカルテへ切り替え</p>
        <p>Alt + A で患者マスターへ切り替え</p>
      </div>
    </footer>
  );
}