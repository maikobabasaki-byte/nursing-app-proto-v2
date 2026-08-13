import { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      // 💡 チェックボックス選択状態に応じて、セッション保持期間を切り替え
      // チェックあり（個人のスマホ・タブレット等）: browserLocalPersistence (明示的ログアウトまで保持)
      // チェックなし（ステーションの共有PC等）: browserSessionPersistence (タブ・ブラウザを閉じたら即座に自動ログアウト)
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

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

        <div className="mb-4 relative">
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

        {/* 🔒 共有PCログアウト忘れ防止 ＆ スマホ保持切り替えチェックボックス */}
        <div className="mb-5 flex items-start gap-2 select-none cursor-pointer">
          <input
            id="remember_me_checkbox"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer shrink-0"
          />
          <label htmlFor="remember_me_checkbox" className="text-xs font-bold text-gray-700 cursor-pointer leading-tight">
            この端末にログイン状態を保持する
            <span className="block text-[10px] text-gray-400 font-normal mt-0.5">（※ナースステーション共有PCではチェックを外してください）</span>
          </label>
        </div>

        <p id="error_message" style={{ color: 'red' }} className="text-sm mb-4"></p>
        
        <button 
          className="w-1/2 !block !mx-auto !bg-[#1A365D] !text-white !font-bold !p-2 !rounded !text-center cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={handleLogin} 
          type="button"
        >
          ログイン
        </button>
      </div>
    </>
  );
}