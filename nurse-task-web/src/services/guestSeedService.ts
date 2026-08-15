import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, registerActiveDateInFirestore } from '../lib/firebase';
import { getJSTDateString } from '../utils/dateUtils';
import { mapGASTaskToExtendedTask, isValidGASTask } from './taskSyncService';
import { useTimelineStore } from '../stores/useTimelineStore';

export const seedGuestData = async (guestUid: string, role: 'leader' | 'member' = 'leader') => {
  if (!guestUid) return;

  const todayStr = getJSTDateString();
  const isLeaderRole = role === 'leader';
  const nurseName = isLeaderRole ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）';

  console.log(`🚀 [GuestSeed] ゲストセッション初期化: 役割 [${role}] (UID: ${guestUid}) - ローカル環境で即時準備中...`);

  try {
    // 1. 📁 ローカルJSON (/data/tasks.json & /data/patients.json) を即時取得
    const [tasksRes, patientsRes] = await Promise.all([
      fetch('/data/tasks.json').then((r) => r.json()).catch(() => []),
      fetch('/data/patients.json').then((r) => r.json()).catch(() => []),
    ]);

    const localTasksRaw: any[] = Array.isArray(tasksRes) ? tasksRes : [];
    const localPatientsRaw: any[] = Array.isArray(patientsRes) ? patientsRes : [];

    // 2. フィルタリング (メンバーは202/203号室限定、リーダーは全患者)
    const filteredTasks = localTasksRaw.filter((t: any) => {
      if (!isValidGASTask(t)) return false;
      const room = String(t.room_id || t.room || '').trim();
      if (isLeaderRole) {
        return true;
      }
      return room === '202' || room === '203' || room.includes('202') || room.includes('203');
    });

    const seenTaskKeys = new Set<string>();
    const copiedPatientIds: string[] = [];
    const mappedTasks: any[] = [];

    filteredTasks.forEach((gTask: any, i: number) => {
      const mapped = mapGASTaskToExtendedTask(gTask, i, todayStr, nurseName, localPatientsRaw);
      if (!mapped.title || mapped.title === '無題タスク') return;

      const taskKey = `${mapped.patient_id}_${mapped.title}_${mapped.display_period}`;
      if (seenTaskKeys.has(taskKey)) return;
      seenTaskKeys.add(taskKey);

      const newTaskId = `GUEST-${mapped.task_id}-${guestUid.slice(0, 5)}`;
      if (mapped.patient_id) {
        copiedPatientIds.push(mapped.patient_id);
      }

      mappedTasks.push({
        ...mapped,
        task_id: newTaskId,
        nurse_id: guestUid,
        nurse_name: nurseName,
        assigned_nurse_id: guestUid,
        staff_id: guestUid,
        target_date: todayStr,
        is_guest: true,
      });
    });

    // 3. Zustand ストアへ直接アトミック注入
    const uniquePatientIds = Array.from(new Set(copiedPatientIds)).filter(Boolean);
    const store = useTimelineStore.getState();
    store.setTasks(mappedTasks);
    store.addDemoTask(); // 🎯 【重要】練習用タスク（【練習用】術前絶飲食確認）を自動生成！

    const finalPatientIds = uniquePatientIds.length > 0
      ? uniquePatientIds
      : localPatientsRaw.slice(0, 4).map((p: any) => p.patient_id).filter(Boolean);

    store.setSelectedPatients(finalPatientIds);

    // 4. リーダーTODOのローカル設定
    if (isLeaderRole) {
      const defaultLeaderTodos: any[] = [
        {
          todo_id: `GUEST-TODO-1-${guestUid.slice(0, 5)}`,
          patient_id: 'P-001',
          title: '朝の全体カンファレンス申し送り',
          category: '申し送り',
          priority: 'high',
          requires_double_check: false,
          status: 'untouched',
          patient_name: '全体病棟',
          room_id: 'カンファ室',
          scheduled_at: '08:45',
          result_outcome: '夜勤からの引き継ぎ確認完了。本日手術1件、重症観察2件の重点フォロー。',
          doctor_instructions: 'Dr.田中指示：午前中に201号室の点滴変更予定。',
        },
        {
          todo_id: `GUEST-TODO-2-${guestUid.slice(0, 5)}`,
          patient_id: 'P-002',
          title: 'Dr.佐藤 回診同行および指示受け',
          category: '回診',
          priority: 'medium',
          requires_double_check: false,
          status: 'in_progress',
          patient_name: '202号室 中島伊織',
          room_id: '202',
          scheduled_at: '10:30',
          result_outcome: '術前検査結果報告完了。午後14時IC決定。',
          doctor_instructions: 'バイタル安定のため降圧剤継続。',
        },
      ];
      store.setLeaderTodos(defaultLeaderTodos);
    }

    // 5. 権限がある場合のみバックグラウンドでFirestoreドキュメント作成を試行（権限エラー時は無視）
    try {
      const nurseRef = doc(db, 'nurses', guestUid);
      const seedBatch = writeBatch(db);
      seedBatch.set(
        nurseRef,
        {
          nurse_id: guestUid,
          name: nurseName,
          role: isLeaderRole ? '日勤リーダー' : '日勤メンバー',
          is_leader: isLeaderRole,
          color: isLeaderRole ? '#4F46E5' : '#0284C7',
          team: 'Aチーム',
          assigned_patients: uniquePatientIds,
          last_setup_date: todayStr,
          is_logged_in: true,
          is_sos: false,
          x_percent: 45,
          y_percent: 50,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await seedBatch.commit();
      await registerActiveDateInFirestore(todayStr);
    } catch (fsErr) {
      // ゲストは権限なし・完全ローカル動作用のため権限エラーはサイレントで無視
    }

    console.log(`✨ [GuestSeed] ゲストローカル初期化が完了しました (${mappedTasks.length}件のタスク)`);
    return finalPatientIds;

  } catch (error) {
    console.error('❌ [GuestSeed] ゲストローカル初期化エラー:', error);
    return [];
  }
};
