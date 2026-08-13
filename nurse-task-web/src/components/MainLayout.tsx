import React from "react";
import GlobalHeader from "./GlobalHeader";
import GlobalFooter from "./GlobalFooter";
import BottomNav from "./BottomNav";

interface MainLayoutProps {
  children: React.ReactNode; 
  currentScreen: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings';
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map' | 'leaderTodo' | 'settings') => void;
}

export default function MainLayout({ children, currentScreen, onNavigate }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden relative">
      {/* ログイン後の共通ヘッダー */}
      <GlobalHeader currentPage={currentScreen} onNavigate={onNavigate} /> 
      
      {/* メイン中身（モバイル表示時はボトムナビゲーションの高さを考慮した pb-14、PC表示時は pb-0） */}
      <div className="flex-1 min-h-0 overflow-hidden w-full flex flex-col pb-14 md:pb-0">
        {children}
      </div>
      
      {/* 💻 PC版フッター（md以上で表示、モバイルでは非表示） */}
      <div className="hidden md:block shrink-0">
        <GlobalFooter onNavigate={onNavigate} />
      </div>

      {/* 📱 モバイル版ボトムナビゲーション（モバイルのみ表示、md以上で非表示） */}
      <BottomNav currentScreen={currentScreen} onNavigate={onNavigate} />
    </div>
  );
}