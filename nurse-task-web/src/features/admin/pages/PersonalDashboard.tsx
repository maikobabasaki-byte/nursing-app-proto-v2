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
import { ClinicalLadderSection } from '../components/personalDashboard/ClinicalLadderSection';
import type { ClinicalLadderData } from '../components/personalDashboard/ClinicalLadderSection';
import { SkillProficiencyChecklist } from '../components/personalDashboard/SkillProficiencyChecklist';
import type { NursingSkillItem } from '../components/personalDashboard/SkillProficiencyChecklist';
import { SKILL_LEVEL_DEFINITIONS } from '../components/personalDashboard/SkillProficiencyChecklist';

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
  const firebaseUser = auth.currentUser;

  const derivedRole: 'admin' | 'nurse' =
    storeUser?.role === 'admin' || checkIsLeader(storeUser) || checkIsLeader(firebaseUser)
      ? 'admin'
      : 'nurse';

  const [roleOverride] = useState<'admin' | 'nurse' | 'auto'>('auto');
  const activeRole: 'admin' | 'nurse' = roleOverride === 'auto' ? derivedRole : roleOverride;

  const loggedInUserId = storeUser?.nurse_id || storeUser?.staff_id || 'nurse05';
  const loggedInUserName = storeUser?.name || (activeRole === 'admin' ? '山田 師長' : '田中 結衣');

  const currentUser: UserRoleInfo = {
    id: loggedInUserId,
    name: loggedInUserName,
    role: activeRole,
  };

  const isLeader = checkIsLeader(storeUser) || checkIsLeader(firebaseUser);

  const targetUserId = useTimelineStore((state) => state.targetUserId) || loggedInUserId;
  const setTargetUserId = useTimelineStore((state) => state.setTargetUserId);
  const [timelineViewMode, setTimelineViewMode] = useState<'patient' | 'gantt' | 'table'>('patient');

  const [now, setNow] = useState<Date>(new Date());
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string | null>(null);

  // トースト通知 State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

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
    expRefComments: ItemChatMessage[];
    conceptExpComments: ItemChatMessage[];
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

  // 🧱 モジュール型課題カード State
  const [modularReflections, setModularReflections] = useState<Record<string, ModularReflection[]>>({
    N001: STAFF_PROFILES['N001'].reflection.reflections || [],
    N002: STAFF_PROFILES['N002'].reflection.reflections || [],
    N003: STAFF_PROFILES['N003'].reflection.reflections || [],
  });

  // 🎖️ JNAクリニカルラダー評価 State (スタッフIDごとのデータ)
  const [ladderDataMap, setLadderDataMap] = useState<Record<string, ClinicalLadderData>>({
    N001: {
      currentLevel: 'レベルⅣ (統括)',
      targetLevel: 'レベルⅤ (スペシャリスト)',
      strengths: '病棟全体の過密ボトルネック察知および的確な指示出し、緊急時アセスメント力に非常に優れています。',
      improvements: 'OJT実地指導の際、新人への事前講義時間を申し送り時に設定する工夫が推奨されます。',
      competencies: [
        { key: 'comp1', subject: 'ニーズを捉える力', score: 5, rationale: '患者・病棟全体のニーズを包括的に捉え、的確に優先順位を設定できています。' },
        { key: 'comp2', subject: 'ケアを実践する力', score: 5, rationale: '根拠に基づいた高度なケア・処置を安全かつ迅速に実施できています。' },
        { key: 'comp3', subject: '協働する力', score: 4, rationale: '多職種および病棟スタッフ間での情報共有・連携を円滑に主導しています。' },
        { key: 'comp4', subject: '意思決定を支える力', score: 5, rationale: '患者・家族の意思決定を尊重し、チームでの支援体制を構築できています。' },
        { key: 'comp5', subject: '安全管理', score: 5, rationale: '医療安全・感染対策・急変時プロトコルを厳格に遵守・徹底しています。' },
      ],
    },
    N002: {
      currentLevel: 'レベルⅠ (新人)',
      targetLevel: 'レベルⅡ (一人立ち)',
      strengths: '患者様への親身で丁寧なコミュニケーションと傾聴姿勢が素晴らしく、安心感を与えられています。基本バイタルの測定も正確です。',
      improvements: '複数介護タスク（清拭・体位変換等）に入る前の必要物品のワゴン事前準備を徹底し、12分程度の遅延を防ぎましょう。',
      competencies: [
        { key: 'comp1', subject: 'ニーズを捉える力', score: 3, rationale: '基本的なバイタル・傾聴ニーズは正確に捉えられていますが、複数ケアの重複時の優先度設定に指導が必要です。' },
        { key: 'comp2', subject: 'ケアを実践する力', score: 3, rationale: '基本バイタルは手際よく正確ですが、体位変換や清拭で事前準備の工夫余地があります。' },
        { key: 'comp3', subject: '協働する力', score: 4, rationale: '先輩ナースへの報告・相談・連絡が素直でスムーズに行えています。' },
        { key: 'comp4', subject: '意思決定を支える力', score: 3, rationale: '患者様の不安な感情に寄り添い、訴えを共感的に聴く姿勢が定着しています。' },
        { key: 'comp5', subject: '安全管理', score: 4, rationale: 'ダブルチェック・本人確認の手順を忠実に守り、安全意識が高く保たれています。' },
      ],
    },
    N003: {
      currentLevel: 'レベルⅡ (中堅)',
      targetLevel: 'レベルⅢ (リーダー候補)',
      strengths: '自身の担当タスクを計画通り手際よく完了し、SOAP記録の迅速入力が非常に安定しています。',
      improvements: '午後の余裕がある時間帯に、新人ナースの進捗状況へ目を向け、積極的なサポートを行う姿勢が期待されます。',
      competencies: [
        { key: 'comp1', subject: 'ニーズを捉える力', score: 4, rationale: '患者の状態変化を的確に把握し、アセスメントを迅速に行えています。' },
        { key: 'comp2', subject: 'ケアを実践する力', score: 4, rationale: '自立して各種看護技術を計画時間内に実施できています。' },
        { key: 'comp3', subject: '協働する力', score: 4, rationale: '新人ナースのペアフォローや他スタッフとの連携がスムーズです。' },
        { key: 'comp4', subject: '意思決定を支える力', score: 4, rationale: '患者・家族への病状説明補助や意向把握に努めています。' },
        { key: 'comp5', subject: '安全管理', score: 5, rationale: 'インシデント防止・点滴ダブルチェック・与薬安全を徹底できています。' },
      ],
    },
  });

  // 💉 看護技術 5段階習熟度（自立度）チェックリスト State
  const [technicalSkillsMap, setTechnicalSkillsMap] = useState<Record<string, NursingSkillItem[]>>({
    N001: [
      { id: 'sk1', name: '静脈血採血', category: '注射・採血', level: 5 },
      { id: 'sk2', name: '気管吸引（経口・経鼻）', category: '呼吸ケア', level: 5 },
      { id: 'sk3', name: '導尿・尿道カテーテル留置', category: '排泄ケア', level: 5 },
      { id: 'sk4', name: '経管栄養・胃瘻管理', category: '栄養管理', level: 5 },
      { id: 'sk5', name: '十二指腸チューブ挿入補助', category: '処置介助', level: 5 },
      { id: 'sk6', name: '心電図装着・モニター測定', category: '循環アセスメント', level: 5 },
      { id: 'sk7', name: '清拭・全身皮膚ケア', category: '清潔ケア', level: 5 },
    ],
    N002: [
      { id: 'sk1', name: '静脈血採血', category: '注射・採血', level: 3 },
      { id: 'sk2', name: '気管吸引（経口・経鼻）', category: '呼吸ケア', level: 2 },
      { id: 'sk3', name: '導尿・尿道カテーテル留置', category: '排泄ケア', level: 2 },
      { id: 'sk4', name: '経管栄養・胃瘻管理', category: '栄養管理', level: 3 },
      { id: 'sk5', name: '十二指腸チューブ挿入補助', category: '処置介助', level: 1 },
      { id: 'sk6', name: '心電図装着・モニター測定', category: '循環アセスメント', level: 4 },
      { id: 'sk7', name: '清拭・全身皮膚ケア', category: '清潔ケア', level: 4 },
    ],
    N003: [
      { id: 'sk1', name: '静脈血採血', category: '注射・採血', level: 5 },
      { id: 'sk2', name: '気管吸引（経口・経鼻）', category: '呼吸ケア', level: 4 },
      { id: 'sk3', name: '導尿・尿道カテーテル留置', category: '排泄ケア', level: 4 },
      { id: 'sk4', name: '経管栄養・胃瘻管理', category: '栄養管理', level: 5 },
      { id: 'sk5', name: '十二指腸チューブ挿入補助', category: '処置介助', level: 3 },
      { id: 'sk6', name: '心電図装着・モニター測定', category: '循環アセスメント', level: 5 },
      { id: 'sk7', name: '清拭・全身皮膚ケア', category: '清潔ケア', level: 5 },
    ],
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

  const currentLadder = ladderDataMap[effectiveTargetId] || ladderDataMap['N002'];
  const currentTechnicalSkills = technicalSkillsMap[effectiveTargetId] || technicalSkillsMap['N002'];

  // JNAラダースコア更新ハンドラー (管理者専用)
  const handleUpdateCompetencyScore = (key: string, newScore: number) => {
    setLadderDataMap((prev) => {
      const staffLadder = prev[effectiveTargetId] || prev['N002'];
      const updatedComps = staffLadder.competencies.map((c) =>
        c.key === key ? { ...c, score: newScore } : c
      );
      return {
        ...prev,
        [effectiveTargetId]: {
          ...staffLadder,
          competencies: updatedComps,
        },
      };
    });
    const compObj = currentLadder.competencies.find((c) => c.key === key);
    showToast(`🎯 「${compObj?.subject || key}」の評価を Lv.${newScore} に更新しました。レーダーチャートが即時変化します。`);
  };

  // 定性フィードバック保存ハンドラー (管理者専用)
  const handleSaveLadderFeedback = (strengths: string, improvements: string) => {
    setLadderDataMap((prev) => {
      const staffLadder = prev[effectiveTargetId] || prev['N002'];
      return {
        ...prev,
        [effectiveTargetId]: {
          ...staffLadder,
          strengths,
          improvements,
        },
      };
    });
    showToast('💬 指導者からの定性フィードバック（強み・課題）を保存しました。');
  };

  // 看護技術 習熟度レベル更新ハンドラー (管理者専用)
  const handleUpdateSkillLevel = (skillId: string, skillName: string, newLevel: number) => {
    setTechnicalSkillsMap((prev) => {
      const list = prev[effectiveTargetId] || prev['N002'];
      const updated = list.map((sk) => (sk.id === skillId ? { ...sk, level: newLevel } : sk));
      return { ...prev, [effectiveTargetId]: updated };
    });
    const levelDef = SKILL_LEVEL_DEFINITIONS[newLevel];
    showToast(`✨ 「${skillName}」の評価を更新しました：Lv.${newLevel}（${levelDef?.label || ''}）`);
  };

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

    try {
      localStorage.setItem(`nurseflow_reflection_${targetDateKey}`, JSON.stringify(dataToSave));
      localStorage.setItem(`nurseflow_reflection_${effectiveTargetId}`, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }

    try {
      const docRef = doc(db, "nurse_reflections", targetDateKey);
      await setDoc(docRef, {
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
    <div className="w-full max-w-full h-full overflow-y-auto bg-slate-50 font-sans p-2.5 sm:p-3 lg:p-4 flex flex-col gap-4 text-slate-800 relative">
      {/* Toast Notification Popup Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-2 animate-bounce max-w-md">
          <span className="text-lg">📢</span>
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* 最上部：対象スタッフ選択 & 表示スタッフ概要 (2カラム構造・左右逆) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* 左カラム: 対象スタッフ選択 (管理者・リーダー用) または 表示固定表示 */}
        {(isLeader || currentUser.role === 'admin') ? (
          <div className="bg-amber-50 border border-amber-200 p-4 lg:p-5 rounded-2xl shadow-sm flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">👩‍⚕️</span>
              <label htmlFor="top-2col-staff-select" className="font-extrabold text-amber-950 text-sm">
                対象スタッフ選択（表示切替）:
              </label>
            </div>
            <p className="text-xs text-amber-800 font-medium">
              ダッシュボードの表示・評価対象となるスタッフを切り替えます。
            </p>
            <select
              id="top-2col-staff-select"
              value={effectiveTargetId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="!bg-white !text-slate-900 !font-extrabold !text-xs sm:!text-sm !px-3 !py-2 !rounded-xl !border !border-amber-300 focus:!outline-none focus:!ring-2 focus:!ring-amber-500 !cursor-pointer !shadow-sm w-full mt-1"
            >
              <option value="N001">N001: 山田 師長 (管理者)</option>
              <option value="N002">N002: 田中 結衣 (1年目)</option>
              <option value="N003">N003: 鈴木 看護師 (4年目)</option>
            </select>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-200 p-4 lg:p-5 rounded-2xl shadow-sm flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-extrabold text-slate-800">
                対象スタッフ固定中
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ご自身の個人パフォーマンスおよび本日の振り返りを表示しています。
              </p>
            </div>
          </div>
        )}

        {/* 右カラム: 表示中スタッフの概要 */}
        <StaffOverviewCard
          currentStaff={currentStaff}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
        />
      </div>

      {/* 3. ワンカラム構造セクション */}
      <div className="w-full flex flex-col gap-5">
        {/* ---------------- 1. 本日について ---------------- */}
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

        {/* 📈 タスク消化ペース比較 & AIパーソナルフィードバック */}
        <PerformanceChartsSection
          currentStaff={currentStaff}
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

        {/* ---------------- 2. 看護技術について ---------------- */}
        {/* 💉 看護技術 5段階習熟度（自立度）チェックリスト (新人教育・OJT用) */}
        <SkillProficiencyChecklist
          currentUser={currentUser}
          skills={currentTechnicalSkills}
          onUpdateSkillLevel={handleUpdateSkillLevel}
        />

        {/* ---------------- 3. クリニカルラダーについて ---------------- */}
        {/* 🎖️ 日本看護協会 JNAクリニカルラダー評価 & 定性フィードバックセクション */}
        <ClinicalLadderSection
          currentUser={currentUser}
          effectiveTargetId={effectiveTargetId}
          ladderData={currentLadder}
          onUpdateCompetencyScore={handleUpdateCompetencyScore}
          onSaveFeedback={handleSaveLadderFeedback}
        />
      </div>
    </div>
  );
};

export default PersonalDashboard;
