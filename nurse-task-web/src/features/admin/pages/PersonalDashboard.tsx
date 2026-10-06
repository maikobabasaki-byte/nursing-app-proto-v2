import React, { useState, useEffect, useRef, useMemo } from 'react';

// Zustandストア・Firebase認証・ユーザーユーティリティのインポート
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { auth, db } from '../../../lib/firebase';
import { checkIsLeader, getStaffCandidates } from '../../../utils/userUtils';
import { getJSTDateString } from '../../../utils/dateUtils';

// 型定義・モックデータのインポート
import type {
  UserRoleInfo,
  StaffProfile,
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
import { OJTFeedbackSection } from '../components/personalDashboard/OJTFeedbackSection';
import type { OJTFeedbackData, PreceptorKPTData } from '../components/personalDashboard/OJTFeedbackSection';

// 後方互換性のための型・定数の再エクスポート
export type * from '../types/personalDashboard';
export { GAP_ACTIVITY_OPTIONS } from '../types/personalDashboard';

/**
 * 看護師向け 個人パフォーマンス＆タイムラインダッシュボード
 */
export const PersonalDashboard: React.FC = () => {
  // ログイン認証状態（Zustandストア / Firebase認証）よりロール判定
  const storeUser = useTimelineStore((state) => state.currentUser);
  const nurseMaster = useTimelineStore((state) => state.nurseMaster);
  const nurses = useTimelineStore((state) => state.nurses);
  const selectedDate = useTimelineStore((state) => state.selectedDate) || getJSTDateString();
  const firebaseUser = auth.currentUser;

  const loggedInUserId = storeUser?.nurse_id || storeUser?.staff_id || 'nurse05';
  const loggedInUserName = storeUser?.name || '田中 結衣';

  const targetUserId = useTimelineStore((state) => state.targetUserId) || loggedInUserId;
  const setTargetUserId = useTimelineStore((state) => state.setTargetUserId);

  const normalizeStaffId = (id: string): string => {
    const clean = (id || '').trim().toLowerCase();
    if (clean === 'n001' || clean === 'nurse01' || clean === 'admin01' || clean === 'n1' || clean.includes('admin') || clean.includes('yamada') || clean.includes('ono')) {
      return 'N001';
    }
    if (clean === 'n002' || clean === 'nurse05' || clean === 'n5' || clean.includes('tanaka') || clean.includes('yui')) {
      return 'N002';
    }
    if (clean === 'n003' || clean === 'nurse03' || clean === 'n3' || clean.includes('suzuki') || clean.includes('preceptor')) {
      return 'N003';
    }
    if (clean === 'n004' || clean === 'nurse04' || clean === 'n4' || clean.includes('takahashi')) {
      return 'N004';
    }
    if (clean === 'n005' || clean === 'nurse02' || clean === 'n2' || clean.includes('sato')) {
      return 'N005';
    }
    return id || 'N002';
  };

  const defaultTargetId = normalizeStaffId(loggedInUserId);
  const effectiveTargetId = normalizeStaffId(targetUserId);

  const realRole: 'admin' | 'preceptor' | 'nurse' =
    (storeUser?.role as 'admin' | 'preceptor' | 'nurse') ||
    (storeUser?.role === 'admin' || checkIsLeader(storeUser) || checkIsLeader(firebaseUser) ? 'admin' : 'nurse');

  const isAdmin = realRole === 'admin';
  const activeStaffId = isAdmin ? effectiveTargetId : defaultTargetId;

  // 🏥 システムに登録されている全実データ看護師（Firestore / Auth）＆デモ用看護師を動的候補化
  const staffCandidates = useMemo(() => {
    return getStaffCandidates(nurseMaster, nurses, storeUser);
  }, [nurseMaster, nurses, storeUser]);

  // 🎯 選択されたスタッフIDに対応するプロファイル（実データユーザーの場合は動的構築）
  const rawStaff: StaffProfile = useMemo(() => {
    if (STAFF_PROFILES[activeStaffId]) {
      return STAFF_PROFILES[activeStaffId];
    }
    const realUserMatch =
      (nurseMaster || []).find((m) => m.nurse_id === activeStaffId || m.nurse_id?.toLowerCase() === activeStaffId.toLowerCase()) ||
      (nurses || []).find((n) => n.nurse_id === activeStaffId || n.nurse_id?.toLowerCase() === activeStaffId.toLowerCase()) ||
      (storeUser && (storeUser.nurse_id === activeStaffId || storeUser.staff_id === activeStaffId) ? storeUser : null);

    const isLeader = realUserMatch ? checkIsLeader(realUserMatch) : false;
    const baseProfile = isLeader ? STAFF_PROFILES['N001'] : STAFF_PROFILES['N002'];

    const realName = realUserMatch?.name || (activeStaffId.includes('@') ? activeStaffId.split('@')[0] : activeStaffId);

    return {
      ...baseProfile,
      user: {
        id: activeStaffId,
        name: realName,
        role: isLeader ? 'admin' : 'nurse',
        rank: isLeader ? '師長・看護管理者（実ユーザー）' : '一般看護師（実ユーザー）',
        ward: realUserMatch?.team || '2階病棟（一般）',
        avatarEmoji: isLeader ? '👩‍⚕️' : '🩺',
      },
    };
  }, [activeStaffId, nurseMaster, nurses, storeUser]);

  // 🛡️ 非管理者（一般看護師）はログインユーザー本人のリアルタイム名・プロファイルを厳格適用
  const currentStaff: StaffProfile = useMemo(() => {
    if (!isAdmin && storeUser) {
      return {
        ...rawStaff,
        user: {
          ...rawStaff.user,
          id: loggedInUserId,
          name: storeUser.name || rawStaff.user.name,
        },
      };
    }
    return rawStaff;
  }, [isAdmin, storeUser, loggedInUserId, rawStaff]);

  const currentUser: UserRoleInfo = {
    id: loggedInUserId,
    name: loggedInUserName,
    role: realRole,
  };

  // 🛡️ 一般看護師は他スタッフの画面を閲覧できないよう、閲覧対象を本人（defaultTargetId）に常時固定
  useEffect(() => {
    if (!isAdmin && targetUserId !== loggedInUserId) {
      setTargetUserId(loggedInUserId);
    }
  }, [isAdmin, targetUserId, loggedInUserId, setTargetUserId]);

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
    N004: {
      currentLevel: 'レベルⅠ (新人)',
      targetLevel: 'レベルⅡ (一人立ち)',
      strengths: '患者観察力が高く、点滴・バイタルの変化に素早く気づくことができます。',
      improvements: '排泄・体位変換の介助手技の効率化と自立度向上を目指しましょう。',
      competencies: [
        { key: 'comp1', subject: 'ニーズを捉える力', score: 3, rationale: '患者の細かな状態変化を注意深く観察できています。' },
        { key: 'comp2', subject: 'ケアを実践する力', score: 2, rationale: '基礎看護手技は確実ですが、複合的な介護ケアでフォローが必要です。' },
        { key: 'comp3', subject: '協働する力', score: 4, rationale: '先輩指導者への報告・相談タイミングが的確です。' },
        { key: 'comp4', subject: '意思決定を支える力', score: 3, rationale: '患者の不安を和らげる声かけが意識できています。' },
        { key: 'comp5', subject: '安全管理', score: 4, rationale: '患者誤認防止のネームバンド確認を徹底できています。' },
      ],
    },
    N005: {
      currentLevel: 'レベルⅠ (新人)',
      targetLevel: 'レベルⅡ (一人立ち)',
      strengths: '清潔操作・感染予防手順が極めて正確で、安全第一で行動できています。',
      improvements: '多忙時の業務優先度の判断力を指導者と一緒に鍛えていきましょう。',
      competencies: [
        { key: 'comp1', subject: 'ニーズを捉える力', score: 3, rationale: 'バイタルデータや患者の症状変化の捉え方が的確です。' },
        { key: 'comp2', subject: 'ケアを実践する力', score: 3, rationale: '創傷処置や配薬の手続きがとても丁寧で安全です。' },
        { key: 'comp3', subject: '協働する力', score: 3, rationale: '指導者のアドバイスを素直に受け入れ迅速に改善できています。' },
        { key: 'comp4', subject: '意思決定を支える力', score: 3, rationale: '患者の希望をしっかり傾聴し記録に反映できています。' },
        { key: 'comp5', subject: '安全管理', score: 5, rationale: '与薬のダブルチェック・アレルギー確認を完璧に履行しています。' },
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
    N004: [
      { id: 'sk1', name: '静脈血採血', category: '注射・採血', level: 2 },
      { id: 'sk2', name: '気管吸引（経口・経鼻）', category: '呼吸ケア', level: 2 },
      { id: 'sk3', name: '導尿・尿道カテーテル留置', category: '排泄ケア', level: 1 },
      { id: 'sk4', name: '経管栄養・胃瘻管理', category: '栄養管理', level: 3 },
      { id: 'sk5', name: '十二指腸チューブ挿入補助', category: '処置介助', level: 1 },
      { id: 'sk6', name: '心電図装着・モニター測定', category: '循環アセスメント', level: 3 },
      { id: 'sk7', name: '清拭・全身皮膚ケア', category: '清潔ケア', level: 4 },
    ],
    N005: [
      { id: 'sk1', name: '静脈血採血', category: '注射・採血', level: 3 },
      { id: 'sk2', name: '気管吸引（経口・経鼻）', category: '呼吸ケア', level: 3 },
      { id: 'sk3', name: '導尿・尿道カテーテル留置', category: '排泄ケア', level: 2 },
      { id: 'sk4', name: '経管栄養・胃瘻管理', category: '栄養管理', level: 4 },
      { id: 'sk5', name: '十二指腸チューブ挿入補助', category: '処置介助', level: 2 },
      { id: 'sk6', name: '心電図装着・モニター測定', category: '循環アセスメント', level: 4 },
      { id: 'sk7', name: '清拭・全身皮膚ケア', category: '清潔ケア', level: 5 },
    ],
  });

  // 💌 新人→プリセプター サンクスカード (OJTフィードバック) State
  const [ojtFeedbackMap, setOjtFeedbackMap] = useState<Record<string, OJTFeedbackData>>({
    N001: {
      clarityRating: 5,
      psychologicalSafetyRating: 5,
      thanksMessage: '本日は統括リーダー業務と並行してOJT指導ありがとうございました！アセスメントの考え方が大変勉強になりました。',
      senderName: '田中 結衣',
      senderAvatarEmoji: '🌱',
      submittedAt: '16:15',
      isSubmitted: true,
    },
    N002: {
      clarityRating: 4,
      psychologicalSafetyRating: 5,
      thanksMessage: '本日は気管吸引と静脈採血のフォローありがとうございました！事前に重要なポイントを3つ教えていただいたおかげで落ち着いて実施できました。明日もよろしくお願いします！',
      senderName: '田中 結衣',
      senderAvatarEmoji: '🌱',
      submittedAt: '16:30',
      isSubmitted: true,
    },
    N003: {
      clarityRating: 4,
      psychologicalSafetyRating: 4,
      thanksMessage: '本日は心電図装着とモニター設定のご指導ありがとうございました。大変分かりやすかったです！',
      senderName: '鈴木 看護師',
      senderAvatarEmoji: '🌱',
      submittedAt: '16:45',
      isSubmitted: true,
    },
    N004: {
      clarityRating: 5,
      psychologicalSafetyRating: 5,
      thanksMessage: '本日は導尿カテーテル管理のフォローありがとうございました！失敗しそうな箇所を前もって声かけしていただけたので落ち着けました。',
      senderName: '高橋 看護師',
      senderAvatarEmoji: '🌱',
      submittedAt: '16:20',
      isSubmitted: true,
    },
    N005: {
      clarityRating: 4,
      psychologicalSafetyRating: 5,
      thanksMessage: '本日は創傷ガーゼ交換と血糖測定の見守り指導ありがとうございました！手作業の順番をシミュレーションしたおかげで自信がつきました！',
      senderName: '佐藤 看護師',
      senderAvatarEmoji: '🌱',
      submittedAt: '16:40',
      isSubmitted: true,
    },
  });

  // 🎓 プリセプター（指導者）自身の教育KPT State
  const [preceptorKptMap, setPreceptorKptMap] = useState<Record<string, PreceptorKPTData>>({
    N001: {
      keep: '病棟過密時に新人への指示を3ステップで具体的に伝えた。',
      problem: '急患対応時、指導の振り返り時間を直後に確保できなかった。',
      try: '明日は申し送り後の5分間で指導振り返りタイムを確保する。',
      updatedAt: '16:20',
    },
    N002: {
      keep: '処置前にチェックリストを用いて手順のポイントを3点共有できた。新人ナースが焦らず確認しながら動けていた。',
      problem: '午後の急変タスクが入った際、申し送りの指示がやや早口になってしまい、質問を受け受ける余白が少なかった。',
      try: '明日は処置開始前5分間の「質問タイム」をあらかじめタイムスケジュールに組み込み、心理的安全性を高める。',
      updatedAt: '16:35',
    },
    N003: {
      keep: '新人の自己判断を促すオープンクエスチョン形式で発問できた。',
      problem: 'SOAP記録の事前添削に少し時間がかかってしまった。',
      try: '明日は記録用テンプレートを事前に共有して入力時間を短縮する。',
      updatedAt: '16:50',
    },
    N004: {
      keep: '処置開始前にカテーテル留置の注意点を写真付きマニュアルで共有した。',
      problem: '急患対応時、振り返りメモのやり取りが17時以降にずれ込んだ。',
      try: '明日は申し送り直前の3分間でその日の総括セッションを設ける。',
      updatedAt: '16:25',
    },
    N005: {
      keep: '清潔操作の手順について事前準備段階で具体的な声かけ・確認を行えた。',
      problem: '物品配置の作業動線について口頭説明のみにとどまってしまった。',
      try: '明日は事前にワゴンのセッティング例を見せてから処置に入ってもらう。',
      updatedAt: '16:45',
    },
  });

  // 📌 指導者用：新人指導タブの動的管理 State (デフォルトで N002 田中 結衣, N004 高橋 看護師)
  const [menteeTabIds, setMenteeTabIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preceptor_mentee_tabs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return ['N002', 'N004'];
  });

  const [activeMenteeTabId, setActiveMenteeTabId] = useState<string>('N002');
  const [isAddMenteeModalOpen, setIsAddMenteeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('preceptor_mentee_tabs', JSON.stringify(menteeTabIds));
    } catch (e) {}
  }, [menteeTabIds]);

  const handleAddMenteeTab = (staffId: string) => {
    if (!menteeTabIds.includes(staffId)) {
      const updated = [...menteeTabIds, staffId];
      setMenteeTabIds(updated);
      setActiveMenteeTabId(staffId);
      const staffObj = staffCandidates.find((s) => s.id === staffId);
      showToast(`🌱 【${staffObj?.name || '新人'}】の指導・評価タブを新設しました！`);
    } else {
      setActiveMenteeTabId(staffId);
    }
    setIsAddMenteeModalOpen(false);
  };

  const handleRemoveMenteeTab = (staffId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = menteeTabIds.filter((id) => id !== staffId);
    setMenteeTabIds(updated);
    if (activeMenteeTabId === staffId) {
      setActiveMenteeTabId(updated.length > 0 ? updated[0] : 'personal');
    }
    const staffObj = staffCandidates.find((s) => s.id === staffId);
    showToast(`🗑️ ${staffObj?.name || '新人'}の指導タブを閉じました。`);
  };

  // 💌 サンクスカード送信ハンドラー
  const handleSubmitOJTFeedback = (targetId: string, newFeedback: OJTFeedbackData) => {
    setOjtFeedbackMap((prev) => ({
      ...prev,
      [targetId]: newFeedback,
    }));
    showToast(`💌 指導者へ本日のサンクスカード・フィードバックを送信しました！`);
  };

  // 🎓 指導者教育KPT保存ハンドラー
  const handleSavePreceptorKPT = (targetId: string, newKpt: PreceptorKPTData) => {
    setPreceptorKptMap((prev) => ({
      ...prev,
      [targetId]: newKpt,
    }));
    showToast(`💾 指導スキルの教育用KPT（Keep / Problem / Try）を保存しました。`);
  };

  const [isSaveSuccess, setIsSaveSuccess] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const isLoadedRef = useRef<boolean>(false);

  const isViewingSelf = effectiveTargetId === defaultTargetId;

  // 編集可否判定 (自分自身を閲覧中のみ本人の振り返りを編集可能)
  const isReflectionEditable = isViewingSelf;
  const preceptorBadgeName = isViewingSelf
    ? currentStaff.reflection.preceptorName
    : `${currentUser.name}（指導プリセプター）`;

  // 🗂️ インデックス型切り替えタブを表示する対象 (プリセプター本人、または閲覧対象が N003 鈴木プリセプター の場合)
  // ※ 師長（管理者）は全スタッフ選択プルダウンで直接全員を評価するため、インデックス表示はプリセプター専用とします
  const showMenteeTabs = (currentUser.role === 'preceptor' || effectiveTargetId === 'N003') && effectiveTargetId !== 'N001';
  const currentMenteeId = showMenteeTabs && activeMenteeTabId && activeMenteeTabId !== 'personal'
    ? activeMenteeTabId
    : effectiveTargetId;

  const currentMenteeStaff: StaffProfile = useMemo(() => {
    if (STAFF_PROFILES[currentMenteeId]) {
      return STAFF_PROFILES[currentMenteeId];
    }
    const realUserMatch = staffCandidates.find((s) => s.id === currentMenteeId);
    const baseProfile = STAFF_PROFILES['N002'];
    return {
      ...baseProfile,
      user: {
        id: currentMenteeId,
        name: realUserMatch?.name || currentMenteeId,
        role: 'nurse',
        rank: realUserMatch?.roleLabel || '一般看護師',
        ward: '2階病棟（一般）',
        avatarEmoji: '🌱',
      },
    };
  }, [currentMenteeId, staffCandidates]);

  const currentFormat = reflectionFormats[effectiveTargetId] || 'modular';

  const currentLadder = ladderDataMap[effectiveTargetId] || ladderDataMap['N002'];
  const currentTechnicalSkills = technicalSkillsMap[currentMenteeId] || technicalSkillsMap['N002'];

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
    const targetId = currentMenteeId;
    setTechnicalSkillsMap((prev) => {
      const list = prev[targetId] || prev['N002'];
      const updated = list.map((sk) => (sk.id === skillId ? { ...sk, level: newLevel } : sk));
      return { ...prev, [targetId]: updated };
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

  const getOjtPairNames = () => {
    if (effectiveTargetId === 'N003') {
      return {
        preceptorName: '鈴木 プリセプター',
        nurseName: '田中 結衣 (1年目)',
      };
    }
    if (effectiveTargetId === 'N001') {
      return {
        preceptorName: '山田 師長',
        nurseName: '田中 結衣 (1年目)',
      };
    }
    if (effectiveTargetId === 'N004') {
      return {
        preceptorName: '鈴木 プリセプター',
        nurseName: '高橋 看護師 (1年目)',
      };
    }
    if (effectiveTargetId === 'N005') {
      return {
        preceptorName: '鈴木 プリセプター',
        nurseName: '佐藤 看護師 (1年目)',
      };
    }
    return {
      preceptorName: '鈴木 プリセプター',
      nurseName: `${currentStaff?.user?.name || '対象スタッフ'}`,
    };
  };

  const { preceptorName: ojtPreceptorName, nurseName: ojtNurseName } = getOjtPairNames();

  const activeProfileStaff = (showMenteeTabs && activeMenteeTabId !== 'personal') ? currentMenteeStaff : currentStaff;
  const scheduleGaps = computeScheduleGaps(currentStaff.timeline);
  const timelineList = activeProfileStaff?.timeline || [];
  const completedCount = timelineList.filter((t: any) => t.status === 'completed').length;
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

      {/* 1. 最上部：対象スタッフ選択 (管理者・指導者用) または 本人固定表示 (一般看護師用) & スタッフ概要 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* 左カラム: 対象スタッフ選択 (管理者・指導者のみ) または 本人専用固定表示 */}
        {currentUser.role === 'admin' || currentUser.role === 'preceptor' || checkIsLeader(storeUser) ? (
          <div className="bg-amber-50/90 border border-amber-200 p-4 lg:p-5 rounded-2xl shadow-sm flex flex-col justify-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">👩‍⚕️</span>
              <label htmlFor="top-2col-staff-select" className="font-extrabold text-amber-950 text-sm">
                対象スタッフ選択（表示・評価切替）:
              </label>
            </div>
            <div>
              <select
                id="top-2col-staff-select"
                value={effectiveTargetId}
                onChange={(e) => {
                  setTargetUserId(e.target.value);
                  setActiveMenteeTabId('personal');
                }}
                className="!bg-white !text-slate-900 !font-extrabold !text-xs sm:!text-sm !px-3 !py-2.5 !rounded-xl !border !border-amber-300 focus:!outline-none focus:!ring-2 focus:!ring-amber-500 !cursor-pointer !shadow-sm w-full"
              >
                {staffCandidates.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.roleLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-300 p-4 lg:p-5 rounded-2xl shadow-sm flex flex-col justify-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <span className="font-extrabold text-slate-800 text-sm">表示対象データ:</span>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
              <span className="font-black text-slate-900 text-xs sm:text-sm">
                {currentStaff.user.name} ({currentStaff.user.role})
              </span>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                🔒 本人専用画面
              </span>
            </div>
          </div>
        )}

        {/* 右カラム: 表示中スタッフの概要 */}
        <StaffOverviewCard
          currentStaff={activeProfileStaff}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
        />
      </div>

      {/* 2. 🗂️ 画面最上部：インデックス型メインタブバー (明るく見やすいクリアカラー設計) */}
      {showMenteeTabs && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗂️</span>
              <div>
                <h2 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span>ダッシュボード インデックス切替</span>
                  <span className="bg-indigo-50 text-indigo-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
                    表示切替
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  「本人の評価（振り返り・ラダー）」と「各新人の指導画面」をインデックスで切り替えます。
                </p>
              </div>
            </div>

            {/* ➕ 新人指導タブを新設 ボタン */}
            <button
              type="button"
              onClick={() => setIsAddMenteeModalOpen(true)}
              className="!bg-amber-400 hover:!bg-amber-300 !text-slate-950 !font-black !text-xs !px-3.5 !py-2 !rounded-xl !border !border-amber-300 !shadow-xs hover:!shadow-md !transition-all !flex !items-center !gap-1.5 !cursor-pointer active:!scale-95"
            >
              <span className="text-sm">➕</span>
              <span>新人指導タブを新設</span>
            </button>
          </div>

          {/* 明るいインデックス型タブ一覧 */}
          <div className="flex flex-wrap items-end gap-2 overflow-x-auto pt-1">
            {/* 1. 自分の振り返り & クリニカルラダー インデックス */}
            <button
              type="button"
              onClick={() => setActiveMenteeTabId('personal')}
              className={`!px-4 !py-2.5 !rounded-xl !text-xs !font-black !transition-all !flex !items-center !gap-2 !border !cursor-pointer !select-none ${
                activeMenteeTabId === 'personal'
                  ? '!bg-amber-400 !text-slate-950 !border-amber-400 !shadow-md !ring-2 !ring-amber-300/80 !scale-102 !z-10'
                  : '!bg-slate-100 !text-slate-700 !border-slate-200 hover:!bg-slate-200 hover:!text-slate-900'
              }`}
            >
              <span className="text-base">👤</span>
              <span>本人の評価（自分の振り返り・クリニカルラダー）</span>
            </button>

            {/* 2. 新人の指導インデックス (各新人名) */}
            {menteeTabIds.map((menteeId) => {
              const staffObj = staffCandidates.find((s) => s.id === menteeId);
              const name = staffObj?.name || STAFF_PROFILES[menteeId]?.user?.name || menteeId;
              const isActive = activeMenteeTabId === menteeId;

              return (
                <div
                  key={menteeId}
                  onClick={() => setActiveMenteeTabId(menteeId)}
                  className={`group px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer select-none ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300/80 scale-102 z-10'
                      : 'bg-emerald-50/90 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100 hover:text-emerald-950'
                  }`}
                >
                  <span className="text-base">🌱</span>
                  <span>【指導】{name}</span>

                  {/* 閉じるボタン (✕) */}
                  <button
                    type="button"
                    title="この指導タブを閉じる"
                    onClick={(e) => handleRemoveMenteeTab(menteeId, e)}
                    className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-emerald-100 hover:bg-red-500 hover:text-white'
                        : 'bg-emerald-200/80 text-emerald-800 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 画面コンテンツ切り替え: 本人評価インデックス (personal) vs 新人指導用画面 (menteeId) */}
      {activeMenteeTabId === 'personal' ? (
        /* ==================== 👤 本人の振り返り・クリニカルラダー画面 ==================== */
        <div className="w-full flex flex-col gap-4">
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
              isViewingSelf={isViewingSelf}
            />

            {/* パフォーマンス比較 & AIフィードバック */}
            <PerformanceChartsSection
              currentStaff={currentStaff}
              selectedDate={selectedDate}
            />

            {/* 高度な本日の振り返り (KPT / Kolb / Modular) */}
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

            {/* 🎖️ 日本看護協会 JNAクリニカルラダー評価 (プリセプター本人の評価) */}
            <ClinicalLadderSection
              currentUser={currentUser}
              effectiveTargetId={effectiveTargetId}
              ladderData={currentLadder}
              onUpdateCompetencyScore={handleUpdateCompetencyScore}
              onSaveFeedback={handleSaveLadderFeedback}
              isViewingSelf={isViewingSelf}
              staffName={currentStaff?.user?.name}
            />
          </div>
        </div>
      ) : (
        /* ==================== 🌱 新人指導用画面（タイムライン最上部配置 & OJT・看護技術習熟度評価） ==================== */
        <div className="w-full flex flex-col gap-5 animate-fadeIn">
          {/* 1. 🕒 新人の本日のタイムライン (指導用：一番上に配置) */}
          <TimelineScheduleSection
            currentStaff={currentMenteeStaff}
            currentTimeStr={currentTimeStr}
            currentTopPx={currentTopPx}
            simulatedTimeStr={simulatedTimeStr}
            setSimulatedTimeStr={setSimulatedTimeStr}
            showGaps={showGaps}
            setShowGaps={setShowGaps}
            timelineViewMode={timelineViewMode}
            setTimelineViewMode={setTimelineViewMode}
            scheduleGaps={computeScheduleGaps(currentMenteeStaff.timeline)}
            gapSegments={gapSegments}
            setGapSegments={setGapSegments}
            isViewingSelf={false}
          />

          {/* 3. 🤝 本日のOJT指導振り返り＆サンクスカード */}
          <OJTFeedbackSection
            currentUser={currentUser}
            effectiveTargetId={currentMenteeId}
            isViewingSelf={false}
            preceptorName={ojtPreceptorName}
            nurseName={ojtNurseName}
            ojtFeedback={ojtFeedbackMap[currentMenteeId] || ojtFeedbackMap['N002']}
            preceptorKpt={preceptorKptMap[currentMenteeId] || preceptorKptMap['N002']}
            onSubmitOJTFeedback={(fb) => handleSubmitOJTFeedback(currentMenteeId, fb)}
            onSavePreceptorKPT={(kpt) => handleSavePreceptorKPT(currentMenteeId, kpt)}
            isTargetMentee={true}
          />

          {/* 4. 💉 看護技術 5段階習熟度（自立度）チェックリスト (Lv.1〜5 更新可能) */}
          <SkillProficiencyChecklist
            currentUser={currentUser}
            skills={currentTechnicalSkills}
            onUpdateSkillLevel={handleUpdateSkillLevel}
            isViewingSelf={false}
            staffName={currentStaff?.user?.name}
            isTargetMentee={true}
            menteeName={ojtNurseName}
          />

          {/* 5. 新人の本日の振り返り (指導用参照・アドバイス) */}
          <DailyReflectionSection
            currentStaff={currentMenteeStaff}
            effectiveTargetId={currentMenteeId}
            currentUser={currentUser}
            isReflectionEditable={false}
            isViewingSelf={false}
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
      )}

      {/* ➕ 新人指導タブ新設モーダル */}
      {isAddMenteeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <h3 className="font-extrabold text-slate-900 text-base">新しい新人指導タブを新設</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMenteeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              指導・看護技術の評価を担当する新人看護師を選択してください。選択した看護師の指導インデックスがダッシュボード上部に追加されます。
            </p>

            {/* 対象新人選択リスト */}
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto py-1">
              {staffCandidates
                .filter((s) => s.id !== 'N001' && s.id !== 'N003' && !s.roleLabel.includes('管理者') && !s.roleLabel.includes('師長'))
                .map((staff) => {
                  const isAlreadyOpen = menteeTabIds.includes(staff.id);
                  return (
                    <div
                      key={staff.id}
                      onClick={() => !isAlreadyOpen && handleAddMenteeTab(staff.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isAlreadyOpen
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/80 hover:border-emerald-300 text-slate-900 cursor-pointer shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{isAlreadyOpen ? '✅' : '🌱'}</span>
                        <div>
                          <span className="font-black text-xs sm:text-sm block">{staff.name}</span>
                          <span className="text-[11px] font-bold text-slate-500">{staff.roleLabel}</span>
                        </div>
                      </div>

                      {isAlreadyOpen ? (
                        <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                          開設済み
                        </span>
                      ) : (
                        <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-xl shadow-2xs">
                          タブを追加 ➕
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddMenteeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalDashboard;
