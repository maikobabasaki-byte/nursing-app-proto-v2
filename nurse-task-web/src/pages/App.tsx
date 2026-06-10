import React, { useState } from 'react';
import Login from './Login';
import Header from '../components/Header'; 
import Footer from '../components/Footer';
import PatientSelect from "./PatientSelect.tsx"; 
import Timeline from "./Timeline.tsx";
// 自分で作った新しいページや土台をインポート
// import WardMap from "../components/WardMap.tsx"; 
import MainLayout from "../components/MainLayout.tsx"; 

export default function App() {
  // 画面の選択肢に 'map' などを自由に追加できるようになります
  const [currentScreen, setCurrentScreen] = useState<'login' | 'patientSelect' | 'timeline' | 'map'>('login');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ─── 【A：ログイン前の世界】 ─── */}
      {currentScreen === 'login' && (
        <>
          <Header currentPage="login" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50"><Login onLoginSuccess={() => setCurrentScreen('patientSelect')} /></main>
          <Footer />
        </>
      )}

      {currentScreen === 'patientSelect' && (
        <>
          <Header currentPage="patientSelect" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50">
            <PatientSelect onSelectComplete={(list) => {
              setSelectedPatients(list);
              setCurrentScreen('timeline'); // または 'map' へ
            }} />
          </main>
          <Footer />
        </>
      )}

      {/* ─── 【B：ログイン後の世界（GlobalHeaderを使うグループ）】 ─── */}
      {(currentScreen === 'timeline' || currentScreen === 'map') && (
        <MainLayout currentScreen={currentScreen}>
          
          {/* この中身が、MainLayout の {children} の部分にスポッと収まります */}
          {currentScreen === 'timeline' && (
            <Timeline selectedPatients={selectedPatients} />
          )}

          {/* {currentScreen === 'map' && (
            <WardMap onRoomChange={(roomId) => console.log(roomId)} />
          )} */}
          
        </MainLayout>
      )}

    </div>
  ); 
}