import { useState } from 'react';
import Login from './Login';
import PatientSelect from './PatientSelect'; // 後で作るファイル

function App() {
  // 「currentPage」という名前のスイッチを作る（初期値は 'login'）
  const [currentPage, setCurrentPage] = useState('login');

  // ログイン成功時に呼ばれる関数
  const handleLoginSuccess = () => {
    setCurrentPage('select'); // スイッチを 'select' に切り替える
  };

  return (
    <div className="App">
      {/* 条件分岐：ログイン中なら選択画面、そうでなければログイン画面 */}
      {currentPage === 'login' ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <PatientSelect />
      )}
    </div>
  );
}

export default App;