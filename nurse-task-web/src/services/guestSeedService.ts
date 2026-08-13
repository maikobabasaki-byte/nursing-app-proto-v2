import { doc, setDoc, collection, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ExtendedTask, LeaderTodo } from '../types/types';
import { getJSTDateString } from '../utils/dateUtils';

export const seedGuestData = async (guestUid: string) => {
  if (!guestUid) return;

  // 🎯 動的な当日の日付文字列を取得 (例: "2026-08-13")
  const todayStr = getJSTDateString();
  console.log(`🌱 [GuestSeed] 11:30現在想定の臨床ストーリーシードデータを生成中... (日付: ${todayStr}, UID: ${guestUid})`);

  try {
    // 🧹 既存の不要な11:30以外のSOS応援要請・割り込みを自動消去
    try {
      const targetSosTaskId = `GUEST-TASK-003-${guestUid.slice(0, 5)}`;
      const qTasks = query(collection(db, 'tasks'), where('is_sos', '==', true));
      const snapTasks = await getDocs(qTasks);
      for (const taskDoc of snapTasks.docs) {
        if (taskDoc.id !== targetSosTaskId) {
          await updateDoc(doc(db, 'tasks', taskDoc.id), { is_sos: false });
        }
      }
    } catch (cleanErr) {
      console.warn("⚠️ [GuestSeed] 過去SOSのクリーンアップ失敗:", cleanErr);
    }

    // 1. 👥 ゲスト看護師ドキュメントの作成（本日セットアップ済み＆3名患者受持ち）
    const nurseRef = doc(db, 'nurses', guestUid);
    await setDoc(
      nurseRef,
      {
        nurse_id: guestUid,
        name: 'ゲスト看護師（体験用）',
        role: '日勤メンバー',
        color: '#0284C7',
        team: 'Aチーム',
        assigned_patients: ['P-GUEST-101', 'P-GUEST-102', 'P-GUEST-103'],
        last_setup_date: todayStr,
        is_logged_in: true,
        is_sos: false,
        x_percent: 45,
        y_percent: 50,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. 📋 11:30現在を軸としたストーリー整合シードタスクの生成
    const sampleTasks: Omit<ExtendedTask, 'task_id'>[] = [
      {
        // 💡 10:00 [201号室 A様] 完了 (Completed)
        // ストーリー：すでに終わっている過去のタスク
        patient_id: 'P-GUEST-101',
        patient_name: '山田 太郎 (A様)',
        room_id: '201',
        title: '🍼 経管栄養開始・滴下速度調整',
        details: 'PEG（胃瘻）より栄養剤500ml開始。150ml/hにて滴下開始確認。無事完了。',
        status: 'completed',
        scheduled_at: '10:00',
        initial_period: '10:00',
        display_period: '10:00',
        category: '処置',
        priority: 'high',
        is_sos: false,
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
      {
        // 💡 10:30 [203号室 C様] 中断中 (Interrupted / pending)
        // ストーリー：着手していたが、11:30のSOS対応（202号室離床センサー作動）に呼ばれて保留中
        patient_id: 'P-GUEST-103',
        patient_name: '鈴木 一郎 (C様)',
        room_id: '203',
        title: '🩹 褥瘡処置（仙骨部ポケット洗浄等）',
        details: '生理食塩水にて仙骨部ポケット洗浄。※202号室離床センサーSOSコール対応のため途中で処置一時中断中。',
        status: 'pending',
        scheduled_at: '10:30',
        initial_period: '10:30',
        display_period: '10:30',
        category: '処置',
        priority: 'medium',
        is_sos: false,
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
      {
        // 💡 11:30 [202号室 B様] 応援要請 (SOS緊急アラート - 全体で唯一のSOSデータ)
        patient_id: 'P-GUEST-102',
        patient_name: '佐藤 花子 (B様)',
        room_id: '202',
        title: '🚨 応援要請（離床センサー作動）',
        details: 'ベッド上起き上がり離床センサー検知！高リスク転倒回避のため至急現場サポート要請中。',
        status: 'untouched',
        scheduled_at: '11:30',
        initial_period: '11:30',
        display_period: '11:30',
        category: '観察',
        priority: 'high',
        is_sos: true,
        sos_reason: '202号室離床センサー検知！急変・転倒リスクのため現場サポート要請中',
        requested_by_id: guestUid,
        requested_by_name: 'ゲスト看護師（体験用）',
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
      {
        // 💡 11:30 [202号室 B様] 実施中 (In Progress / progressing)
        patient_id: 'P-GUEST-102',
        patient_name: '佐藤 花子 (B様)',
        room_id: '202',
        title: '🧠 訪室・状態確認（神経学的所見チェック等）',
        details: 'SOS検知により訪室中。意識レベルJCS確認、対光反射、右上肢麻痺の進行有無を観察中。',
        status: 'progressing',
        scheduled_at: '11:30',
        initial_period: '11:30',
        display_period: '11:30',
        category: '観察',
        priority: 'high',
        is_sos: false,
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
      {
        // 💡 12:00 [202号室 B様] 未着手 (Not Started / untouched)
        // ストーリー：これからの未来の予定タスク
        patient_id: 'P-GUEST-102',
        patient_name: '佐藤 花子 (B様)',
        room_id: '202',
        title: '🍚 昼食介助（トロミ食・嚥下評価）',
        details: '嚥下評価実施の上、30度ギャッジアップにてトロミ付き食の配膳・介助予定。',
        status: 'untouched',
        scheduled_at: '12:00',
        initial_period: '12:00',
        display_period: '12:00',
        category: 'ケア',
        priority: 'medium',
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },

      // 🚀 【未配置タスクプール用カード】 (display_period: "")
      {
        patient_id: 'P-GUEST-103',
        patient_name: '鈴木 一郎 (C様)',
        room_id: '203',
        title: '🔄 2時間毎体位変換・除圧クッション再配置 (未配置)',
        details: '右側臥位へ体位変換。仙骨部発赤チェック。',
        status: 'untouched',
        scheduled_at: '',
        initial_period: '',
        display_period: '',
        category: 'ケア',
        priority: 'high',
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
      {
        patient_id: 'P-GUEST-101',
        patient_name: '山田 太郎 (A様)',
        room_id: '201',
        title: '🪥 口腔ケア・Yガーゼ交換 (未配置)',
        details: 'PEG刺入部Yガーゼ交換および口腔内保湿。',
        status: 'untouched',
        scheduled_at: '',
        initial_period: '',
        display_period: '',
        category: 'ケア',
        priority: 'medium',
        nurse_id: guestUid,
        nurse_name: 'ゲスト看護師（体験用）',
        isGroup: false,
        isChild: false,
      },
    ];

    for (let i = 0; i < sampleTasks.length; i++) {
      const taskId = `GUEST-TASK-00${i + 1}-${guestUid.slice(0, 5)}`;
      const taskRef = doc(db, 'tasks', taskId);
      await setDoc(
        taskRef,
        {
          ...sampleTasks[i],
          task_id: taskId,
          created_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 3. 👑 リーダーTODOデータの生成
    const sampleTodos: Omit<LeaderTodo, 'todo_id'>[] = [
      {
        title: '201号室 A様：14時NST合同回診。カルテ＆栄養計画書の事前準備',
        category: 'ic_meeting',
        priority: 'high',
        status: 'untouched',
        assigned_nurse_name: 'ゲスト看護師（体験用）',
        target_patient_name: '山田 太郎様 (A様)',
        target_room_id: '201',
      },
      {
        title: '202号室 B様：離床センサー感度調整および主治医へ神経所見報告',
        category: 'doctor_instruction',
        priority: 'high',
        status: 'completed',
        assigned_nurse_name: 'ゲスト看護師（体験用）',
        target_patient_name: '佐藤 花子様 (B様)',
        target_room_id: '202',
      },
    ];

    for (let i = 0; i < sampleTodos.length; i++) {
      const todoId = `GUEST-TODO-00${i + 1}-${guestUid.slice(0, 5)}`;
      const todoRef = doc(db, 'leader_todos', todoId);
      await setDoc(
        todoRef,
        {
          ...sampleTodos[i],
          todo_id: todoId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log("✅ [GuestSeed] 11:30現在想定ストーリー（10:00完了/10:30中断/11:30SOS/11:30実施中/12:00未着手）のシードデータ生成完了!");
  } catch (error) {
    console.error('ゲストダミーデータ生成エラー:', error);
  }
};
