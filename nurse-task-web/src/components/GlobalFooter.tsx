export default function GlobalFooter() {
  return (
    // 💡 !つけることで、既存の強固なCSS（space-betweenなど）が外側にあっても
    // 確実にTailwindのスタイル（高さ、背景色、文字色、パディング）を適用させます。
    <footer className="w-full min-h-[50px] bg-sky-200 text-gray-700 flex justify-between items-center px-6 py-3">
      
      {/* ⚙️ 左側：システム設定（クリックできるようにcursor-pointerを付与） */}
      <div className="setting flex items-center cursor-pointer hover:opacity-80 transition-opacity">
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