import { useState } from 'react';
import Header from '../components/Header'; 
import Footer from '../components/Footer';
import Login from './Login';
import PatientSelect from "./PatientSelect.tsx"; 
import Timeline from "./Timeline.tsx";
import PatientMasterPage from "./PatientMaster.tsx";
import MainLayout from "../components/MainLayout.tsx"; 

export default function App() {
  /**
 * 現在アプリに表示している画面の識別子
 * - `login`: 初期画面。認証を行う
 * - `patientSelect`: 担当患者の選択画面
 * - `timeline`: タイムライン（タスクを時間ごとに表示する画面）
 * - `patientMaster`: 患者情報の登録・編集（タスクを患者ごとに管理）
 * - `map`: 看護師の動線や位置情報を可視化するマップ画面
 * useState<...>（ジェネリクス）useState に対して、「今回はこの型専用のStateとして使いますよ」と型を外から注入してあげる仕組み
 * 「文字列（string）」ではなく、「この特定の文字列そのもの」を型として扱っている（リテラル型）
 * |（または）で繋ぐことで、「この5つの文字列のどれか」という限定された型（ユニオン型）を作っている
 */
  const [currentScreen, setCurrentScreen] = useState<'login' | 'patientSelect' | 'timeline'| 'patientMaster' | 'map'>('login');

  /**
 * 現在ログイン中の看護師が「本日担当する」として選択した患者のIDリスト
 * * @example `['patient_001', 'patient_002']`
 * @description タイムライン画面や動線マップ画面で、表示対象を絞り込むために使用
 * <string[]> （型の指定）このStateの中に「何を入れるか」を指定。string ＝ 文字列（患者IDや名前など）[] ＝ 配列（データのリスト）合わせて string[] で「文字列が複数入る配列」という意味
 */
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* ─── 【A：ログイン前の世界】 ─── */}
        {/**
      * 【条件付きレンダリング（画面切り替えの制御）】
      * * 1. `currentScreen === 'login'` (条件チェック)
      * 現在の画面ステートが 'login' の場合のみ評価を次に進めます。
      * * 2. `&&` (レンダリングスイッチ)
      * 左側の条件が true のとき「だけ」、右側の JSX (画面部品) をブラウザに描画します。
      * 別の画面に切り替わると条件が false になり、このログイン画面一式は自動で消去されます。
      * * 3. `<>` ... `</>` (React Fragment)
      * Reactの「複数のタグを1つの親要素で包まなければならない」というルールを満たすための透明な袋です。
      * 無駄な <div></div> タグを増やしてCSSやレイアウトが崩れるのを防ぎます。
      * * 4. `onLoginSuccess` (画面遷移のトリガー)
      * ログインコンポーネント内での認証成功を検知し、ステートを 'patientSelect' (患者選択画面) へ更新します。
      */}
      {currentScreen === 'login' && (
        <>
          <Header currentPage="login" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50">
            <Login onLoginSuccess={() => setCurrentScreen('patientSelect')} />
          </main>
          <Footer />
        </>
      )}

      {currentScreen === 'patientSelect' && (
        <>
          <Header currentPage="patientSelect" />
          <main className="flex-1 !flex items-center justify-center bg-gray-50">
            {/**
           * 【担当患者の選択完了イベント】
           * * 1. `onSelectComplete={(list) => ...}`
           * 患者選択画面(子)でユーザーが選択を完了した際に、選択された患者IDのリスト(`list`)を受け取ります。子で定義している `onSelectComplete` イベントを親で受け取り、次の処理に繋げます。
           * * 2. `setSelectedPatients(list)`
           * 受け取ったリストを親のStateに保存し、アプリ全体(タイムラインやマップ)で共有できるようにします。
           * * 3. `setCurrentScreen('timeline')`
           * データの保存と同時に、画面をメイン機能である「タイムライン画面」へと遷移させます。
           */}
            <PatientSelect onSelectComplete={(list) => {
              setSelectedPatients(list);
              setCurrentScreen('patientMaster'); 
            }} />
          </main>
          <Footer />
        </>
      )}

      {/* ─── 【B：ログイン後の世界（GlobalHeaderを使うグループ）】 ─── */}
      {(currentScreen === 'patientMaster' || currentScreen === 'timeline' || currentScreen === 'map') && (
        <MainLayout currentScreen={currentScreen} onNavigate={(screen) => setCurrentScreen(screen)}>
          
          {/* この中身が、MainLayout の {children} の部分にスポッと収まります */}
          {/* 💡 患者マスター画面（ダッシュボード） */}
          {currentScreen === 'patientMaster' && (
            <PatientMasterPage selectedIds={selectedPatients} />
          )}

          {/* 💡 タイムライン画面 */}
          {currentScreen === 'timeline' && (
            <Timeline selectedPatients={selectedPatients} />
          )}

          {/* {currentScreen === 'map' && (
            <WardMap onRoomChange={(roomId) => console.log(roomId)} />
          )} */}
          
        </MainLayout>
      )}

    </div>
  ); 
}