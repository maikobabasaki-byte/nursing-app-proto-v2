import React from "react";
import GlobalHeader from "./GlobalHeader";
import GlobalFooter from "./GlobalFooter";
import BottomNav from "./BottomNav";
import { useTheme } from "../hooks/useTheme";

interface MainLayoutProps {
  children: React.ReactNode; 
  currentScreen: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings';
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings') => void;
}

export default function MainLayout({ children, currentScreen, onNavigate }: MainLayoutProps) {
  const { currentConfig } = useTheme();

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative transition-colors duration-300"
      style={{ backgroundColor: currentConfig.bgColor }}
    >
      {/* ログイン後の共通ヘッダー */}
      <GlobalHeader currentPage={currentScreen} onNavigate={onNavigate} /> 
      
      {/* メイン中身（モバイル・タブレット表示時はボトムナビゲーションの高さを考慮した pb-14、PC表示時は pb-0） */}
      <div
        className="flex-1 min-h-0 overflow-hidden w-full flex flex-col pb-14 lg:pb-0 transition-colors duration-300"
        style={{ backgroundColor: currentConfig.bgColor }}
      >
        {children}
      </div>
      
      {/* 💻 PC版フッター（lg以上で表示、モバイル・タブレットでは非表示） */}
      <div className="hidden lg:block shrink-0 relative z-30">
        <GlobalFooter onNavigate={onNavigate} />
      </div>

      {/* 📱 モバイル版ボトムナビゲーション（モバイルのみ表示、md以上で非表示） */}
      <BottomNav currentScreen={currentScreen} onNavigate={onNavigate} />
    </div>
  );
}