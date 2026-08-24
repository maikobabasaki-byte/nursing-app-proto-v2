import React, { useState, useEffect, useRef } from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useUserName } from '../../hooks/useUserName';
import { respondToNurseSosWithTransaction, respondToTaskSosWithTransaction } from '../../lib/firebase';
import type { ExtendedTask } from '../../types/types';
import { getSessionId } from '../../utils/userUtils';

// 📡 近接端末・別タブ間での0秒リアルタイムブロードキャスト通信チャンネル
const sosBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nurse_app_sos_sync')
  : null;

export const GlobalSosToast: React.FC = () => {
  const nurses = useTimelineStore((state) => state.nurses);
  const allTasks = useTimelineStore((state) => state.allTasks);
  const patientSosList = useTimelineStore((state) => state.patientSosList || []);
  const storeMemos = useTimelineStore((state) => state.memos || []);
  const handleSaveMemo = useTimelineStore((state) => state.handleSaveMemo);
  const respondToNurseSos = useTimelineStore((state) => state.respondToNurseSos);
  const respondToTaskSos = useTimelineStore((state) => state.respondToTaskSos);
  const respondToPatientSos = useTimelineStore((state) => state.respondToPatientSos);
  const currentUser = useTimelineStore((state) => state.currentUser);
  const currentUserName = useUserName();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // 🔔 1. ブラウザ／OS標準の通知許可（Notification.requestPermission）の自動要求
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const requestPermission = () => {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch((err) => {
          console.error('通知許可リクエストエラー:', err);
        });
      }
    };

    // コンポーネントのマウント時に通知許可を要求
    requestPermission();

    // ブラウザのジェスチャー制限対策（ユーザーの初回操作時にも試行）
    const handleUserInteraction = () => {
      requestPermission();
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };

    if (Notification.permission === 'default') {
      window.addEventListener('click', handleUserInteraction, { once: true });
      window.addEventListener('keydown', handleUserInteraction, { once: true });
    }

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true
  );

  const checkIsGuestSource = (id?: string, name?: string, email?: string): boolean => {
    const sId = String(id || '').trim().toLowerCase();
    const sName = String(name || '').trim();
    const sEmail = String(email || '').trim().toLowerCase();
    return (
      sId.includes('guest') ||
      sId.startsWith('guest-') ||
      sId.startsWith('guest_') ||
      sId.startsWith('demo-') ||
      sEmail.includes('guest') ||
      sName.includes('ゲスト')
    );
  };

  const activeMemoToasts = storeMemos.filter((m) => {
    if (m.is_completed || dismissedIds.includes(`memo-${m.id}`)) return false;
    const isMemoGuest = checkIsGuestSource(m.id || m.target_room_id, (m as any).created_by);
    if (isGuestUser !== isMemoGuest) return false;

    // 🛡️ メモの他ユーザー共有を100%完全遮断（作成者本人以外の画面・通知には一切表示しない）
    const memoCreator = String((m as any).created_by || (m as any).nurse_name || (m as any).nurse_id || '').trim().replace(/[\s　]+/g, '');
    if (memoCreator !== '') {
      const isMyMemo = (myNurseId !== '' && memoCreator === myNurseId) || (myNurseName !== '' && memoCreator === myNurseName);
      if (!isMyMemo) return false;
    }
    return true;
  });

  const responderName = currentUserName || '自分';

  const currentSessionId = getSessionId();
  const myNurseId = String(currentUser?.nurse_id || currentUser?.staff_id || sessionStorage.getItem('nurse_id') || '').trim();
  const myNurseName = String(currentUser?.name || currentUserName || sessionStorage.getItem('nurse_name') || '').trim().replace(/[\s　]+/g, '');

  const flattenTasks = (tasks: ExtendedTask[]): ExtendedTask[] => {
    let result: ExtendedTask[] = [];
    tasks.forEach((t) => {
      result.push(t);
      if (t.children && t.children.length > 0) {
        result = result.concat(flattenTasks(t.children as ExtendedTask[]));
      }
    });
    return result;
  };

  // 💡 BroadcastChannel による別タブ・別画面へのリアルタイム通信受信
  useEffect(() => {
    if (!sosBroadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      // 🛡️ 自分がまさにこのタブ/画面で送信した通信（senderSessionId === currentSessionId）の場合は無視（自爆メッセージ誤警告を防止）
      if (data.senderSessionId && data.senderSessionId === currentSessionId) {
        return;
      }

      if (data.type === 'NURSE_SOS_RESPONDED') {
        respondToNurseSos(data.nurseId, data.responderName || responderName);
        setDismissedIds((prev) => [...prev, `nurse-${data.nurseId}`]);
        if (data.responderName && data.responderName !== responderName) {
          const isRequester = (myNurseId !== '' && data.nurseId === myNurseId);
          if (isRequester) {
            setConflictNotice(`🤝 ${data.responderName} ナースがあなたのSOSに応答し、支援に入りました！`);
          } else {
            setConflictNotice(`【重複回避】${data.responderName} ナースが既に対応を開始しました！`);
          }
          setTimeout(() => setConflictNotice(null), 4000);
        }
      } else if (data.type === 'TASK_SOS_RESPONDED') {
        respondToTaskSos(data.taskId, data.responderName || responderName);
        setDismissedIds((prev) => [...prev, `task-${data.taskId}`]);
        if (data.responderName && data.responderName !== responderName) {
          setConflictNotice(`🤝 ${data.responderName} ナースがタスク緊急要請の応援対応に入りました！`);
          setTimeout(() => setConflictNotice(null), 4000);
        }
      } else if (data.type === 'PATIENT_SOS_RESPONDED') {
        respondToPatientSos(data.patientId, data.responderName || responderName);
        setDismissedIds((prev) => [...prev, `patient-${data.patientId}`]);
        if (data.responderName && data.responderName !== responderName) {
          setConflictNotice(`🤝 ${data.responderName} ナースが患者緊急要請の対応に入りました！`);
          setTimeout(() => setConflictNotice(null), 4000);
        }
      }
    };

    sosBroadcastChannel.addEventListener('message', handleMessage);
    return () => {
      sosBroadcastChannel.removeEventListener('message', handleMessage);
    };
  }, [respondToNurseSos, respondToTaskSos, respondToPatientSos, responderName, currentSessionId]);

  // 💡 FirestoreのSOS状態クリア（is_sos === false）を検知して dismissedIds を自動クリーンアップ
  useEffect(() => {
    const activeNurseSosIds = new Set(nurses.filter((n) => n.is_sos).map((n) => `nurse-${n.nurse_id}`));
    const activeTaskSosIds = new Set(flattenTasks(allTasks).filter((t) => t.is_sos || (t as any).sos_reason).map((t) => `task-${t.task_id}`));
    const activePatientSosIds = new Set(patientSosList.flatMap((p) => [`patient-${p.patient_id}`, String(p.patient_id)]));
    const activeMemoIds = new Set(storeMemos.filter((m) => !m.is_completed).map((m) => `memo-${m.id}`));

    setDismissedIds((prev) => prev.filter((id) => 
      activeNurseSosIds.has(id) || 
      activeTaskSosIds.has(id) ||
      activePatientSosIds.has(id) ||
      activeMemoIds.has(id)
    ));
  }, [nurses, allTasks, patientSosList, storeMemos]);

  const normalizeStr = (str?: string) =>
    String(str || '')
      .toLowerCase()
      .replace(/[\s　🚨📞🤝【】（）()!！:：]+/g, '')
      .trim();

  const isSelfSource = (id?: string, name?: string, senderSession?: string) => {
    const sId = String(id || '').trim();
    const sName = normalizeStr(name);
    const sSession = String(senderSession || '').trim();

    // 1. 同一セッションIDの一致（自タブ/自画面での自爆通知防止）
    if (sSession !== '' && currentSessionId !== '' && sSession === currentSessionId) {
      return true;
    }

    // 2. ナースIDの明確な一致判定
    if (myNurseId !== '' && sId !== '' && myNurseId !== 'guest_nurse') {
      const cleanMyId = myNurseId.replace(/^nurse-/, '');
      const cleanSId = sId.replace(/^nurse-/, '');
      if (cleanMyId === cleanSId) {
        return true;
      }
    }

    // 3. ナース名の明確な一致判定（※「自分」等の汎用名は本人判定に使用しない！）
    const myNameNorm = normalizeStr(myNurseName);
    if (
      myNameNorm !== '' && 
      sName !== '' && 
      myNameNorm !== '自分' && 
      sName !== '自分' &&
      myNameNorm !== '要請ナース' && 
      sName !== '要請ナース'
    ) {
      if (sName === myNameNorm) {
        return true;
      }
    }

    return false;
  };

  // 1. 他画面・他スタッフからの「看護師SOS」を抽出（本人画面へは通知・トースト非表示）
  const activeSosNurses = nurses.filter((nurse) => {
    if (nurse.is_sos !== true) return false;
    if (dismissedIds.includes(`nurse-${nurse.nurse_id}`)) return false;

    const senderSessionId = (nurse as any).sos_sender_session_id;
    if (isSelfSource(nurse.nurse_id, nurse.name, senderSessionId)) {
      return false;
    }

    const isTargetGuest = checkIsGuestSource(nurse.nurse_id, nurse.name, (nurse as any).email) || (nurse as any).is_guest === true;
    if (isGuestUser !== isTargetGuest) return false;

    return true;
  });

  // 2. フラット化した全タスクからアクティブな「タスクSOS」を抽出（本人画面へは通知・トースト非表示）
  const activeSosTasks = flattenTasks(allTasks).filter((task) => {
    // 🛡️ タスクSOSは患者に紐づくタスクのみ！患者ID・名が無いものは絶対にタスクSOSではない（看護師SOS等の誤混入・2重空表示を100%遮断）
    if (!task.patient_id || task.patient_id.trim() === '' || !task.patient_name || task.patient_name.trim() === '') {
      return false;
    }

    const taskId = String(task.task_id || '').toLowerCase();
    const taskTitle = String(task.title || '').toLowerCase();

    // 🛡️ 対応記録割り込みタスク、患者SOSタスク、看護師SOSタスクは専用ルートで処理するため100%除外（二重表示・空項目発生を完全防止）
    if (
      (task as any).is_interruption === true || 
      taskId.includes('interrupt') ||   // CALL_INTERRUPT_ などを包括的につかまえる
      taskId.includes('patient-sos') || // patient-sos- などをつかまえる
      taskId.includes('patient_sos') ||
      taskId.includes('nurse_sos') ||   // NURSE_SOS_ などをつかまえる
      taskId.includes('nurse-sos') ||
      taskTitle.includes('緊急sos要請中') ||
      taskTitle.includes('看護師sos対応')
    ) {
      return false;
    }

    if (task.is_sos !== true && !(task as any).sos_reason) return false;
    if (dismissedIds.includes(`task-${task.task_id}`)) return false;

    const reqId = String(task.requested_by_id || '').trim();
    const reqName = String(task.requested_by_name || '').trim();
    const senderSessionId = (task as any).sos_sender_session_id;

    // 🛡️ 担当者(nurse_id)への誤フォールバックを排除し、実際にボタンを押した要請者のみで本人判定
    if (reqId !== '' || reqName !== '' || senderSessionId) {
      if (isSelfSource(reqId, reqName, senderSessionId)) {
        return false;
      }
    }

    const isTargetGuest = checkIsGuestSource(
      task.task_id || task.requested_by_id || task.nurse_id, 
      task.requested_by_name || task.nurse_name,
      (task as any).email
    ) || (task as any).is_guest === true;
    if (isGuestUser !== isTargetGuest) return false;

    return true;
  });

  // 💡 修正：ボタンを押した瞬間に0秒でUIを更新（楽観的更新）し、全端末へブロードキャスト送信＆マップ画面へ自動切替
  const handleRespondNurse = async (nurseId: string) => {
    // 🗺️ 応援に応じた瞬間に0秒でマップ画面（'map'）へ自動遷移
    useTimelineStore.getState().setActiveScreen('map');

    const targetNurse = nurses.find((n) => n.nurse_id === nurseId);
    setConflictNotice(`🏃 ${targetNurse?.name || '要請ナース'} さんの元へ向かってください！`);
    setTimeout(() => setConflictNotice(null), 5000);

    // 1. 即座にローカルストアと画面表示をクリア（0秒で反応・ブロッキング排除）
    respondToNurseSos(nurseId, responderName);
    setDismissedIds((prev) => [...prev, `nurse-${nurseId}`]);

    // 2. 近接端末・他タブへ0秒即時ブロードキャスト送信
    if (sosBroadcastChannel) {
      sosBroadcastChannel.postMessage({
        type: 'NURSE_SOS_RESPONDED',
        nurseId,
        responderName,
        senderSessionId: currentSessionId,
      });
    }

    // 3. バックグラウンドで割り込みタスクの作成（要件4-A: 発信者本人＋応援者の両方のタイムラインへ作成）
    try {
      const reqId = targetNurse?.nurse_id || nurseId;
      const { triggerNurseCallInterruption } = await import('../../hooks/useTaskUpdate');
      await triggerNurseCallInterruption({
        patientId: '',
        patientName: targetNurse?.name ? `${targetNurse.name}の応援対応` : '緊急SOS対応',
        roomId: '',
        sosReason: targetNurse?.sos_reason || `${targetNurse?.name || '他スタッフ'}からの緊急SOS対応要請`,
        title: `🚨 看護師SOS対応 (${targetNurse?.name || '他スタッフ'}の応援)`,
        requestedById: reqId,
        requestedByName: targetNurse?.name || '要請スタッフ',
        targetNurseIds: [reqId, myNurseId].filter(Boolean),
      });
    } catch (e) {
      console.error("看護師SOSタスク作成エラー:", e);
    }

    // 4. バックグラウンドで Firestore トランザクション通信（要件3: 自分自身なら重複警告を出さない）
    try {
      const result = await respondToNurseSosWithTransaction(nurseId, responderName);
      if (result && result.alreadyResponded) {
        const responder = result.responderName || '別のスタッフ';
        if (responder !== responderName && !responder.includes(responderName)) {
          setConflictNotice(`🚨 【対応重複】すでに ${responder} さんが対応に向かっています！`);
          setTimeout(() => setConflictNotice(null), 4000);
        }
      }
    } catch (error) {
      console.error("看護師SOS対応エラー:", error);
    }
  };

  const handleRespondTask = async (taskId: string) => {
    // 🗺️ 応援に応じた瞬間に0秒でマップ画面（'map'）へ自動遷移
    useTimelineStore.getState().setActiveScreen('map');

    const { flattenTasks } = await import('../../utils/taskLogic');
    const targetTask = flattenTasks(allTasks).find((t) => t.task_id === taskId);
    setConflictNotice(`🏃 ${targetTask?.nurse_name || '要請ナース'} さんの「${targetTask?.title || 'タスク'}」の場所へ向かってください！`);
    setTimeout(() => setConflictNotice(null), 5000);

    // 1. 即座にローカルストアと画面表示をクリア（0秒で反応・ブロッキング排除）
    respondToTaskSos(taskId, responderName);
    setDismissedIds((prev) => [...prev, `task-${taskId}`]);

    // 2. 近接端末・他タブへ0秒即時ブロードキャスト送信
    if (sosBroadcastChannel) {
      sosBroadcastChannel.postMessage({
        type: 'TASK_SOS_RESPONDED',
        taskId,
        responderName,
        senderSessionId: currentSessionId,
      });
    }

    // 3. バックグラウンドで割り込みタスクの作成（要件4-B: 応援者のみのタイムラインへ作成）
    try {
      const reqId = targetTask?.requested_by_id || targetTask?.nurse_id || '';
      const { triggerNurseCallInterruption } = await import('../../hooks/useTaskUpdate');
      await triggerNurseCallInterruption({
        patientId: targetTask?.patient_id || '',
        patientName: targetTask?.patient_name || '患者',
        roomId: targetTask?.room_id || '',
        sosReason: targetTask ? `「${targetTask.title}」支援応援対応` : 'タスク支援要請への応援対応',
        title: `🚨 タスクSOS支援対応 (${targetTask?.patient_name ? `${targetTask.patient_name}様` : '要請'})`,
        requestedById: reqId,
        requestedByName: targetTask?.requested_by_name || targetTask?.nurse_name || '',
        targetNurseIds: [myNurseId].filter(Boolean),
      });
    } catch (e) {
      console.error("タスクSOSタスク作成エラー:", e);
    }

    // 4. バックグラウンドで Firestore トランザクション通信（要件3: 自分自身なら重複警告を出さない）
    try {
      const result = await respondToTaskSosWithTransaction(taskId, responderName);
      if (result && result.alreadyResponded) {
        const responder = result.responderName || '別のスタッフ';
        if (responder !== responderName && !responder.includes(responderName)) {
          setConflictNotice(`🚨 【対応重複】すでに ${responder} さんがこのタスクのサポートに入っています！`);
          setTimeout(() => setConflictNotice(null), 4000);
        }
      }
    } catch (error) {
      console.error("タスクSOS対応エラー:", error);
    }
  };

  const handleRespondPatient = async (patientId: string, patientName: string, roomId?: string, reason?: string) => {
    // 🗺️ 応援に応じた瞬間に0秒でマップ画面（'map'）へ自動遷移
    useTimelineStore.getState().setActiveScreen('map');

    setConflictNotice(`🏃 ${roomId ? `${roomId}号室 ` : ''}${patientName || '患者'}様の元へ向かってください！`);
    setTimeout(() => setConflictNotice(null), 5000);

    // 1. 即座にローカルストアおよびFirestoreの患者SOSをクリア（0秒で反応・ブロッキング排除）
    respondToPatientSos(patientId, responderName);
    setDismissedIds((prev) => [...prev, `patient-${patientId}`]);

    // 2. 近接端末・他タブへ0秒即時ブロードキャスト送信
    if (sosBroadcastChannel) {
      sosBroadcastChannel.postMessage({
        type: 'PATIENT_SOS_RESPONDED',
        patientId,
        responderName,
        senderSessionId: currentSessionId,
      });
    }

    // 3. バックグラウンドで割り込みタスクの作成（要件4-A: 発信者/担当者＋応援者の両方のタイムラインへ作成）
    try {
      const targetPatient = patientSosList.find((p) => p.patient_id === patientId);
      const reqId = targetPatient?.requested_by_id || '';
      const { triggerNurseCallInterruption } = await import('../../hooks/useTaskUpdate');
      await triggerNurseCallInterruption({
        patientId: patientId || '',
        patientName: patientName || '患者',
        roomId: roomId || '病室',
        sosReason: reason || `${patientName || '患者'}様 (${roomId ? `${roomId}号室` : ''}) への緊急応援要請`,
        title: `🤝 緊急応援要請対応 (${patientName || '患者'}様)`,
        requestedById: reqId,
        requestedByName: targetPatient?.requested_by_name || '',
        targetNurseIds: [reqId, myNurseId].filter(Boolean),
      });
    } catch (e) {
      console.error("患者SOS対応割り込み作成エラー:", e);
    }
  };

  // 🔍 デバッグ用: Store到達・全体の患者SOS保持状況の定期/評価時ログ
  if (patientSosList.length > 0) {
    console.log(`[Store受信チェック] Store内に患者SOSデータが届いています (${patientSosList.length}件):`, patientSosList.map(p => ({ id: p.patient_id, name: p.patient_name })));
  }

  const activeSosPatients = patientSosList.filter((p) => {
    if (dismissedIds.includes(p.patient_id) || dismissedIds.includes(`patient-${p.patient_id}`)) {
      return false;
    }

    const isTargetGuest = checkIsGuestSource(p.patient_id || p.requested_by_id, p.requested_by_name) || (p as any).is_guest === true;
    if (isGuestUser !== isTargetGuest) return false;

    return true;
  });

  const notifiedSosIdsRef = useRef<Set<string>>(new Set());

  // 🔔 2. 新規SOS検知時のネイティブ通知（OS / ブラウザ Notification API）発火
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const currentActiveKeys = new Set<string>();

    // ① 看護師SOSのネイティブ通知
    activeSosNurses.forEach((nurse) => {
      const key = `nurse-${nurse.nurse_id}`;
      currentActiveKeys.add(key);
      if (!notifiedSosIdsRef.current.has(key)) {
        notifiedSosIdsRef.current.add(key);
        try {
          const notification = new Notification('🚨 緊急SOS要請', {
            body: `${nurse.name} さんが緊急アシストを要請しています！${nurse.sos_reason ? `\n理由: ${nurse.sos_reason}` : ''}`,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.error('ネイティブ通知発火エラー (看護師SOS):', err);
        }
      }
    });

    // ② タスクSOSのネイティブ通知
    activeSosTasks.forEach((task) => {
      const key = `task-${task.task_id}`;
      currentActiveKeys.add(key);
      if (!notifiedSosIdsRef.current.has(key)) {
        notifiedSosIdsRef.current.add(key);
        try {
          const notification = new Notification('🚨 タスクSOS要請', {
            body: `${task.patient_name || '患者'}様 (${task.room_id || ''}号室) の「${task.title}」でタスク応援要請が届きました！${task.sos_reason ? `\n理由: ${task.sos_reason}` : ''}`,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.error('ネイティブ通知発火エラー (タスクSOS):', err);
        }
      }
    });

    // ③ 患者SOSのネイティブ通知
    activeSosPatients.forEach((p) => {
      const key = `patient-${p.patient_id}`;
      currentActiveKeys.add(key);
      if (!notifiedSosIdsRef.current.has(key)) {
        notifiedSosIdsRef.current.add(key);
        try {
          const notification = new Notification('🚨 患者緊急応援要請', {
            body: `${p.patient_name} 様 ${p.room_id ? `(${p.room_id}号室)` : ''} から緊急応援要請が届きました！${p.reason ? `\n理由: ${p.reason}` : ''}`,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.error('ネイティブ通知発火エラー (患者SOS):', err);
        }
      }
    });

    // 解消・応答済みのSOSキーを記録用Setから削除
    notifiedSosIdsRef.current.forEach((id) => {
      if (!currentActiveKeys.has(id)) {
        notifiedSosIdsRef.current.delete(id);
      }
    });
  }, [activeSosNurses, activeSosTasks, activeSosPatients]);

  if (activeSosNurses.length === 0 && activeSosTasks.length === 0 && activeSosPatients.length === 0 && !conflictNotice) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-3 max-w-sm w-full pointer-events-auto select-none">
      {/* 重複検知通知トースト */}
      {conflictNotice && (
        <div className="bg-amber-500 border-2 border-amber-700 text-amber-950 font-extrabold rounded-xl p-3.5 shadow-2xl flex items-center justify-between animate-fade-in text-xs">
          <span>{conflictNotice}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setConflictNotice(null);
            }}
            className="text-amber-950 hover:bg-amber-600/30 w-5 h-5 rounded-full flex items-center justify-center font-black ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 📝 未完了メモ緊急風トースト一覧 */}
      {activeMemoToasts.map((memo) => (
        <div
          key={`toast-memo-${memo.id}`}
          className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 shadow-2xl ring-4 ring-amber-100 flex flex-col gap-2 transition-all duration-300 relative animate-fade-in pointer-events-auto"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDismissedIds((prev) => [...prev, `memo-${memo.id}`]);
            }}
            className="absolute top-2 right-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-amber-200 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-black text-amber-800 text-sm">
              <span className="animate-bounce text-base">📌</span>
              <span>伝言メモ通知 ({memo.target_room_id ? `${memo.target_room_id}号室/エリア` : '全体'})</span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full">
              未完了
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <div className="mt-1 text-xs font-bold text-amber-950 bg-white p-2.5 rounded-lg border border-amber-300 shadow-inner leading-normal">
              💬 「 {memo.text} 」
            </div>
            <div className="mt-1.5 text-[10px] text-amber-700 font-semibold flex items-center justify-between">
              <span>🕒 投稿日時: {memo.time || '最近'}</span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSaveMemo({ ...memo, is_completed: true });
                setDismissedIds((prev) => [...prev, `memo-${memo.id}`]);
              }}
              className="!bg-amber-600 hover:!bg-amber-700 !text-white !font-bold !text-xs !px-3.5 !py-1.5 !rounded-lg !shadow hover:!shadow-md !transition-all !flex !items-center !gap-1 !cursor-pointer"
            >
              <span>✓ メモを完了する</span>
            </button>
          </div>
        </div>
      ))}

      {/* 患者SOS要請トースト一覧 */}
      {activeSosPatients.map((p) => (
        <div
          key={`toast-patient-${p.patient_id}`}
          className="bg-white border-2 border-red-600 rounded-xl p-4 shadow-2xl ring-4 ring-red-100 flex flex-col gap-2 transition-all duration-300 relative pointer-events-auto"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDismissedIds((prev) => [...prev, `patient-${p.patient_id}`]);
            }}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-red-100 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-600" />
              <span>🚨 緊急応援要請 (患者SOS)</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              要対応
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <span className="font-bold text-gray-900 text-sm">{p.patient_name} 様 ({p.room_id ? `${p.room_id}号室` : ''})</span>
            {p.reason && (
              <div className="mt-1 text-[11px] text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                💬 {p.reason}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRespondPatient(p.patient_id, p.patient_name, p.room_id, p.reason);
              }}
              className="!bg-red-600 hover:!bg-red-700 !text-white !font-bold !text-xs !px-4 !py-2 !rounded-lg !shadow-md hover:!shadow-lg !transition-all !transform active:!scale-95 !flex !items-center !gap-1.5 !cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}

      {/* 看護師SOS要請トースト一覧 */}
      {activeSosNurses.map((nurse) => (
        <div
          key={`toast-nurse-${nurse.nurse_id}`}
          className="bg-white border-2 border-red-600 rounded-xl p-4 shadow-2xl ring-4 ring-red-100 flex flex-col gap-2 transition-all duration-300 relative pointer-events-auto"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDismissedIds((prev) => [...prev, `nurse-${nurse.nurse_id}`]);
            }}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-red-100 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-600" />
              <span>🚨 緊急応援要請 (看護師SOS)</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              要対応
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <span className="font-bold text-gray-900 text-sm">{nurse.name}</span> さんが緊急アシストを要請しています。
            {nurse.sos_reason && (
              <div className="mt-1 text-[11px] text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                💬 {nurse.sos_reason}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRespondNurse(nurse.nurse_id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}

      {/* タスクSOS要請トースト一覧 */}
      {activeSosTasks.map((task) => (
        <div
          key={`toast-task-${task.task_id}`}
          className="bg-white border-2 border-red-500 rounded-xl p-4 shadow-2xl ring-4 ring-red-100 flex flex-col gap-2 transition-all duration-300 relative pointer-events-auto"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDismissedIds((prev) => [...prev, `task-${task.task_id}`]);
            }}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="通知を閉じる"
          >
            ✕
          </button>

          <div className="flex items-center justify-between border-b border-red-100 pb-2 pr-6">
            <div className="flex items-center gap-1.5 font-bold text-red-600 text-sm">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500" />
              <span>🚨 タスク応援要請 ({task.room_id}号室)</span>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full">
              タスクSOS
            </span>
          </div>

          <div className="text-xs text-gray-800 font-medium leading-relaxed">
            <div className="font-bold text-gray-900 text-sm">
              {task.patient_name} 様 ({task.room_id}号室)
            </div>
            <div className="text-red-700 font-semibold text-xs mt-0.5">
              📌 {task.title}
            </div>
            {task.sos_reason && (
              <div className="mt-1 text-[11px] text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                💬 {task.sos_reason}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRespondTask(task.task_id);
              }}
              className="!bg-red-600 hover:!bg-red-700 !text-white !font-bold !text-xs !px-4 !py-2 !rounded-lg !shadow-md hover:!shadow-lg !transition-all !transform active:!scale-95 !flex !items-center !gap-1.5 !cursor-pointer"
            >
              <span>🤝 要請に応じる</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};