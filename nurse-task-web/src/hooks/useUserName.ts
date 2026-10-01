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
  const isDemoPresenter = sessionStorage.getItem('is_demo_presenter_session') === 'true';
  const isGuestUser = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' ||
    currentUser?.isAnonymous === true ||
    isDemoPresenter
  );

  useEffect(() => {
    // 💡 面接デモプレゼンセッションの場合は Firestore / auth イベントでのユーザー上書きを防止
    if (isDemoPresenter) {
      if (currentUser?.name) {
        setUserName(currentUser.name);
      } else {
        setUserName(guestRole === 'admin' ? '山田 師長' : '田中 結衣 (1年目)');
      }
      return;
    }

    if (isGuestUser) {
      const isLeader = currentUser ? currentUser.is_leader === true : (guestRole === 'leader' || guestRole === 'admin');
      const name = currentUser?.name || (guestRole === 'admin' ? '山田 師長' : isLeader ? 'ゲストリーダー' : 'ゲストメンバー');
      setUserName(name);
      return;
    }

    if (currentUser?.name && !currentUser.name.match(/^(nurse|leader|user)\d*$/i)) {
      setUserName(currentUser.name);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const isDemo = sessionStorage.getItem('is_demo_presenter_session') === 'true';
      if (isDemo) return;

      if (user && user.email) {
        const isGuestSession = sessionStorage.getItem('is_guest_session') === 'true' || user.isAnonymous;
        if (isGuestSession) {
          const role = sessionStorage.getItem('nurseflow_guest_role');
          const isLeader = role === 'leader' || role === 'admin';
          setUserName(role === 'admin' ? '山田 師長' : isLeader ? 'ゲストリーダー' : 'ゲストメンバー');
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
  }, [currentUser, setCurrentUser, isGuestUser, guestRole, isDemoPresenter]);

  if (isDemoPresenter) {
    return currentUser?.name || (guestRole === 'admin' ? '山田 師長' : '田中 結衣 (1年目)');
  }

  if (currentUser?.name) {
    return currentUser.name;
  }

  if (isGuestUser) {
    const isLeader = currentUser ? currentUser.is_leader === true : (guestRole === 'leader' || guestRole === 'admin');
    return guestRole === 'admin' ? '山田 師長' : isLeader ? 'ゲストリーダー' : 'ゲストメンバー';
  }

  return userName;
};