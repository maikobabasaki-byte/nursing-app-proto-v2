import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
    try {
      // 既存のID/パスワード入力をFirebase認証用に変換
      const email = `${userId}@nurseflow.local`;
      await signInWithEmailAndPassword(auth, email, password);
      // 認証成功時はApp.tsxのonAuthStateChangedが検知して画面が切り替わります
    } catch (error) {
      const errorEl = document.getElementById('error_message');
      if (errorEl) errorEl.innerText = 'IDまたはパスワードが正しくありません';
      console.error('ログインエラー:', error);
    }
  };

  return (
    <>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm border border-gray-200">
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-1">
            ログインID
          </label>
          <input 
            type="text" 
            name="user_id" 
            required 
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full !border !border-gray-300 !p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6 relative">
          <label className="block text-base font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input 
            id="password_input" 
            type="password" 
            name="user_password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full !border !border-gray-300 !p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <img
            src="/icon_b/visibility_off_24dp_1A365D_FILL0_wght400_GRAD0_opsz24.png"
            id="toggle_icon"
            alt="表示切り替え"
            className="absolute !right-3 !top-1/2 w-5 h-5 cursor-pointer opacity-70"
          />
        </div>

        <p id="error_message" style={{ color: 'red' }} className="text-sm mb-4"></p>
        
        <button 
          className="w-1/2 !block !mx-auto !bg-[#1A365D] !text-white !font-bold !p-2 !rounded !text-center"
          onClick={handleLogin} 
          type="button"
        >
          ログイン
        </button>
      </div>
    </>
  );
}