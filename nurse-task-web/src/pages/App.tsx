import { useState } from 'react';
import Login from './Login';
import GlobalHeader from '../components/GlobalHeader'; 
import GlobalFooter from '../components/GlobalFooter.tsx'; 
import PatientSelect from "./PatientSelect.tsx"; 
import Timeline from "./Timeline.tsx";
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'patientSelect' | 'timeline'>('login');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  
  return (
    <>
      {/* 1. ログイン画面 */}
      {currentScreen === 'login' && (
        <Login onLoginSuccess={() => setCurrentScreen('patientSelect')} />
      )}

      {/* 2. 患者選択画面 */}
      {currentScreen === 'patientSelect' && (
        <div className="min-h-screen flex flex-col bg-gray-50">
          <GlobalHeader currentPage="patientSelect" /> 
          <PatientSelect 
            onSelectComplete={(selectedList) => {
              setSelectedPatients(selectedList); // IDを保存して
              setCurrentScreen('timeline');      // 即、画面切り替え！
            }} 
          />
          <GlobalFooter />
        </div>
      )}

      {/* 3. タイムライン画面 */}
      {currentScreen === 'timeline' && (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
          <GlobalHeader currentPage="timeline" /> 
          
          {/* 💡 選択された患者IDの配列だけをTimelineにパスする */}
          <div className="flex-1 overflow-hidden w-full">
            <Timeline selectedPatients={selectedPatients} />
          </div>
          
          <GlobalFooter />
        </div>
      )}
    </>
  );
}