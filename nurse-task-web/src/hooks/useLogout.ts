import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTimelineStore } from '../stores/useTimelineStore';

export const useLogout = () => {
  const logout = async () => {
    try {
      await signOut(auth);
      // 🔒 ログアウト時にメモリ上の全個人情報・タスク・メモキャッシュを完全リセット
      useTimelineStore.getState().resetStoreData();
      sessionStorage.clear();
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return logout;
};