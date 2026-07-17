import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const useLogout = () => {
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return logout;
};