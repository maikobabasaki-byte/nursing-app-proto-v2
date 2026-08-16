import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getJSTDateString } from '../utils/dateUtils';
import { auth, db, registerActiveDateInFirestore } from '../lib/firebase';
import { collection, getDocs, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { reconstructGroups } from '../utils/taskLogic';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { NurseMaster, NursePin } from '../stores/useTimelineStore';
import type { ExtendedTask, LeaderTodo } from '../types/types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MainLayout from "../components/MainLayout";
import { startTutorialByPath } from '../components/Tutorial/tutorial';

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
import OfflineIndicator from '../components/OfflineIndicator';

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
      if (currentUser) {
        setUser(currentUser);
        const id = currentUser.email ? currentUser.email.split('@')[0] : currentUser.uid;

        // 🎯 sessionStorageに保存されている画面を取得（リロード時の画面状態を安全に復元）
        const savedScreen = sessionStorage.getItem('currentScreen') as ScreenType | null;

        // 🎯 ゲストユーザー（is_guest_session === 'true' または 匿名ログイン isAnonymous）の場合のみシードデータを同期
        const isGuest = currentUser.isAnonymous || sessionStorage.getItem('is_guest_session') === 'true';
        if (isGuest) {
          const guestRole = (sessionStorage.getItem('nurseflow_guest_role') as 'leader' | 'member') || 'leader';
          const isLeader = guestRole === 'leader';
          const guestName = isLeader ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）';

          console.log(`👤 [AuthCheck] ゲストユーザー(${guestRole})を検出しました! (UID: ${currentUser.uid}, isAnonymous: ${currentUser.isAnonymous})`);

          useTimelineStore.getState().setCurrentUser({
            nurse_id: currentUser.uid,
            name: guestName,
            email: currentUser.email || 'guest@nurseflow.local',
            is_leader: isLeader,
            team: 'Aチーム',
            isAnonymous: currentUser.isAnonymous,
          });

          console.log("🌱 [AuthCheck] ゲストデータのローカル初期化中...");
          setIsSyncingWithPC(true);

          try {
            const { seedGuestData } = await import('../services/guestSeedService');
            const guestPatientIds = await seedGuestData(currentUser.uid, guestRole);
            if (Array.isArray(guestPatientIds) && guestPatientIds.length > 0) {
              setSelectedPatients(guestPatientIds);
              sessionStorage.setItem('selectedPatients', JSON.stringify(guestPatientIds));
            }
            console.log("🚀 [AuthCheck] ゲストはGASデータと連携せず、ローカル初期化が完了しました! 患者数:", guestPatientIds?.length);
          } catch (syncErr) {
            console.warn("⚠️ ゲスト初期化ワーニング:", syncErr);
          } finally {
            setIsSyncingWithPC(false);
            // 💡 ゲストユーザーは初回ログイン時、固定デモデータが存在するため直接『患者マスター画面(patientMaster)』へ遷移
            const guestTarget = (savedScreen && savedScreen !== 'login') ? savedScreen : 'patientMaster';
            setCurrentScreen(guestTarget);
            setLoading(false);
          }
          return;
        }

        // 🔒 正規ユーザーの場合: ゲスト用ストレージキーを確実にクリア
        sessionStorage.removeItem('is_guest_session');
        sessionStorage.removeItem('nurseflow_guest_role');

        if (currentUser.email) {
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
        }

        // 🎯 【本日のログイン回数・データ同期・画面切り替え判定】
        try {
          const todayStr = getJSTDateString();
          registerActiveDateInFirestore(todayStr);

          // 💡 本日の「初回ログイン時のみ」スプレッドシート (GAS) の確認・同期を行う
          const lastSyncedDate = localStorage.getItem(`gas_synced_date_${id}`);
          if (lastSyncedDate !== todayStr) {
            console.log(`🌅 [FirstLoginToday] 本日 (${todayStr}) の初回ログインを検出。スプレッドシート (GAS) データを同期中...`);
            ensureTodayTasksSynced(id).catch((e) => console.error("初回GAS同期エラー:", e));
            localStorage.setItem(`gas_synced_date_${id}`, todayStr);
          } else {
            console.log(`⚡ [FastLogin] 本日 (${todayStr}) は既にログイン・同期済みです。Firestoreキャッシュから高速読み込みします。`);
          }

          const nurseRef = doc(db, 'nurses', id);
          const nurseSnap = await getDoc(nurseRef);

          if (nurseSnap.exists()) {
            const nurseData = nurseSnap.data();
            const isSetupDoneToday = nurseData.last_setup_date === todayStr &&
              Array.isArray(nurseData.assigned_patients) &&
              nurseData.assigned_patients.length > 0;

            if (isSetupDoneToday) {
              // 🚀 【本日の2回目以降のログイン】データを同期し、患者マスター画面 (またはリロード元の画面) を表示！
              setSelectedPatients(nurseData.assigned_patients);
              sessionStorage.setItem('selectedPatients', JSON.stringify(nurseData.assigned_patients));

              const target = (savedScreen && savedScreen !== 'login') ? savedScreen : 'patientMaster';
              setCurrentScreen(target);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("本日データ同期チェックエラー:", e);
        }

        // 🌅 【本日の初回 (1回目) ログイン】または初期設定未完了時:『患者選択画面(patientSelect)』を表示！
        const firstLoginTarget = (savedScreen && savedScreen !== 'login') ? savedScreen : 'patientSelect';
        setCurrentScreen(firstLoginTarget);
        setLoading(false);
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
  }, []);

  // 💡 画面切り替え時に画面単体ガイド（tutorialStepsByPath）を自動トリガー
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      startTutorialByPath(currentScreen, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScreen, user]);

  const selectedDate = useTimelineStore((state) => state.selectedDate);

  // Firestoreのリアルタイム監視とZustandストアへの同期
  useEffect(() => {
    if (!user) return;

    const isGuestUser = Boolean(user.isAnonymous || (user.email && user.email.includes('guest')) || sessionStorage.getItem('is_guest_session') === 'true');
    if (isGuestUser) {
      console.log("👻 [App] ゲストユーザーのため、Firestoreからのタスク上書き監視をスキップしローカルシードデータを保護します");
      return;
    }

    const todayStr = getJSTDateString();

    const unsubscribe = onSnapshot(
      collection(db, "tasks"), 
      (snapshot) => {
        // 💡 重複タスクの排除（taskId固有ID単位でデデュープ）
        const uniqueTaskMap = new Map<string, ExtendedTask>();
        const extractedPatientSosList: any[] = [];

        snapshot.docs.forEach((docItem) => {
          const data = docItem.data();
          const taskId = docItem.id;

          // 📅 稼働日一覧専用ドキュメントの抽出と同期（権限エラー回避のため tasks 内で一括管理）
          if (taskId === 'system-active-dates' || data.is_active_dates === true) {
            if (Array.isArray(data.active_dates)) {
              useTimelineStore.getState().setActiveDates(data.active_dates);
            }
            return;
          }

          // 🚨 患者SOS専用ドキュメントの抽出と除外（タイムラインの通常タスクとは分離）
          if (taskId.startsWith('patient-sos-') || data.is_patient_sos === true) {
            if (data.is_sos !== false) {
              extractedPatientSosList.push({
                patient_id: data.patient_id || taskId.replace('patient-sos-', ''),
                patient_name: data.patient_name || '',
                room_id: data.room_id || '',
                reason: data.reason || data.sos_reason || '',
                requested_by_id: data.requested_by_id || '',
                requested_by_name: data.requested_by_name || '',
                created_at: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              });
            }
            return;
          }

          // 📅 日付によるパーティショニングフィルタ（選択中の日付のタスクのみ読み込み）
          const taskTargetDate = data.target_date || todayStr;
          if (taskTargetDate !== selectedDate) {
            return;
          }

          // 🛡️ 通常メンバーログイン時は、一時ゲスト作成タスクのみを除外
          if (!isGuestUser) {
            if (taskId.startsWith('GUEST-TASK-') || data.is_guest === true) {
              return;
            }
          }

          // 👻 不完全な空タスク（ゴーストタスク）を完全に除外
          const title = String(data.title || data.task_name || data.taskName || '').trim();
          if (!title || title === '無題タスク') {
            return;
          }

          const period = (data.display_period === "undefined" || !data.display_period) ? "" : data.display_period;
          const taskObj = {
            ...data,
            task_id: taskId,
            display_period: period,
          } as ExtendedTask;

          if (!uniqueTaskMap.has(taskId)) {
            uniqueTaskMap.set(taskId, taskObj);
          }
        });

        // 📡 全端末で患者SOSリストを同期
        useTimelineStore.getState().setPatientSosList(extractedPatientSosList);

        const firestoreTasks = Array.from(uniqueTaskMap.values());

        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        const currentLocalTasks = useTimelineStore.getState().allTasks;

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
        } else if (error.code === 'permission-denied') {
          console.warn("⚠️ [Tasks] Firestoreアクセス権限を確定中（認証トークン確立待ち）...");
        } else {
          console.error("Firestore tasks 取得エラー:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [user, setTasks, selectedDate]);

  // 💡 Firestoreの看護師マスターデータ (nurse_masterコレクション) リアルタイム監視
  useEffect(() => {
    if (!user) return;
    const isGuestUser = Boolean(user.isAnonymous || (user.email && user.email.includes('guest')));

    const unsubscribeNurseMaster = onSnapshot(
      collection(db, "nurse_master"), 
      (snapshot) => {
        const masters = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              nurse_id: doc.id,
              name: data.name || '',
              gender: data.gender || '',
              team: data.team || '',
              email: data.email || '',
              is_leader: Boolean(data.is_leader),
            } as NurseMaster;
          })
          .filter((m) => {
            if (!isGuestUser) {
              const emailStr = m.email || '';
              if (m.nurse_id.includes('guest') || m.name.includes('ゲスト') || emailStr.includes('guest')) {
                return false;
              }
            }
            return true;
          });

        if (masters.length > 0) {
          useTimelineStore.getState().setNurseMaster(masters);
        }
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [NurseMaster] Firestoreのクォータ上限に到達しました。");
        } else if (error.code === 'permission-denied') {
          console.warn("⚠️ [NurseMaster] Firestoreアクセス権限を確定中...");
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

        const firestoreNurses = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              nurse_id: doc.id,
              ...data,
            } as NursePin;
          })
          .filter((n) => {
            const currentUserId = user?.uid || useTimelineStore.getState().currentUser?.nurse_id;
            const isSelf = n.nurse_id === currentUserId;
            const isGuestNurse = Boolean(
              n.nurse_id?.includes('guest') ||
              n.nurse_id?.startsWith('GUEST-') ||
              (n.email && n.email.includes('guest')) ||
              (n.name && n.name.includes('ゲスト')) ||
              (n.role && n.role.includes('ゲスト'))
            );
            // 💡 自分以外のゲストユーザーをマップから除外（他のゲストユーザーとお互いに見えないようにする）
            if (!isSelf && isGuestNurse) {
              return false;
            }
            return true;
          });

        if (firestoreNurses.length > 0) {
          useTimelineStore.getState().setNurses(firestoreNurses);
        }
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [Nurses] Firestoreのクォータ上限に到達しました。");
        } else if (error.code === 'permission-denied') {
          console.warn("⚠️ [Nurses] Firestoreアクセス権限を確定中...");
        }
      }
    );

    return () => unsubscribeNurses();
  }, [user]);

  // 💡 FirestoreのリーダーTODO (leader_todosコレクション) リアルタイム監視と全端末同期
  useEffect(() => {
    if (!user) return;
    const isGuestUser = Boolean(user.isAnonymous || (user.email && user.email.includes('guest')));

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
          .filter((todo) => {
            if (todo.is_deleted || todo.status === 'deleted') return false;
            if (!isGuestUser) {
              if (todo.todo_id.startsWith('GUEST-TODO') || (todo.patient_id && todo.patient_id.startsWith('P-GUEST'))) {
                return false;
              }
            }
            return true;
          });

        useTimelineStore.getState().setLeaderTodos(firestoreTodos);
      },
      (error) => {
        if (error.code === 'resource-exhausted') {
          console.warn("⚠️ [LeaderTodos] Firestoreのクォータ上限に到達しました。");
        } else if (error.code === 'permission-denied') {
          console.warn("⚠️ [LeaderTodos] Firestoreアクセス権限を確定中...");
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
      {/* 📡 全画面共通のネットワークオフライン検知インジケーター */}
      <OfflineIndicator />

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
                useTimelineStore.getState().setSelectedPatients(list);
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