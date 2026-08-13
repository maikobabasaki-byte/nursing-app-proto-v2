import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { reconstructGroups } from '../utils/taskLogic';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { NurseMaster, NursePin } from '../stores/useTimelineStore';
import type { ExtendedTask, LeaderTodo } from '../types/types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MainLayout from "../components/MainLayout";

// 🚀 コードスプリッティング（遅延ローディング）の設定
const Login = lazy(() => import('./Login'));
const PatientSelect = lazy(() => import('./PatientSelect'));
const PatientMasterPage = lazy(() => import('./PatientMaster'));
const Timeline = lazy(() => import('./Timeline'));
const MapContainer = lazy(() => import('./Map'));
const LeaderTodoPage = lazy(() => import('./LeaderTodoPage').then((module) => ({ default: module.LeaderTodoPage })));
const Settings = lazy(() => import('./Settings'));

// 🎨 画面読み込み用の上質スピナーコンポーネント
const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] h-full w-full bg-gray-50/80 animate-fade-in">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-md"></div>
      <p className="text-xs font-bold text-gray-500 tracking-wider">画面コンポーネントを読み込み中...</p>
    </div>
  </div>
);

import { ensureTodayTasksSynced } from '../services/taskSyncService';

type ScreenType = 'login' | 'patientSelect' | 'timeline' | 'patientMaster' | 'map' | 'leaderTodo' | 'settings';

import { GlobalSosToast } from '../components/GlobalSosToast';

import { fetchGASData } from '../services/gasService';

import { useTheme } from '../hooks/useTheme';

export default function App() {
  const { currentConfig } = useTheme();
  const [user, setUser] = useState<User | null>(null);
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
        setCurrentScreen('login');
        // ログアウト時はストレージおよびストアの全個人情報・タスク・メモキャッシュを完全消去
        sessionStorage.removeItem('currentScreen');
        sessionStorage.removeItem('selectedPatients');
        setSelectedPatients([]);
        useTimelineStore.getState().resetStoreData();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // currentScreenを依存に含めないことで、画面遷移時にリセットされないようにする

  // Firestoreのリアルタイム監視とZustandストアへの同期
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "tasks"), 
      (snapshot) => {
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

        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        const currentLocalTasks = useTimelineStore.getState().allTasks;

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

        const reconstructed = reconstructGroups(mergedTasks);
        setTasks(reconstructed);
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [Tasks] Firestoreのクォータ上限を超発したため、静的・GASデータ優先モードで動作を継続します。");
        } else {
          console.error("Firestore tasks 取得エラー:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [user, setTasks]);

  // 💡 Firestoreの看護師マスターデータ (nurse_masterコレクション) リアルタイム監視
  useEffect(() => {
    if (!user) return;

    const unsubscribeNurseMaster = onSnapshot(
      collection(db, "nurse_master"), 
      (snapshot) => {
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
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [NurseMaster] Firestoreのクォータ上限に到達しました。");
        }
      }
    );

    return () => unsubscribeNurseMaster();
  }, [user]);

  // 💡 Firestoreの看護師SOS状態 (nursesコレクション) リアルタイム監視と全端末同期
  useEffect(() => {
    if (!user) return;

    const unsubscribeNurses = onSnapshot(
      collection(db, "nurses"), 
      (snapshot) => {
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
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [Nurses] Firestoreのクォータ上限に到達しました。");
        }
      }
    );

    return () => unsubscribeNurses();
  }, [user]);

  // 💡 FirestoreのリーダーTODO (leader_todosコレクション) リアルタイム監視と全端末同期
  useEffect(() => {
    if (!user) return;

    const unsubscribeLeaderTodos = onSnapshot(
      collection(db, "leader_todos"), 
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        const firestoreTodos = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              ...data,
              todo_id: doc.id,
            } as LeaderTodo;
          })
          .filter((todo) => !todo.is_deleted && todo.status !== 'deleted');

        useTimelineStore.getState().setLeaderTodos(firestoreTodos);
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [LeaderTodos] Firestoreのクォータ上限に到達しました。");
        } else {
          console.error("Firestore leader_todos 取得エラー:", error);
        }
      }
    );

    return () => unsubscribeLeaderTodos();
  }, [user]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: currentConfig.bgColor }}
      >
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative transition-colors duration-300"
      style={{ backgroundColor: currentConfig.bgColor }}
    >
      {/* 💡 全画面共通の看護師SOSグローバル通知トースト */}
      <GlobalSosToast />

      {/* ─── 【A：ログイン前の世界】 ─── */}
      {currentScreen === 'login' && (
        <>
          <Header currentPage="login" />
          <main
            className="flex-1 !flex items-center justify-center transition-colors duration-300"
            style={{ backgroundColor: currentConfig.bgColor }}
          >
            <Suspense fallback={<PageLoadingFallback />}>
              <Login />
            </Suspense>
          </main>
          <Footer />
        </>
      )}

      {currentScreen === 'patientSelect' && (
        <>
          <Header currentPage="patientSelect" />
          <main
            className="flex-1 !flex items-center justify-center transition-colors duration-300"
            style={{ backgroundColor: currentConfig.bgColor }}
          >
            <Suspense fallback={<PageLoadingFallback />}>
              <PatientSelect onSelectComplete={(list) => {
                setSelectedPatients(list);
                setCurrentScreen('patientMaster');
              }} />
            </Suspense>
          </main>
          <Footer />
        </>
      )}

      {/* ─── 【B：保護されたルート（MainLayoutを使うグループ）】 ─── */}
      {(currentScreen === 'patientMaster' || currentScreen === 'timeline' || currentScreen === 'map' || currentScreen === 'leaderTodo' || currentScreen === 'settings') && (
        user ? (
          <MainLayout currentScreen={currentScreen} onNavigate={(screen) => setCurrentScreen(screen)}>
            <Suspense fallback={<PageLoadingFallback />}>
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

              {currentScreen === 'settings' && (
                <Settings />
              )}
            </Suspense>
          </MainLayout>
        ) : (
          /* 🛡️ 未ログイン状態での保護ルートアクセスに対するRoute Guard（強制ログインリダイレクト） */
          <>
            <Header currentPage="login" />
            <main
              className="flex-1 !flex items-center justify-center transition-colors duration-300"
              style={{ backgroundColor: currentConfig.bgColor }}
            >
              <Suspense fallback={<PageLoadingFallback />}>
                <Login />
              </Suspense>
            </main>
            <Footer />
          </>
        )
      )}

    </div>
  );
}