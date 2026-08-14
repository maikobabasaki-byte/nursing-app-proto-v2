import { doc, setDoc, collection, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, registerActiveDateInFirestore } from '../lib/firebase';
import { getJSTDateString } from '../utils/dateUtils';
import { fetchGASData } from './gasService';
import { mapGASTaskToExtendedTask, cleanUndefinedFields, isValidGASTask } from './taskSyncService';
import { useTimelineStore } from '../stores/useTimelineStore';

export const seedGuestData = async (guestUid: string, role: 'leader' | 'member' = 'leader') => {
  if (!guestUid) return;

  const todayStr = getJSTDateString();
  const isLeaderRole = role === 'leader';
  const nurseName = isLeaderRole ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）';
  const nurseRoleTitle = isLeaderRole ? '日勤リーダー' : '日勤メンバー';
  const targetNurseId = isLeaderRole ? 'nurse01' : 'nurse02';

  console.log(`🚀 [GuestSeed] GAS 100%連携モード: 役割 [${role}] (ターゲット: ${targetNurseId}, UID: ${guestUid}) のシード開始`);

  try {
    // 1. 👥 ゲスト看護師ドキュメントの初期作成（nurses / nurse_master）
    const nurseRef = doc(db, 'nurses', guestUid);
    await setDoc(
      nurseRef,
      {
        nurse_id: guestUid,
        name: nurseName,
        role: nurseRoleTitle,
        is_leader: isLeaderRole,
        color: isLeaderRole ? '#4F46E5' : '#0284C7',
        team: 'Aチーム',
        assigned_patients: [],
        last_setup_date: todayStr,
        is_logged_in: true,
        is_sos: false,
        x_percent: 45,
        y_percent: 50,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const masterRef = doc(db, 'nurse_master', guestUid);
    await setDoc(
      masterRef,
      {
        nurse_id: guestUid,
        name: nurseName,
        role: isLeaderRole ? 'リーダー' : 'メンバー',
        team: 'Aチーム',
        is_leader: isLeaderRole,
      },
      { merge: true }
    );

    // 2. 🧹 旧ゲストタスク（GUEST-***）および旧ゲストTODO（GUEST-TODO-***）の一括削除
    const allTasksSnap = await getDocs(collection(db, 'tasks'));
    const deleteBatch = writeBatch(db);
    let deletedTaskCount = 0;
    allTasksSnap.docs.forEach((d) => {
      if (d.id.startsWith('GUEST-')) {
        deleteBatch.delete(d.ref);
        deletedTaskCount++;
      }
    });
    if (deletedTaskCount > 0) {
      await deleteBatch.commit();
      console.log(`🧹 [GuestSeed] 旧ゲストタスク ${deletedTaskCount} 件を完全削除しました。`);
    }

    const allTodosSnap = await getDocs(collection(db, 'leader_todos'));
    const todoDeleteBatch = writeBatch(db);
    let deletedTodoCount = 0;
    allTodosSnap.docs.forEach((d) => {
      if (d.id.startsWith('GUEST-TODO-')) {
        todoDeleteBatch.delete(d.ref);
        deletedTodoCount++;
      }
    });
    if (deletedTodoCount > 0) {
      await todoDeleteBatch.commit();
      console.log(`🧹 [GuestSeed] 旧ゲストTODO ${deletedTodoCount} 件を完全削除しました。`);
    }

    // 3. 🌐 Googleスプレッドシート (GAS API) から連携済み本物データをリアルタイム取得
    let copiedTaskCount = 0;
    const gasData = await fetchGASData();

    if (gasData && Array.isArray(gasData.tasks) && gasData.tasks.length > 0) {
      console.log(`📊 [GuestSeed] GASから ${gasData.tasks.length} 件の全タスクを取得。役割 [${role}] に応じた抽出中...`);

      const filteredGasTasks = gasData.tasks.filter((tItem) => {
        // 💡 不完全な空タスク（ゴーストタスク）を除外
        if (!isValidGASTask(tItem)) return false;

        const rawItem = tItem as Record<string, any>;
        const room = String(tItem.room_id || tItem.room || rawItem.room || rawItem['病室'] || '').trim();

        if (isLeaderRole) {
          // 👑 リーダー体験：病棟全体の全ケアタスク・リーダー業務を一元取得
          return true;
        } else {
          // 🩺 メンバー体験：202号室および203号室のタスクのみを厳密抽出
          const is202or203Room = room === '202' || room === '203' || room.includes('202') || room.includes('203');
          return is202or203Room;
        }
      });

      const targetGasTasks = filteredGasTasks.length > 0 ? filteredGasTasks : (isLeaderRole ? gasData.tasks : []);
      const copiedPatientIds: string[] = [];

      // 💡 重複タスクの防止（患者ID + タイトル + 表示時間 でデデュープ）
      const seenTaskKeys = new Set<string>();

      for (let i = 0; i < targetGasTasks.length; i++) {
        const gTask = targetGasTasks[i];
        if (!isValidGASTask(gTask)) continue;

        const mapped = mapGASTaskToExtendedTask(gTask, i, todayStr, nurseName, gasData.patients);
        if (!mapped.title || mapped.title === '無題タスク') continue;

        const taskKey = `${mapped.patient_id}_${mapped.title}_${mapped.display_period}`;
        if (seenTaskKeys.has(taskKey)) {
          continue; // 同一患者・同一内容・同一時間の重複タスクをスキップ
        }
        seenTaskKeys.add(taskKey);

        const newTaskId = `GUEST-${mapped.task_id}-${guestUid.slice(0, 5)}`;

        if (mapped.patient_id) {
          copiedPatientIds.push(mapped.patient_id);
        }

        const clonedTask = cleanUndefinedFields({
          ...mapped,
          task_id: newTaskId,
          nurse_id: guestUid,
          nurse_name: nurseName,
          assigned_nurse_id: guestUid,
          staff_id: guestUid,
          target_date: todayStr,
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'tasks', newTaskId), clonedTask, { merge: true });
        copiedTaskCount++;
      }

      // 4. 🏥 GASから取得した患者マスター (gasData.patients) のうち、コピー対象タスクに関連する患者のみを Firestore patients コレクションに保存
      if (Array.isArray(gasData.patients) && gasData.patients.length > 0) {
        const uniqueCopiedPatientIds = Array.from(new Set(copiedPatientIds));
        const matchedGasPatients = gasData.patients.filter((p) => {
          const pid = String(p.patient_id || (p as any).patientId || (p as any).id || '').trim();
          return uniqueCopiedPatientIds.includes(pid) || (!isLeaderRole && (p.room_id === '202' || p.room_id === '203'));
        });

        for (const p of matchedGasPatients) {
          const pid = String(p.patient_id || (p as any).patientId || (p as any).id || '').trim();
          if (!pid) continue;

          try {
            await setDoc(
              doc(db, 'patients', pid),
              cleanUndefinedFields({
                patient_id: pid,
                name: p.name || (p as any).patient_name || `患者(${pid})`,
                room_id: String(p.room_id || (p as any).room || '').trim(),
                bed_number: p.bed_number || '',
                team: p.team || 'Aチーム',
                is_sos: false,
              }),
              { merge: true }
            );
          } catch (pErr) {
            try {
              await setDoc(
                doc(db, 'tasks', `system-patient-${pid}`),
                cleanUndefinedFields({
                  is_patient_doc: true,
                  patient_id: pid,
                  name: p.name || (p as any).patient_name || `患者(${pid})`,
                  room_id: String(p.room_id || (p as any).room || '').trim(),
                  bed_number: p.bed_number || '',
                  team: p.team || 'Aチーム',
                  is_sos: false,
                }),
                { merge: true }
              );
            } catch (sysErr) {
              // 無視して続行
            }
          }
        }

        if (uniqueCopiedPatientIds.length > 0) {
          await setDoc(nurseRef, { assigned_patients: uniqueCopiedPatientIds }, { merge: true });
          useTimelineStore.getState().setSelectedPatients(uniqueCopiedPatientIds);
        }
      }

      console.log(`✅ [GuestSeed] GASから ${targetNurseId} / 対象患者のタスク ${copiedTaskCount} 件を完全コピーしました!`);

      // 5. 👑 スプレッドシート側のTODOデータ (gasData.todos または gasData.leader_todos) があればコピー
      const gasTodos = (gasData as any).todos || (gasData as any).leader_todos || [];
      if (isLeaderRole && Array.isArray(gasTodos) && gasTodos.length > 0) {
        let copiedTodoCount = 0;
        for (let i = 0; i < gasTodos.length; i++) {
          const gTodo = gasTodos[i];
          const todoId = `GUEST-TODO-${gTodo.todo_id || i + 1}-${guestUid.slice(0, 5)}`;
          await setDoc(
            doc(db, 'leader_todos', todoId),
            cleanUndefinedFields({
              ...gTodo,
              todo_id: todoId,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            }),
            { merge: true }
          );
          copiedTodoCount++;
        }
        console.log(`✅ [GuestSeed] GASからリーダーTODO ${copiedTodoCount} 件をコピーしました。`);
      }
    } else {
      console.warn("⚠️ [GuestSeed] GASからタスクデータが取得できませんでした。");
    }

    // 💡 稼働日（active_dates）に登録
    await registerActiveDateInFirestore(todayStr);

  } catch (error) {
    console.error('❌ [GuestSeed] GASデータ取得・コピー処理エラー:', error);
  }
};
