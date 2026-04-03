export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  
  const handleLogin = async () => {
    // 1. HTMLの要素から「値」を正確に取る
    // inputタグの name="user_id" から値を取得
    const idElement = document.getElementsByName('user_id')[0] as HTMLInputElement;
    const pwElement = document.getElementById('password_input') as HTMLInputElement;

    const userIdValue = idElement.value;
    const passwordValue = pwElement.value;

    try {
      const response = await fetch('http://localhost/nursing-task-app-v2-api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // これが非常に重要です
        },
        body: JSON.stringify({ 
          login_id: userIdValue, // ★PHP側が待ち構えている名前
          password: passwordValue // ★PHP側が待ち構えている名前
        }),
      });

      const text = await response.text();
      console.log("PHPからの生の返事:", text);
      const result = JSON.parse(text);

      if (result.success) {
        onLoginSuccess(); // 成功！画面が切り替わります
      } else {
        alert(result.message || 'IDまたはパスワードが違います');
      }
    } catch (error) {
      console.error('通信エラー:', error);
    }
  };

  return (
    <>
     <header>
       <h1>
         {/* <img> は最後に / を入れて閉じます */}
         <img src="/icon_b/local_hospital_48dp.png" alt="NurseFlowApp" />
         <span className="header-title-text">NurseFlowApp</span>
       </h1>
     </header>

     <main className="login_form_wrap">
        <div className="login_form">
          <div className="user_id">
            <p>
              ログインID<br />
              <input type="text" name="user_id" required />
            </p>
          </div>
          <div className="user_password">
            <p>
              パスワード<br />
              <input id="password_input" type="password" name="user_password" required />
              <img
                src="/icon_b/visibility_off_24dp_1A365D_FILL0_wght400_GRAD0_opsz24.png"
                id="toggle_icon"
                alt="表示切り替え"
              />
            </p>
          </div>
          <p id="error_message" style={{ color: 'red' }}></p>
          <button className="login_button" onClick={handleLogin} type="button">
              ログイン
          </button>
        </div>
     </main>
     <footer>
     </footer>
   </>
  );
}