import { useState } from 'react';
import { signInWithEmailAndPassword, signInAnonymously, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);

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

  const handleGuestLogin = async (role: 'leader' | 'member') => {
    console.log(`🚀 [GuestLogin] ゲストログイン (${role}) がクリックされました`);
    setIsLoadingGuest(true);
    const errorEl = document.getElementById('error_message');
    if (errorEl) errorEl.innerText = '';

    try {
      // 💡 選択された役割および初期表示画面をセッションストレージに記録
      sessionStorage.setItem('nurseflow_guest_role', role);
      sessionStorage.setItem('currentScreen', 'patientMaster');
      // 💡 新規体験のためチュートリアル完了フラグをクリア
      localStorage.removeItem('nurseflow_tutorial_completed');

      console.log("🔑 [GuestLogin] ログインセッションをローカル保持 (browserLocalPersistence) に設定中...");
      await setPersistence(auth, browserLocalPersistence);
      let userCredential;
      
      try {
        console.log("🔑 [GuestLogin] Firebase signInAnonymously (匿名認証) を呼び出します...");
        userCredential = await signInAnonymously(auth);
        console.log(`✅ [GuestLogin] signInAnonymously (${role}) 成功! UID:`, userCredential.user?.uid);
      } catch (anonErr: any) {
        console.warn("⚠️ [GuestLogin] 匿名認証でエラーが発生しました:", anonErr);
        try {
          const fallbackEmail = role === 'leader' ? 'nurse01@nurseflow.local' : 'nurse02@nurseflow.local';
          userCredential = await signInWithEmailAndPassword(auth, fallbackEmail, 'guest1234');
        } catch (emailErr: any) {
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          const fallbackEmail = role === 'leader' ? 'nurse01@nurseflow.local' : 'nurse02@nurseflow.local';
          userCredential = await createUserWithEmailAndPassword(auth, fallbackEmail, 'guest1234');
        }
      }
      
      if (userCredential && userCredential.user) {
        console.log(`🎉 [GuestLogin] ゲスト(${role})認証成功! (UID:`, userCredential.user.uid, ")");
      }
    } catch (error: any) {
      if (errorEl) {
        errorEl.innerText = `ゲストログインエラー: ${error?.message || 'Firebase設定をご確認ください'}`;
      }
      console.error('❌ [GuestLogin] 最終エラー:', error);
    } finally {
      setIsLoadingGuest(false);
    }
  };

  return (
    <>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
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
            className="w-full !border !border-gray-300 !p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
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
              className="w-full !border !border-gray-300 !p-2 !pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg"
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
        <div className="mb-5 flex items-center gap-2.5 select-none cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-slate-100/80 transition-colors">
          <input
            id="remember_me_checkbox"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-5 h-5 accent-[#1A365D] !appearance-auto cursor-pointer shrink-0"
          />
          <label htmlFor="remember_me_checkbox" className="text-xs font-bold text-gray-800 cursor-pointer leading-tight flex-1">
            この端末にログイン状態を保持する
            <span className="block text-[10px] text-gray-500 font-normal mt-0.5">（※ナースステーション共有PCではチェックを外してください）</span>
          </label>
        </div>

        <p id="error_message" style={{ color: 'red' }} className="text-sm mb-4"></p>
        
        <button 
          className="w-full !bg-[#1A365D] !text-white !font-bold !p-2.5 !rounded-xl !text-center cursor-pointer hover:bg-slate-800 transition-colors shadow-sm"
          onClick={handleLogin} 
          type="button"
        >
          ログイン
        </button>

        {/* 🚀 ポートフォリオ用：ゲスト体験ボタン区切り */}
        <div className="!relative !my-5 !flex !items-center !justify-center">
          <div className="!border-t !border-gray-200 !w-full"></div>
          <span className="!bg-white !px-3 !text-xs !text-gray-400 !font-bold !shrink-0">または（ゲスト体験モード）</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleGuestLogin('member')}
            disabled={isLoadingGuest}
            className="!w-full !bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 !text-white !font-extrabold !p-3 !rounded-xl !shadow-md !text-xs !flex !items-center !justify-center !gap-2 !cursor-pointer !transition-all !active:!scale-95 disabled:!opacity-50 border-none"
          >
            <span className="text-base">🩺</span>
            <span>{isLoadingGuest ? 'ゲスト環境を準備中...' : 'ゲストログイン（メンバーとして体験）'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleGuestLogin('leader')}
            disabled={isLoadingGuest}
            className="!w-full !bg-gradient-to-r !from-indigo-600 !to-blue-600 hover:!from-indigo-700 hover:!to-blue-700 !text-white !font-extrabold !p-3 !rounded-xl !shadow-md !text-xs !flex !items-center !justify-center !gap-2 !cursor-pointer !transition-all !active:!scale-95 disabled:!opacity-50 border-none"
          >
            <span className="text-base">👑</span>
            <span>{isLoadingGuest ? 'ゲスト環境を準備中...' : 'ゲストログイン（Aチームリーダーとして体験）'}</span>
          </button>
        </div>
      </div>
    </>
  );
}