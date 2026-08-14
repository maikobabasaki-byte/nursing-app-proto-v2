import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTimelineStore } from '../stores/useTimelineStore';

export const useLogout = () => {
  const logout = async () => {
    try {
      // 🔒 ログアウト時にゲストセッション情報・メモリ上の全データを完全初期化
      sessionStorage.removeItem('is_guest_session');
      sessionStorage.removeItem('nurseflow_guest_role');
      sessionStorage.clear();
      useTimelineStore.getState().resetStoreData();

      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return logout;
};