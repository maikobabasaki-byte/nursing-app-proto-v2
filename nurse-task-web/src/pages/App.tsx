import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { reconstructGroups } from '../utils/taskLogic';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { ExtendedTask } from '../types/types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Login from './Login';
import PatientSelect from "./PatientSelect";
import PatientMasterPage from "./PatientMaster";
import Timeline from "./Timeline";
import MapContainer from "./Map";
import MainLayout from "../components/MainLayout";
// import { seedDatabase } from "../scripts/seedDatabase";

import { ensureTodayTasksSynced } from '../services/taskSyncService';

type ScreenType = 'login' | 'patientSelect' | 'timeline' | 'patientMaster' | 'map';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const setTasks = useTimelineStore((state) => state.setTasks);

  // 1. localStorageから現在の画面状態を復元（なければ 'login'）
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    const savedScreen = localStorage.getItem('currentScreen');
    return (savedScreen as ScreenType) || 'login';
  });

  // 2. localStorageから選択患者リストを復元（なければ空配列）
  const [selectedPatients, setSelectedPatients] = useState<string[]>(() => {
    const savedPatients = localStorage.getItem('selectedPatients');
    return savedPatients ? JSON.parse(savedPatients) : [];
  });

  // useEffect(() => {
  //   // アプリ起動時にFirestoreが空なら自動でシードを流し込む
  //   seedDatabase();
  // }, []);

  // 画面が変わるたびにlocalStorageを更新
  useEffect(() => {
    localStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  // 患者リストが変わるたびにlocalStorageを更新
  useEffect(() => {
    localStorage.setItem('selectedPatients', JSON.stringify(selectedPatients));
  }, [selectedPatients]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const id = currentUser.email.split('@')[0];
        setUserName(id);
        
        // 💡 スプレッドシート (GAS) から絶対正本データを直取得して同期
        ensureTodayTasksSynced(id);

        // 💡 クロージャの古い変数に頼らず関数型更新で常に最新の表示画面を判定
        setCurrentScreen((prevScreen) => {
          if (prevScreen === 'login') {
            return 'patientSelect';
          }
          return prevScreen;
        });
      } else {
        setUser(null);
        setUserName('');
        setCurrentScreen('login');
        // ログアウト時はストレージおよびストアのデータもクリア
        localStorage.removeItem('currentScreen');
        localStorage.removeItem('selectedPatients');
        setSelectedPatients([]);
        useTimelineStore.getState().setTasks([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // currentScreenを依存に含めないことで、画面遷移時にリセットされないようにする

  // Firestoreのリアルタイム監視とZustandストアへの同期
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const firestoreTasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          task_id: doc.id,
          display_period: (data.display_period === "undefined" || !data.display_period) 
              ? "" 
              : data.display_period,
        } as ExtendedTask;
      });

      // グループ構造を再構築した上でZustandにセット
      const reconstructed = reconstructGroups(firestoreTasks);
      setTasks(reconstructed);
    });

    return () => unsubscribe();
  }, [user, setTasks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ─── 【A：ログイン前の世界】 ─── */}
      {currentScreen === 'login' && (
        <>
          <Header currentPage="login" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50">
            <Login />
          </main>
          <Footer />
        </>
      )}

      {currentScreen === 'patientSelect' && (
        <>
          <Header currentPage="patientSelect" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50">
            <PatientSelect onSelectComplete={(list) => {
              setSelectedPatients(list);
              setCurrentScreen('patientMaster');
            }} />
          </main>
          <Footer />
        </>
      )}

      {/* ─── 【B：ログイン後の世界（MainLayoutを使うグループ）】 ─── */}
      {(currentScreen === 'patientMaster' || currentScreen === 'timeline' || currentScreen === 'map') && (
        <MainLayout currentScreen={currentScreen} onNavigate={(screen) => setCurrentScreen(screen)}>
          
          {currentScreen === 'patientMaster' && (
            <PatientMasterPage selectedIds={selectedPatients} />
          )}

          {currentScreen === 'timeline' && (
            <Timeline selectedPatients={selectedPatients} />
          )}

          {currentScreen === 'map' && (
            <MapContainer />
          )}
          
        </MainLayout>
      )}

    </div>
  );
}