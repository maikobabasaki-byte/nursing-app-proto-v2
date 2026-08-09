import { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      // 💡 Firebase Authのセッション保持範囲をタブ単位(sessionStorage)に変更し、同一ブラウザでの複数タブ同時ログインを可能にする
      await setPersistence(auth, browserSessionPersistence);

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
          <div className="relative flex items-center">
            <input 
              id="password_input" 
              type={showPassword ? 'text' : 'password'}
              name="user_password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full !border !border-gray-300 !p-2 !pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword((prev) => !prev);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer opacity-70 hover:opacity-100 focus:outline-none flex items-center justify-center"
              aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
              title={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
            >
              <img
                src={showPassword 
                  ? "/icon_b/visibility_24dp_1A365D_FILL0_wght400_GRAD0_opsz24.png" 
                  : "/icon_b/visibility_off_24dp_1A365D_FILL0_wght400_GRAD0_opsz24.png"
                }
                id="toggle_icon"
                alt={showPassword ? "非表示" : "表示"}
                className="w-5 h-5 pointer-events-none"
              />
            </button>
          </div>
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