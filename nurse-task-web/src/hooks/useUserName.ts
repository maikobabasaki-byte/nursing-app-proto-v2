import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTimelineStore } from '../stores/useTimelineStore';
import { resolveNurseProfile } from '../utils/userUtils';

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

    if (currentUser?.name && !currentUser.name.match(/^(nurse|leader|user)\d*$/i)) {
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
          const q = query(collection(db, 'nurse_master'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);

          let rawData: any = undefined;
          let matchedId = user.email.split('@')[0];

          if (!querySnapshot.empty) {
            const matchedDoc = querySnapshot.docs[0];
            rawData = matchedDoc.data();
            matchedId = matchedDoc.id;
          }

          // 🎯 resolveNurseProfile 共通ヘルパーにより、ユーザー名を日本語表示名に自動変換 ＆ リーダー権限を判定
          const nurseProfile = resolveNurseProfile(matchedId, user.email, rawData);
          setCurrentUser(nurseProfile);
          setUserName(nurseProfile.name);
        } catch (e: any) {
          if (e?.code !== 'permission-denied') {
            console.warn("nurse_master 取得警告:", e);
          }
          const emailPrefix = user.email.split('@')[0];
          const fallbackProfile = resolveNurseProfile(emailPrefix, user.email);
          setCurrentUser(fallbackProfile);
          setUserName(fallbackProfile.name);
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