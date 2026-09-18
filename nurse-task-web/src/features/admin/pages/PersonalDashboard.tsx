import React, { useState, useEffect, useRef } from 'react';

// Zustandストア・Firebase認証・ユーザーユーティリティのインポート
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { auth, db } from '../../../lib/firebase';
import { checkIsLeader } from '../../../utils/userUtils';
import { getJSTDateString } from '../../../utils/dateUtils';

// 型定義・モックデータのインポート
import type {
  UserRoleInfo,
  TimelineItem,
  GapItem,
  GapSubSegment,
  KPTReflection,
  KolbReflection,
  ModularReflection,
  ItemChatMessage,
} from '../types/personalDashboard';
import { STAFF_PROFILES } from '../data/mockPersonalDashboardData';

// モジュール化されたサブコンポーネントのインポート
import { StaffOverviewCard } from '../components/personalDashboard/StaffOverviewCard';
import { TimelineScheduleSection } from '../components/personalDashboard/TimelineScheduleSection';
import { PerformanceChartsSection } from '../components/personalDashboard/PerformanceChartsSection';
import { DailyReflectionSection } from '../components/personalDashboard/DailyReflectionSection';

// 後方互換性のための型・定数の再エクスポート
export type * from '../types/personalDashboard';
export { GAP_ACTIVITY_OPTIONS } from '../types/personalDashboard';

/**
 * 看護師向け 個人パフォーマンス＆タイムラインダッシュボード
 */
export const PersonalDashboard: React.FC = () => {
  // ログイン認証状態（Zustandストア / Firebase認証）よりロール判定
  const storeUser = useTimelineStore((state) => state.currentUser);
  const selectedDate = useTimelineStore((state) => state.selectedDate) || getJSTDateString();
  const setSelectedDate = useTimelineStore((state) => state.setSelectedDate);
  const firebaseUser = auth.currentUser;

  const derivedRole: 'admin' | 'nurse' =
    storeUser?.role === 'admin' || checkIsLeader(storeUser) || checkIsLeader(firebaseUser)
      ? 'admin'
      : 'nurse';

  const [roleOverride, setRoleOverride] = useState<'admin' | 'nurse' | 'auto'>('auto');
  const activeRole: 'admin' | 'nurse' = roleOverride === 'auto' ? derivedRole : roleOverride;

  const loggedInUserId = storeUser?.nurse_id || storeUser?.staff_id || 'nurse05';
  const loggedInUserName = storeUser?.name || (activeRole === 'admin' ? '山田 師長' : '田中 結衣');

  const currentUser: UserRoleInfo = {
    id: loggedInUserId,
    name: loggedInUserName,
    role: activeRole,
  };

  const targetUserId = useTimelineStore((state) => state.targetUserId) || loggedInUserId;
  const setTargetUserId = useTimelineStore((state) => state.setTargetUserId);
  const [chartView, setChartView] = useState<'radar' | 'pace'>('radar');
  const [timelineViewMode, setTimelineViewMode] = useState<'patient' | 'gantt' | 'table'>('patient');

  const [now, setNow] = useState<Date>(new Date());
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayTimeInfo = () => {
    let hours: number;
    let minutes: number;

    if (simulatedTimeStr) {
      const [h, m] = simulatedTimeStr.split(':').map(Number);
      hours = h;
      minutes = m || 0;
    } else {
      hours = now.getHours();
      minutes = now.getMinutes();
    }

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const minFrom8 = (hours * 60 + minutes) - 480;
    const clampedMin = Math.max(0, Math.min(600, minFrom8));
    const topPx = (clampedMin / 600) * 1200;
    const isOutOfRange = minFrom8 < 0 || minFrom8 > 600;

    return { timeStr, minFrom8, topPx, isOutOfRange };
  };

  const { timeStr: currentTimeStr, topPx: currentTopPx } = getDisplayTimeInfo();

  const [showGaps, setShowGaps] = useState<boolean>(true);

  const [gapSegments, setGapSegments] = useState<Record<string, GapSubSegment[]>>({
    'gap-t1-t2': [
      { id: 'seg-t1-t2-1', minutes: 30, activity: '📝 看護記録・SOAP入力' },
      { id: 'seg-t1-t2-2', minutes: 30, activity: '☕ 休憩・小休止' },
    ],
    'gap-t4-t5': [
      { id: 'seg-t4-t5-1', minutes: 45, activity: '🍱 昼休憩・食事' },
      { id: 'seg-t4-t5-2', minutes: 20, activity: '📝 看護記録・SOAP入力' },
    ],
  });

  // 📝 振り返りフォーマット管理 State
  const [reflectionFormats, setReflectionFormats] = useState<Record<string, 'free' | 'kpt' | 'kolb' | 'modular'>>({
    N001: 'modular',
    N002: 'modular',
    N003: 'modular',
  });

  // 📝 自由記述 State
  const [userFreeReflections, setUserFreeReflections] = useState<Record<string, string>>({
    N001: STAFF_PROFILES['N001'].reflection.nurseSelfReflection,
    N002: STAFF_PROFILES['N002'].reflection.nurseSelfReflection,
    N003: STAFF_PROFILES['N003'].reflection.nurseSelfReflection,
  });

  // 📝 自由記述 インラインチャット State
  const [userFreeChats, setUserFreeChats] = useState<Record<string, ItemChatMessage[]>>({
    N001: [],
    N002: [
      {
        id: 'c-free-1',
        senderId: 'admin01',
        senderName: '山田 師長',
        senderRole: 'admin',
        senderAvatarEmoji: '👩‍⚕️',
        text: '田中さん、本日もお疲れ様でした！患者様への声かけがとても丁寧で安心感を与えられていますよ。体位変換の事前準備は明日一緒に確認しましょうね！',
        createdAt: '16:30',
      },
      {
        id: 'c-free-2',
        senderId: 'nurse05',
        senderName: '田中 結衣',
        senderRole: 'nurse',
        senderAvatarEmoji: '🌱',
        text: '山田師長、コメントありがとうございます！明日朝の申し送り後に事前準備のご指導よろしくお願いいたします！',
        createdAt: '16:45',
      },
    ],
    N003: [],
  });

  // 📊 KPT法 State
  const [userKPTReflections, setUserKPTReflections] = useState<Record<string, KPTReflection>>({
    N001: STAFF_PROFILES['N001'].reflection.kpt,
    N002: STAFF_PROFILES['N002'].reflection.kpt,
    N003: STAFF_PROFILES['N003'].reflection.kpt,
  });

  // 📊 KPT 各項目用インラインチャット State
  const [userKPTChats, setUserKPTChats] = useState<Record<string, {
    keepComments: ItemChatMessage[];
    problemComments: ItemChatMessage[];
    tryComments: ItemChatMessage[];
  }>>({
    N001: { keepComments: [], problemComments: [], tryComments: [] },
    N002: {
      keepComments: [
        {
          id: 'c-kpt-k1',
          senderId: 'admin01',
          senderName: '山田 師長',
          senderRole: 'admin',
          senderAvatarEmoji: '👩‍⚕️',
          text: '【Good!】バイタル測定と傾聴の手順が非常に丁寧です！患者様への思いやりを今後も継続してくださいね😊',
          createdAt: '16:30',
        },
        {
          id: 'c-kpt-k2',
          senderId: 'nurse05',
          senderName: '田中 結衣',
          senderRole: 'nurse',
          senderAvatarEmoji: '🌱',
          text: 'ありがとうございます！今後も丁寧な対応を心がけます！',
          createdAt: '16:45',
        },
      ],
      problemComments: [
        {
          id: 'c-kpt-p1',
          senderId: 'admin01',
          senderName: '山田 師長',
          senderRole: 'admin',
          senderAvatarEmoji: '👩‍⚕️',
          text: '【アドバイス】11時台の12分遅延は事前準備が要因です。始業前に必要物品をカートへ準備すると解決しますよ👍',
          createdAt: '16:32',
        },
      ],
      tryComments: [
        {
          id: 'c-kpt-t1',
          senderId: 'admin01',
          senderName: '山田 師長',
          senderRole: 'admin',
          senderAvatarEmoji: '👩‍⚕️',
          text: '【サポート】10:45頃に声をかけてくれればいつでもペア介助に入りますので遠慮なく頼んでくださいね！',
          createdAt: '16:40',
        },
      ],
    },
    N003: { keepComments: [], problemComments: [], tryComments: [] },
  });

  // 🔄 経験学習モデル (Kolb) State
  const [userKolbReflections, setUserKolbReflections] = useState<Record<string, KolbReflection>>({
    N001: STAFF_PROFILES['N001'].reflection.kolb,
    N002: STAFF_PROFILES['N002'].reflection.kolb,
    N003: STAFF_PROFILES['N003'].reflection.kolb,
  });

  // 🔄 Kolb 各グループ用インラインチャット State
  const [userKolbChats, setUserKolbChats] = useState<Record<string, {
    expRefComments: ItemChatMessage[]; // 経験・省察チャット
    conceptExpComments: ItemChatMessage[]; // 概念化・実践チャット
  }>>({
    N001: { expRefComments: [], conceptExpComments: [] },
    N002: {
      expRefComments: [
        {
          id: 'c-kolb-1',
          senderId: 'admin01',
          senderName: '山田 師長',
          senderRole: 'admin',
          senderAvatarEmoji: '👩‍⚕️',
          text: '【共感と助言】全介助における物品の往復ロスは誰もが通る課題です。焦らず業務前のセッティングをルーティン化していきましょう。',
          createdAt: '16:35',
        },
      ],
      conceptExpComments: [
        {
          id: 'c-kolb-2',
          senderId: 'admin01',
          senderName: '山田 師長',
          senderRole: 'admin',
          senderAvatarEmoji: '👩‍⚕️',
          text: '【フィードバック】「物品集約が処置時間を左右する」という概念化は素晴らしい着眼点です！明日のカート貼付け表を一緒に試しましょう👍',
          createdAt: '16:40',
        },
      ],
    },
    N003: { expRefComments: [], conceptExpComments: [] },
  });

  // 🧱 モジュール型課題カード（配列管理） State
  const [modularReflections, setModularReflections] = useState<Record<string, ModularReflection[]>>({
    N001: STAFF_PROFILES['N001'].reflection.reflections || [],
    N002: STAFF_PROFILES['N002'].reflection.reflections || [],
    N003: STAFF_PROFILES['N003'].reflection.reflections || [],
  });

  const [isSaveSuccess, setIsSaveSuccess] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const isLoadedRef = useRef<boolean>(false);

  const normalizeStaffId = (id: string): string => {
    const clean = (id || '').trim().toLowerCase();
    if (clean.includes('admin') || clean.includes('yamada') || clean.includes('ono') || clean === 'n001' || clean === 'nurse01' || clean === 'n1') {
      return 'N001';
    }
    if (clean.includes('nurse05') || clean.includes('sato') || clean.includes('yui') || clean === 'n002' || clean === 'nurse02' || clean === 'n2') {
      return 'N002';
    }
    if (clean.includes('nurse03') || clean.includes('tanaka') || clean.includes('suzuki') || clean === 'n003' || clean === 'n3') {
      return 'N003';
    }
    return 'N002';
  };

  const defaultTargetId = normalizeStaffId(loggedInUserId);
  const effectiveTargetId =
    currentUser.role === 'admin'
      ? normalizeStaffId(targetUserId)
      : defaultTargetId;

  const currentStaff = STAFF_PROFILES[effectiveTargetId] || STAFF_PROFILES['N002'];
  const isViewingSelf = effectiveTargetId === defaultTargetId;

  // 編集可否判定 (自分自身を閲覧中、または管理者・師長権限の場合に編集可能)
  const isReflectionEditable = isViewingSelf || currentUser.role === 'admin';
  const preceptorBadgeName = isViewingSelf
    ? currentStaff.reflection.preceptorName
    : `${currentUser.name}（指導プリセプター）`;

  const currentFormat = reflectionFormats[effectiveTargetId] || 'modular';

  // 💾 振り返りデータの自動復元 (localStorage & Firestore リアルタイム取得)
  useEffect(() => {
    isLoadedRef.current = false;
    setAutoSaveStatus('idle');

    const targetDateKey = `${effectiveTargetId}_${selectedDate || getJSTDateString()}`;

    // 1. ローカルストレージからの即時復元
    try {
      const savedLocal = localStorage.getItem(`nurseflow_reflection_${targetDateKey}`);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.format) setReflectionFormats((prev) => ({ ...prev, [effectiveTargetId]: parsed.format }));
        if (parsed.modular) setModularReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.modular }));
        if (parsed.free !== undefined) setUserFreeReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.free }));
        if (parsed.kpt) setUserKPTReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kpt }));
        if (parsed.kolb) setUserKolbReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolb }));
        if (parsed.freeChats) setUserFreeChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.freeChats }));
        if (parsed.kptChats) setUserKPTChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kptChats }));
        if (parsed.kolbChats) setUserKolbChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolbChats }));
      } else {
        const legacyLocal = localStorage.getItem(`nurseflow_reflection_${effectiveTargetId}`);
        if (legacyLocal) {
          const parsed = JSON.parse(legacyLocal);
          if (parsed.format) setReflectionFormats((prev) => ({ ...prev, [effectiveTargetId]: parsed.format }));
          if (parsed.modular) setModularReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.modular }));
          if (parsed.free !== undefined) setUserFreeReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.free }));
          if (parsed.kpt) setUserKPTReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kpt }));
          if (parsed.kolb) setUserKolbReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolb }));
          if (parsed.freeChats) setUserFreeChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.freeChats }));
          if (parsed.kptChats) setUserKPTChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kptChats }));
          if (parsed.kolbChats) setUserKolbChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolbChats }));
        }
      }
    } catch (e) {
      console.warn("localStorage load error:", e);
    }

    // 2. Firestore からの非同期復元
    const loadFromFirestore = async () => {
      try {
        const docRef = doc(db, "nurse_reflections", targetDateKey);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const parsed = snap.data();
          if (parsed.format) setReflectionFormats((prev) => ({ ...prev, [effectiveTargetId]: parsed.format }));
          if (parsed.modular) setModularReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.modular }));
          if (parsed.free !== undefined) setUserFreeReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.free }));
          if (parsed.kpt) setUserKPTReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kpt }));
          if (parsed.kolb) setUserKolbReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolb }));
          if (parsed.freeChats) setUserFreeChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.freeChats }));
          if (parsed.kptChats) setUserKPTChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kptChats }));
          if (parsed.kolbChats) setUserKolbChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolbChats }));
        } else {
          const legacyRef = doc(db, "nurse_reflections", effectiveTargetId);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            const parsed = legacySnap.data();
            if (parsed.format) setReflectionFormats((prev) => ({ ...prev, [effectiveTargetId]: parsed.format }));
            if (parsed.modular) setModularReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.modular }));
            if (parsed.free !== undefined) setUserFreeReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.free }));
            if (parsed.kpt) setUserKPTReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kpt }));
            if (parsed.kolb) setUserKolbReflections((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolb }));
            if (parsed.freeChats) setUserFreeChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.freeChats }));
            if (parsed.kptChats) setUserKPTChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kptChats }));
            if (parsed.kolbChats) setUserKolbChats((prev) => ({ ...prev, [effectiveTargetId]: parsed.kolbChats }));
          }
        }
      } catch (e) {
        console.warn("Firestore load error:", e);
      } finally {
        setTimeout(() => {
          isLoadedRef.current = true;
        }, 400);
      }
    };
    loadFromFirestore();
  }, [effectiveTargetId, selectedDate]);

  // ⚡ リアルタイム自動保存 (入力・更新・追加・削除された時点で即時・デバウンス保存)
  useEffect(() => {
    if (!isLoadedRef.current) return;

    setAutoSaveStatus('saving');
    const targetDateKey = `${effectiveTargetId}_${selectedDate || getJSTDateString()}`;

    const timer = setTimeout(async () => {
      const dataToSave = {
        format: currentFormat,
        modular: modularReflections[effectiveTargetId] || [],
        free: userFreeReflections[effectiveTargetId] || '',
        kpt: userKPTReflections[effectiveTargetId] || { keep: '', problem: '', try: '' },
        kolb: userKolbReflections[effectiveTargetId] || { experience: '', reflection: '', conceptual: '', experiment: '' },
        freeChats: userFreeChats[effectiveTargetId] || [],
        kptChats: userKPTChats[effectiveTargetId] || { keepComments: [], problemComments: [], tryComments: [] },
        kolbChats: userKolbChats[effectiveTargetId] || { expRefComments: [], conceptExpComments: [] },
        updatedAt: new Date().toISOString(),
      };

      // 1. ローカルストレージ保存
      try {
        localStorage.setItem(`nurseflow_reflection_${targetDateKey}`, JSON.stringify(dataToSave));
        localStorage.setItem(`nurseflow_reflection_${effectiveTargetId}`, JSON.stringify(dataToSave));
      } catch (e) {
        console.warn("localStorage auto-save error:", e);
      }

      // 2. Firestore 保存
      try {
        const docRef = doc(db, "nurse_reflections", targetDateKey);
        await setDoc(docRef, {
          ...dataToSave,
          updated_at: serverTimestamp(),
        }, { merge: true });

        const legacyRef = doc(db, "nurse_reflections", effectiveTargetId);
        await setDoc(legacyRef, {
          ...dataToSave,
          updated_at: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore auto-save error:", e);
      }

      setAutoSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }, 500);

    return () => clearTimeout(timer);
  }, [
    effectiveTargetId,
    selectedDate,
    currentFormat,
    modularReflections,
    userFreeReflections,
    userKPTReflections,
    userKolbReflections,
    userFreeChats,
    userKPTChats,
    userKolbChats,
  ]);

  // 💾 振り返りデータの手動保存処理
  const handleSaveReflection = async () => {
    const targetDateKey = `${effectiveTargetId}_${selectedDate || getJSTDateString()}`;
    const dataToSave = {
      format: currentFormat,
      modular: modularReflections[effectiveTargetId] || [],
      free: userFreeReflections[effectiveTargetId] || '',
      kpt: userKPTReflections[effectiveTargetId] || { keep: '', problem: '', try: '' },
      kolb: userKolbReflections[effectiveTargetId] || { experience: '', reflection: '', conceptual: '', experiment: '' },
      freeChats: userFreeChats[effectiveTargetId] || [],
      kptChats: userKPTChats[effectiveTargetId] || { keepComments: [], problemComments: [], tryComments: [] },
      kolbChats: userKolbChats[effectiveTargetId] || { expRefComments: [], conceptExpComments: [] },
      updatedAt: new Date().toISOString(),
    };

    // 1. ローカルストレージへの保存
    try {
      localStorage.setItem(`nurseflow_reflection_${targetDateKey}`, JSON.stringify(dataToSave));
      localStorage.setItem(`nurseflow_reflection_${effectiveTargetId}`, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }

    // 2. Firestore への保存
    try {
      const docRef = doc(db, "nurse_reflections", targetDateKey);
      await setDoc(docRef, {
        ...dataToSave,
        updated_at: serverTimestamp(),
      }, { merge: true });

      const legacyRef = doc(db, "nurse_reflections", effectiveTargetId);
      await setDoc(legacyRef, {
        ...dataToSave,
        updated_at: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore reflection save error:", e);
    }

    setAutoSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    setIsSaveSuccess(true);
    setTimeout(() => setIsSaveSuccess(false), 3000);
  };

  const computeScheduleGaps = (timeline: TimelineItem[]): GapItem[] => {
    if (!timeline || timeline.length === 0) return [];

    const sorted = [...timeline].sort((a, b) => {
      const [ha, ma] = a.time.split(':').map(Number);
      const [hb, mb] = b.time.split(':').map(Number);
      return (ha * 60 + (ma || 0)) - (hb * 60 + (mb || 0));
    });

    const gaps: GapItem[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];

      const [ch, cm] = curr.time.split(':').map(Number);
      const currStartMin = (ch * 60 + (cm || 0)) - 480;
      const currEndMin = currStartMin + (curr.estimatedMinutes || 0);

      const [nh, nm] = next.time.split(':').map(Number);
      const nextStartMin = (nh * 60 + (nm || 0)) - 480;

      const gapMinutes = nextStartMin - currEndMin;

      if (gapMinutes >= 10) {
        const gapStartMin = currEndMin;
        const topPx = (gapStartMin / 600) * 1800;
        const heightPx = (gapMinutes / 600) * 1800;

        const endH = Math.floor((gapStartMin + 480) / 60);
        const endM = (gapStartMin + 480) % 60;
        const startTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        const nextH = Math.floor((nextStartMin + 480) / 60);
        const nextM = (nextStartMin + 480) % 60;
        const endTimeStr = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;

        gaps.push({
          id: `gap-${curr.id}-${next.id}`,
          startTimeStr,
          endTimeStr,
          startMin: gapStartMin,
          endMin: nextStartMin,
          gapMinutes,
          topPx,
          heightPx,
        });
      }
    }

    return gaps;
  };

  // 🧱 モジュール型課題カードへのメッセージ追加ハンドラー
  const handleAddModularReflection = () => {
    const newRef: ModularReflection = {
      id: `ref-${Date.now()}`,
      type: '課題',
      title: '',
      content: '',
      comments: [],
      createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    setModularReflections((prev) => ({
      ...prev,
      [effectiveTargetId]: [...(prev[effectiveTargetId] || []), newRef],
    }));
  };

  const handleDeleteModularReflection = (refId: string) => {
    setModularReflections((prev) => ({
      ...prev,
      [effectiveTargetId]: (prev[effectiveTargetId] || []).filter((r) => r.id !== refId),
    }));
  };

  const handleUpdateModularReflection = (refId: string, field: keyof ModularReflection, value: string) => {
    setModularReflections((prev) => {
      const list = prev[effectiveTargetId] || [];
      const updated = list.map((item) => {
        if (item.id === refId) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, [effectiveTargetId]: updated };
    });
    setIsSaveSuccess(false);
  };

  // 🧱 モジュール型課題カード用 インラインチャット送信・編集・削除
  const handleSendModularComment = (refId: string, text: string) => {
    const newMsg: ItemChatMessage = {
      id: `c-mod-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarEmoji: currentUser.role === 'admin' ? '👩‍⚕️' : '🌱',
      text,
      createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    setModularReflections((prev) => {
      const list = prev[effectiveTargetId] || [];
      const updated = list.map((item) => {
        if (item.id === refId) {
          return {
            ...item,
            comments: [...(item.comments || []), newMsg],
          };
        }
        return item;
      });
      return { ...prev, [effectiveTargetId]: updated };
    });
  };

  const handleEditModularComment = (refId: string, msgId: string, newText: string) => {
    setModularReflections((prev) => {
      const list = prev[effectiveTargetId] || [];
      const updated = list.map((item) => {
        if (item.id === refId) {
          const updatedComments = (item.comments || []).map((c) =>
            c.id === msgId ? { ...c, text: newText, updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) } : c
          );
          return { ...item, comments: updatedComments };
        }
        return item;
      });
      return { ...prev, [effectiveTargetId]: updated };
    });
  };

  const handleDeleteModularComment = (refId: string, msgId: string) => {
    setModularReflections((prev) => {
      const list = prev[effectiveTargetId] || [];
      const updated = list.map((item) => {
        if (item.id === refId) {
          return { ...item, comments: (item.comments || []).filter((c) => c.id !== msgId) };
        }
        return item;
      });
      return { ...prev, [effectiveTargetId]: updated };
    });
  };

  // 📝 自由記述 インラインチャット送信ハンドラー
  const handleSendFreeComment = (text: string) => {
    const newMsg: ItemChatMessage = {
      id: `c-free-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarEmoji: currentUser.role === 'admin' ? '👩‍⚕️' : '🌱',
      text,
      createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    setUserFreeChats((prev) => ({
      ...prev,
      [effectiveTargetId]: [...(prev[effectiveTargetId] || []), newMsg],
    }));
  };

  // 📊 KPT 各項目 インラインチャット送信ハンドラー
  const handleSendKPTComment = (typeKey: 'keepComments' | 'problemComments' | 'tryComments', text: string) => {
    const newMsg: ItemChatMessage = {
      id: `c-kpt-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarEmoji: currentUser.role === 'admin' ? '👩‍⚕️' : '🌱',
      text,
      createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    setUserKPTChats((prev) => {
      const currentData = prev[effectiveTargetId] || { keepComments: [], problemComments: [], tryComments: [] };
      return {
        ...prev,
        [effectiveTargetId]: {
          ...currentData,
          [typeKey]: [...(currentData[typeKey] || []), newMsg],
        },
      };
    });
  };

  // 🔄 Kolb 各グループ インラインチャット送信ハンドラー
  const handleSendKolbComment = (typeKey: 'expRefComments' | 'conceptExpComments', text: string) => {
    const newMsg: ItemChatMessage = {
      id: `c-kolb-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarEmoji: currentUser.role === 'admin' ? '👩‍⚕️' : '🌱',
      text,
      createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    setUserKolbChats((prev) => {
      const currentData = prev[effectiveTargetId] || { expRefComments: [], conceptExpComments: [] };
      return {
        ...prev,
        [effectiveTargetId]: {
          ...currentData,
          [typeKey]: [...(currentData[typeKey] || []), newMsg],
        },
      };
    });
  };

  const scheduleGaps = computeScheduleGaps(currentStaff.timeline);
  const timelineList = currentStaff?.timeline || [];
  const completedCount = timelineList.filter((t) => t.status === 'completed').length;
  const totalCount = timelineList.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-full h-full overflow-y-auto bg-slate-50 font-sans p-2.5 sm:p-3 lg:p-4 flex flex-col gap-4 text-slate-800">
      {/* 1. 表示対象スタッフの概要カード */}
      <StaffOverviewCard
        currentStaff={currentStaff}
        completedCount={completedCount}
        totalCount={totalCount}
        progressPercent={progressPercent}
      />

      {/* 3. ワンカラム構造セクション */}
      <div className="w-full flex flex-col gap-5">
        {/* 本日のタイムライン */}
        <TimelineScheduleSection
          currentStaff={currentStaff}
          currentTimeStr={currentTimeStr}
          currentTopPx={currentTopPx}
          simulatedTimeStr={simulatedTimeStr}
          setSimulatedTimeStr={setSimulatedTimeStr}
          showGaps={showGaps}
          setShowGaps={setShowGaps}
          timelineViewMode={timelineViewMode}
          setTimelineViewMode={setTimelineViewMode}
          scheduleGaps={scheduleGaps}
          gapSegments={gapSegments}
          setGapSegments={setGapSegments}
        />

        {/* スキル分析 & AIフィードバック */}
        <PerformanceChartsSection
          currentStaff={currentStaff}
          chartView={chartView}
          setChartView={setChartView}
          selectedDate={selectedDate}
        />

        {/* 高度な本日の振り返り（モジュール/自由記述/KPT/Kolb & インライン対話チャット） */}
        <DailyReflectionSection
          currentStaff={currentStaff}
          effectiveTargetId={effectiveTargetId}
          currentUser={currentUser}
          isReflectionEditable={isReflectionEditable}
          isViewingSelf={isViewingSelf}
          preceptorBadgeName={preceptorBadgeName}
          currentFormat={currentFormat}
          setReflectionFormats={setReflectionFormats}
          modularReflections={modularReflections}
          handleAddModularReflection={handleAddModularReflection}
          handleDeleteModularReflection={handleDeleteModularReflection}
          handleUpdateModularReflection={handleUpdateModularReflection}
          handleSendModularComment={handleSendModularComment}
          handleEditModularComment={handleEditModularComment}
          handleDeleteModularComment={handleDeleteModularComment}
          userFreeReflections={userFreeReflections}
          setUserFreeReflections={setUserFreeReflections}
          userFreeChats={userFreeChats}
          handleSendFreeComment={handleSendFreeComment}
          userKPTReflections={userKPTReflections}
          setUserKPTReflections={setUserKPTReflections}
          userKPTChats={userKPTChats}
          handleSendKPTComment={handleSendKPTComment}
          userKolbReflections={userKolbReflections}
          setUserKolbReflections={setUserKolbReflections}
          userKolbChats={userKolbChats}
          handleSendKolbComment={handleSendKolbComment}
          isSaveSuccess={isSaveSuccess}
          setIsSaveSuccess={setIsSaveSuccess}
          onSaveReflection={handleSaveReflection}
          autoSaveStatus={autoSaveStatus}
          lastSavedTime={lastSavedTime}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
};

export default PersonalDashboard;
