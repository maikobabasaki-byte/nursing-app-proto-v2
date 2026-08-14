import { useEffect } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function TutorialOverlay() {
  useEffect(() => {
    const runTour = () => {
      const driverObj: Driver = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        nextBtnText: '次へ →',
        prevBtnText: '← 戻る',
        doneBtnText: '体験を開始する 🎉',
        progressText: 'STEP {{current}} / {{total}}',
        onDestroyed: () => {
          localStorage.setItem('nurseflow_tutorial_completed', 'true');
        },
        steps: [
          {
            element: '#header-guest-badge',
            popover: {
              title: '🚀 ゲスト体験へようこそ！',
              description: '最初は【患者マスター】画面からスタートします。選択された役割（メンバー/リーダー）の担当患者（202・203号室など）の安全なサンドボックス環境が用意されています。',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#patient-master-cards-container',
            popover: {
              title: '👥 患者マスター内容 (担当患者・ケア計画)',
              description: 'ここには担当する患者様の基本情報、ADL、アレルギー、本日予定されている看護ケアタスクが時系列一覧で表示されています。内容を確認したら、画面上部のナビゲーションを右へ進めていきましょう！',
              side: 'top',
              align: 'center',
            },
          },
          {
            element: '#nav-item-patient-master',
            popover: {
              title: '📍 1. 患者マスター (現在の画面)',
              description: 'ナビゲーションの一番左【患者マスター】です。患者情報の確認やケア計画の全体像把握に使用します。',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#nav-item-timeline',
            popover: {
              title: '👉 2. 【右へ移動】タイムライン画面',
              description: 'ナビゲーションを右へ一つ進めると【タイムライン】画面です。一日の看護ケアを時間軸で視覚的にドラッグ調整・ステータス更新・記録できます。',
              side: 'bottom',
              align: 'center',
            },
          },
          {
            element: '#nav-item-map',
            popover: {
              title: '👉 3. 【さらに右へ移動】病室マップ画面',
              description: 'さらに右へ進むと【病室マップ】画面です。各病室のSOS緊急アラートや看護師の現在地をリアルタイム表示し、チームで相互フォローが可能です。',
              side: 'bottom',
              align: 'center',
            },
          },
          {
            element: '#header-nurse-call-btn',
            popover: {
              title: '📞 ナースコール緊急割り込みボタン',
              description: '突発呼び出し時はこのボタンを押すと、実施中ケアの自動一時中断とナースコール対応実績の自動生成が行われます。各画面を右へ進めて自由にお試しください！',
              side: 'bottom',
              align: 'end',
            },
          },
        ],
      });

      driverObj.drive();
    };

    // 💡 初回ログインかつ未完了の場合のみ自動起動
    const isCompleted = localStorage.getItem('nurseflow_tutorial_completed') === 'true';
    if (!isCompleted) {
      const timer = setTimeout(() => {
        runTour();
      }, 500);
      return () => clearTimeout(timer);
    }

    // 💡 ヘッダーの「❓ 体験ガイド」ボタンからの再起動イベント
    const handleReopen = () => {
      runTour();
    };

    window.addEventListener('nurseflow_open_tutorial', handleReopen);
    return () => {
      window.removeEventListener('nurseflow_open_tutorial', handleReopen);
    };
  }, []);

  return null;
}
