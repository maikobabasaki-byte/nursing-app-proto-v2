import { useState } from 'react';
import Login from './Login';
import GlobalHeader from '../components/GlobalHeader'; 
import GlobalFooter from '../components/GlobalFooter.tsx'; 
import PatientSelect from "./PatientSelect.tsx"; // 患者選択画面


export default function App() {
  // 💡 いまどの画面を表示するかを文字で管理します（初期値は 'login'）
  const [currentScreen, setCurrentScreen] = useState<'login' | 'patientSelect' | 'timeline'>('login');

  return (
    <>
      {/* 1. ログイン画面 */}
      {currentScreen === 'login' && (
        <Login onLoginSuccess={() => setCurrentScreen('patientSelect')} />
      )}

      {/* 2. 患者選択画面 */}
      {currentScreen === 'patientSelect' && (
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* 💡 患者マスターのアイコンを青くハイライト */}
          <GlobalHeader currentPage="patientMaster" /> 
          
          <main className="flex-grow">
            {/* 💡 選択が終わったらタイムラインへ進むように関数を渡す例 */}
            <PatientSelect onSelectComplete={() => setCurrentScreen('timeline')} />
          </main>
          
          <GlobalFooter />
        </div>
      )}

      {/* 3. タイムライン画面（明日作ります！） */}
      {currentScreen === 'timeline' && (
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* 💡 タイムラインのアイコンを青くハイライト */}
          <GlobalHeader currentPage="timeline" /> 
          
          <main className="flex-grow">
            <TimelinePC />
          </main>
          
          <GlobalFooter />
        </div>
      )}
    </>
  );
}