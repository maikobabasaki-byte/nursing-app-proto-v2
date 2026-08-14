import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTimelineStore } from '../stores/useTimelineStore';

export const useUserName = () => {
  const currentUser = useTimelineStore((state) => state.currentUser);
  const setCurrentUser = useTimelineStore((state) => state.setCurrentUser);
  const [userName, setUserName] = useState(currentUser?.name || '');

  const guestRole = sessionStorage.getItem('nurseflow_guest_role');
  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true
  );

  useEffect(() => {
    // 💡 ゲストユーザーの場合は Firestore 検索を行わず即時リターン（Missing or insufficient permissions を防止）
    if (isGuestUser) {
      const isLeader = currentUser ? currentUser.is_leader === true : guestRole === 'leader';
      setUserName(isLeader ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）');
      return;
    }

    if (currentUser?.name) {
      setUserName(currentUser.name);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const isGuestSession = sessionStorage.getItem('is_guest_session') === 'true' || user.isAnonymous;
        if (isGuestSession) {
          const role = sessionStorage.getItem('nurseflow_guest_role');
          const isLeader = role === 'leader';
          setUserName(isLeader ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）');
          return;
        }

        try {
          // 💡 nurse_master コレクションに対して where("email", "==", user.email) クエリ検索
          const q = query(collection(db, 'nurse_master'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const matchedDoc = querySnapshot.docs[0];
            const data = matchedDoc.data();
            const nurseProfile = {
              nurse_id: matchedDoc.id,
              name: data.name || user.email.split('@')[0],
              email: user.email,
              team: data.team || '',
              is_leader: Boolean(data.is_leader),
            };

            // 💡 Zustandストアに正本マスタープロファイルをグローバル保存
            setCurrentUser(nurseProfile);
            setUserName(nurseProfile.name);
          } else {
            // フォールバック: IDプレフィックス
            const fallbackId = user.email.split('@')[0];
            const fallbackProfile = {
              nurse_id: fallbackId,
              name: fallbackId,
              email: user.email,
            };
            setCurrentUser(fallbackProfile);
            setUserName(fallbackId);
          }
        } catch (e: any) {
          if (e?.code !== 'permission-denied') {
            console.warn("nurse_master 取得警告:", e);
          }
          const fallbackId = user.email ? user.email.split('@')[0] : 'ユーザー';
          setUserName(fallbackId);
        }
      } else {
        setUserName('');
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [currentUser, setCurrentUser, isGuestUser, guestRole]);

  if (isGuestUser) {
    const isLeader = currentUser ? currentUser.is_leader === true : guestRole === 'leader';
    return isLeader ? 'ゲスト（リーダー）' : 'ゲスト（メンバー）';
  }

  return currentUser?.name || userName;
};