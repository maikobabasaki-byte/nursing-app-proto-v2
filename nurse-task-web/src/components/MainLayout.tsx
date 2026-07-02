import React from "react";
import GlobalHeader from "./GlobalHeader";
import GlobalFooter from "./GlobalFooter";

interface MainLayoutProps {
  children: React.ReactNode; 
  currentScreen: 'login' | 'patientSelect' | 'patientMaster' | 'timeline' | 'map'; // 💡 stringから具体的な型に変更して安全性を高めます
  onNavigate: (screen: 'patientSelect' | 'patientMaster' | 'timeline' | 'map') => void; // 💡 画面遷移関数を追加！
}

export default function MainLayout({ children, currentScreen, onNavigate }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ログイン後の共通ヘッダーに、現在の画面と、遷移用関数を渡します */}
      <GlobalHeader currentPage={currentScreen} onNavigate={onNavigate} /> 
      
      {/* メイン中身（ここが Timeline や PatientMasterPage に入れ替わる） */}
      <div className="flex-1 overflow-hidden w-full flex flex-col">
        {children}
      </div>
      
      {/* ログイン後の共通フッター */}
      <GlobalFooter />
    </div>
  );
}