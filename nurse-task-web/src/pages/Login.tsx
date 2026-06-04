import Header from '../components/Header'; 
import Footer from '../components/Footer';

export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  
  const handleLogin = () => {
    // 💡 職場のPCでバックエンド(PHP)が未起動でもエラーを出さず、
    // ボタンを押したら即座に患者選択画面へ移動するようにします。
    onLoginSuccess();

    /* ーーー バックエンド連携時の通信処理（一時保存） ーーー
    const idElement = document.getElementsByName('user_id')[0] as HTMLInputElement;
    const pwElement = document.getElementById('password_input') as HTMLInputElement;

    const userIdValue = idElement.value;
    const passwordValue = pwElement.value;

    try {
      const response = await fetch('http://localhost/nursing-task-app-v2-api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          login_id: userIdValue,
          password: passwordValue
        }),
      });

      const text = await response.text();
      const result = JSON.parse(text);

      if (result.success) {
        onLoginSuccess();
      } else {
        alert(result.message || 'IDまたはパスワードが違います');
      }
    } catch (error) {
      console.error('通信エラー:', error);
    }
    ーーー ここまで ーーー */
  };

  return (
    // 💡 外枠を min-h-screen flex flex-col にすることで、画面全体の高さを確保し、縦並びにします
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* 💡 flex-grow で残りの高さをすべて使い、flex items-center justify-center でログインフォームを画面の「真ん中」に配置します */}
      <main className="flex-grow !flex items-center justify-center p-4">
        
        {/* ログインフォームの見た目（白背景・シャドウ・角丸など）をTailwindで整える例 */}
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm border border-gray-200">
          
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 mb-1">
              ログインID
            </label>
            <input 
              type="text" 
              name="user_id" 
              required 
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
              className="w-full !border !border-gray-300 !p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {/* 目のアイコン（位置を調整） */}
            <img
              src="/icon_b/visibility_off_24dp_1A365D_FILL0_wght400_GRAD0_opsz24.png"
              id="toggle_icon"
              alt="表示切り替え"
              className="absolute !right-3 !top-1/2 w-5 h-5 cursor-pointer opacity-70"
            />
          </div>

          <p id="error_message" style={{ color: 'red' }} className="text-sm mb-4"></p>
          
          <button 
            className="w-1/2 !block !mx-auto !bg-sky-400 !text-white !font-bold !p-2 !rounded !text-center"
            onClick={handleLogin} 
            type="button"
          >
            ログイン
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}