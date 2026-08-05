import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { reconstructGroups } from '../utils/taskLogic';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { NurseMaster, NursePin } from '../stores/useTimelineStore';
import type { ExtendedTask } from '../types/types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Login from './Login';
import PatientSelect from "./PatientSelect";
import PatientMasterPage from "./PatientMaster";
import Timeline from "./Timeline";
import MapContainer from "./Map";
import { LeaderTodoPage } from "./LeaderTodoPage";
import MainLayout from "../components/MainLayout";
// import { seedDatabase } from "../scripts/seedDatabase";

import { ensureTodayTasksSynced } from '../services/taskSyncService';

type ScreenType = 'login' | 'patientSelect' | 'timeline' | 'patientMaster' | 'map' | 'leaderTodo';

import { GlobalSosToast } from '../components/GlobalSosToast';

import { fetchGASData } from '../services/gasService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const setTasks = useTimelineStore((state) => state.setTasks);

  // 1. sessionStorageから現在の画面状態を復元（タブごとの独立セッション対応）
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    const savedScreen = sessionStorage.getItem('currentScreen');
    return (savedScreen as ScreenType) || 'login';
  });

  // 2. sessionStorageから選択患者リストを復元
  const [selectedPatients, setSelectedPatients] = useState<string[]>(() => {
    const savedPatients = sessionStorage.getItem('selectedPatients');
    return savedPatients ? JSON.parse(savedPatients) : [];
  });

  // 画面が変わるたびにsessionStorageを更新
  useEffect(() => {
    sessionStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  // 患者リストが変わるたびにsessionStorageおよびZustandストアを同期更新
  useEffect(() => {
    sessionStorage.setItem('selectedPatients', JSON.stringify(selectedPatients));
    useTimelineStore.getState().setSelectedPatients(selectedPatients);
  }, [selectedPatients]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const id = currentUser.email.split('@')[0];
        setUserName(id);
        
        // 💡 スプレッドシート (GAS) から絶対正本データを直取得して同期
        ensureTodayTasksSynced(id);

        // 💡 Firestoreの nurse_master コレクションから email でクエリ名寄せ検索
        try {
          const q = query(collection(db, 'nurse_master'), where('email', '==', currentUser.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const matchedDoc = querySnapshot.docs[0];
            const data = matchedDoc.data();
            const profile = {
              nurse_id: matchedDoc.id,
              name: data.name || id,
              email: currentUser.email,
              team: data.team || '',
              is_leader: Boolean(data.is_leader),
            };
            setUserName(profile.name);
            useTimelineStore.getState().setCurrentUser(profile);
          } else {
            const fallbackProfile = {
              nurse_id: id,
              name: id,
              email: currentUser.email,
            };
            useTimelineStore.getState().setCurrentUser(fallbackProfile);
          }
        } catch (e) {
          console.error("Auth nurse_master クエリ設定エラー:", e);
        }

        // 💡 看護師マスターデータをGASから取得してZustandにセット (フォールバック)
        fetchGASData().then((res) => {
          if (res.nurses && res.nurses.length > 0) {
            useTimelineStore.getState().setNurseMaster(res.nurses);
          }
        });

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
        sessionStorage.removeItem('currentScreen');
        sessionStorage.removeItem('selectedPatients');
        setSelectedPatients([]);
        useTimelineStore.getState().setTasks([]);
        useTimelineStore.getState().setCurrentUser(null);
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

      // 🧠 【チラつき完全防止】自分自身の書き込み中 (hasPendingWrites) の通知はローカル楽観Stateを優先してスキップ
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const currentLocalTasks = useTimelineStore.getState().allTasks;

      // 💡 防御ロジック: Firestoreの取得件数が0件でローカルに既存タスクが存在する場合、誤消去を防ぐため更新を破棄
      if (firestoreTasks.length === 0 && currentLocalTasks.length > 0) {
        return;
      }

      const mergedTasks = firestoreTasks.map((ft) => {
        const localMatch = currentLocalTasks.find(lt => lt.task_id === ft.task_id) ||
                           currentLocalTasks.flatMap(lt => lt.children || []).find(c => c.task_id === ft.task_id);
        if (localMatch && localMatch.parent_id !== undefined) {
          return { ...ft, parent_id: localMatch.parent_id };
        }
        return ft;
      });

      // グループ構造を再構築した上でZustandにセット
      const reconstructed = reconstructGroups(mergedTasks);
      setTasks(reconstructed);
    });

    return () => unsubscribe();
  }, [user, setTasks]);

  // 💡 Firestoreの看護師マスターデータ (nurse_masterコレクション) リアルタイム監視
  useEffect(() => {
    if (!user) return;

    const unsubscribeNurseMaster = onSnapshot(collection(db, "nurse_master"), (snapshot) => {
      const masters = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          nurse_id: doc.id,
          name: data.name || '',
          gender: data.gender || '',
          team: data.team || '',
          email: data.email || '',
          is_leader: Boolean(data.is_leader),
        } as NurseMaster;
      });

      if (masters.length > 0) {
        useTimelineStore.getState().setNurseMaster(masters);
      }
    });

    return () => unsubscribeNurseMaster();
  }, [user]);

  // 💡 Firestoreの看護師SOS状態 (nursesコレクション) リアルタイム監視と全端末同期
  useEffect(() => {
    if (!user) return;

    const unsubscribeNurses = onSnapshot(collection(db, "nurses"), (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const firestoreNurses = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          nurse_id: doc.id,
          ...data,
        } as NursePin;
      });

      if (firestoreNurses.length > 0) {
        useTimelineStore.getState().setNurses(firestoreNurses);
      }
    });

    return () => unsubscribeNurses();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      {/* 💡 全画面共通の看護師SOSグローバル通知トースト */}
      <GlobalSosToast />

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
      {(currentScreen === 'patientMaster' || currentScreen === 'timeline' || currentScreen === 'map' || currentScreen === 'leaderTodo') && (
        <MainLayout currentScreen={currentScreen} onNavigate={(screen) => setCurrentScreen(screen)}>
          
          {currentScreen === 'patientMaster' && (
            <PatientMasterPage selectedIds={selectedPatients} />
          )}

          {currentScreen === 'timeline' && (
            <Timeline selectedPatients={selectedPatients} />
          )}

          {currentScreen === 'map' && (
            <MapContainer selectedPatients={selectedPatients} />
          )}

          {currentScreen === 'leaderTodo' && (
            <LeaderTodoPage />
          )}
          
        </MainLayout>
      )}

    </div>
  );
}