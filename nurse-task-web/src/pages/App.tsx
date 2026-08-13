import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
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
  const [isSyncingWithPC, setIsSyncingWithPC] = useState<boolean>(false);
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

        // 🎯 【本日の初期設定完了チェック＆PC同期引き継ぎ判定】
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const nurseRef = doc(db, 'nurses', id);
          const nurseSnap = await getDoc(nurseRef);

          if (nurseSnap.exists()) {
            const nurseData = nurseSnap.data();
            if (
              nurseData.last_setup_date === todayStr &&
              Array.isArray(nurseData.assigned_patients) &&
              nurseData.assigned_patients.length > 0
            ) {
              // 🚀 本日の初期設定が別端末(PC等)ですでに完了している！
              setSelectedPatients(nurseData.assigned_patients);
              sessionStorage.setItem('selectedPatients', JSON.stringify(nurseData.assigned_patients));
              
              setIsSyncingWithPC(true);
              setTimeout(() => {
                setIsSyncingWithPC(false);
                setCurrentScreen('patientMaster');
              }, 1200);
              
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("本日データ同期チェックエラー:", e);
        }

        // 💡 未完了の場合は従来通り患者選択画面へ案内
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

  {/* 💻 ↔ 📱 本日のデータをPCと同期中... クッション画面 */}
  if (isSyncingWithPC) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative transition-colors duration-300 select-none p-6"
        style={{ backgroundColor: currentConfig.bgColor }}
      >
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-sky-100 max-w-md w-full flex flex-col items-center gap-5 text-center animate-fade-in">
          {/* 💻 ↔ 📱 同期アニメーションバッジ */}
          <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-3xl shadow-lg text-white">
            <span className="material-symbols-outlined text-4xl animate-bounce">sync</span>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-1">
              本日のデータをPCと同期中...
            </h2>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              PCで設定された受け持ち患者計画を検出しました。<br />
              最新のタイムラインと設定を引き継いでメイン画面へ移動します。
            </p>
          </div>

          {/* スムーズなプログレスバー */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner mt-2">
            <div className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-full rounded-full animate-pulse w-full"></div>
          </div>
        </div>
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