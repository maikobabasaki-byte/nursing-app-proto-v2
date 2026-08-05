import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTimelineStore } from '../stores/useTimelineStore';

export const useUserName = () => {
  const currentUser = useTimelineStore((state) => state.currentUser);
  const setCurrentUser = useTimelineStore((state) => state.setCurrentUser);
  const [userName, setUserName] = useState(currentUser?.name || '');

  useEffect(() => {
    if (currentUser?.name) {
      setUserName(currentUser.name);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
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
        } catch (e) {
          console.error("nurse_master 取得エラー:", e);
          const fallbackId = user.email.split('@')[0];
          setUserName(fallbackId);
        }
      } else {
        setUserName('');
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [currentUser, setCurrentUser]);

  return currentUser?.name || userName;
};