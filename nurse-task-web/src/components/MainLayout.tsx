import React from "react";
import GlobalHeader from "./GlobalHeader";
import GlobalFooter from "./GlobalFooter";

interface MainLayoutProps {
  children: React.ReactNode; // ★ここに入れた各画面（Timelineなど）がすっぽり入る
  currentScreen: string;
}

export default function MainLayout({ children, currentScreen }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ログイン後の共通ヘッダーはここに1回書くだけ！ */}
      <GlobalHeader currentPage={currentScreen} /> 
      
      {/* メイン中身（ここが Timeline や Map に入れ替わる） */}
      <div className="flex-1 overflow-hidden w-full">
        {children}
      </div>
      
      {/* ログイン後の共通フッター */}
      <GlobalFooter />
    </div>
  );
}