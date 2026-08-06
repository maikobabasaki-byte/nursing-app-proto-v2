interface GlobalFooterProps {
  onNavigate?: (screen: 'settings' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo') => void;
}

export default function GlobalFooter({ onNavigate }: GlobalFooterProps) {
  return (
    <footer className="theme-header w-full min-h-[50px] flex justify-between items-center px-6 border-t border-current/10 transition-colors duration-300">
      
      {/* ⚙️ 左側：システム設定（クリックで settings 画面に移動） */}
      <div 
        onClick={() => onNavigate?.('settings')}
        className="setting flex items-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img 
          src="/icon_b/settings_48dp.png" 
          alt="システム設定" 
          className="w-5 h-5 mr-1.5" 
        />
        <p className="text-sm font-medium">システム設定</p>
      </div>

      {/* ⌨️ 右側：ショートカット（看護現場の作業効率を上げる案内） */}
      <div className="shortcut text-xs text-right space-y-0.5 opacity-80">
        <p>Ctrl + Tab でカルテへ切り替え</p>
        <p>Alt + A で患者マスターへ切り替え</p>
      </div>

    </footer>
  );
}