import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// パス・画面IDごとのチュートリアルステップ定義マッピング
export const tutorialStepsByPath: Record<string, DriveStep[]> = {
  // 1. 患者選択画面
  '/patient-select': [
    {
      popover: {
        title: '🏥 患者選択へようこそ！',
        description: '本日の受持ち患者またはチームを選択する画面です。',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-patient-role',
      popover: {
        title: '👥 メンバー / リーダー切替',
        description: '個人で受持ち患者を選ぶか、リーダーとしてチーム全体を選ぶかを切り替えます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#patient-list-container',
      popover: {
        title: '📋 患者選択リスト',
        description: '部屋ごと、または個人ごとにチェックを入れて本日受持つ患者さんを選択します。',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#get-task-btn',
      popover: {
        title: '🚀 タスク取得・業務開始',
        description: '選択完了後、このボタンを押すと本日の電子カルテ指示タスクが自動取得され、業務を開始します。',
        side: 'top',
        align: 'center',
      },
    },
  ],

  // 2. タイムライン画面（ダッシュボード）
  '/timeline': [
    {
      popover: {
        title: '🗓️ タイムライン画面へようこそ！',
        description: '本日の看護業務スケジュールを一目で俯瞰・管理できる画面です。',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-timeline',
      popover: {
        title: '⏰ 時刻別タイムライン',
        description: '時間ごとのスケジュールが並びます。タスクカードをドラッグして完了・時間移動を行えます。',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-pool',
      popover: {
        title: '📥 タスクプール（随時タスク）',
        description: '時間が決まっていない「随時」や「未割り当て」のタスクが置かれます。ドラッグしてタイムラインに移動できます。',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-add-task',
      popover: {
        title: '➕ 臨時タスク追加',
        description: '急な状態変化や口頭指示で発生した臨時タスクをここから即座に追加できます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-settings',
      popover: {
        title: '⚙️ システム設定',
        description: '夜勤モード切替やタイムライン表示間隔（15分/30分/1時間）をここから変更できます。',
        side: 'top',
        align: 'start',
      },
    },
  ],

  // 3. マップ画面
  '/map': [
    {
      popover: {
        title: '📍 病棟マップ画面',
        description: 'リアルタイムの病室・患者位置と看護師ピンの現在地が可視化される病棟マップです。',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-map-canvas',
      popover: {
        title: '🗺️ 病室＆看護師ピンマップ',
        description: '自分の看護師ピンをドラッグして自由に動かせます。特定の部屋に近づくとメモ通知（例: 手袋補充など）が届きます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-sos-panel',
      popover: {
        title: '🚨 緊急アラート（SOS）パネル',
        description: '患者の急変や看護師からの緊急応援要請（SOS）が発生すると、ここにリアルタイム表示されます。（自分のピン右クリックでSOS発信）',
        side: 'right',
        align: 'start',
      },
    },
  ],

  // 4. 患者マスター画面
  '/patient-master': [
    {
      popover: {
        title: '👥 患者マスター画面',
        description: '病棟全患者の基本情報、ADL、転倒リスクレベル、アレルギー情報を一元管理・編集できます。',
        side: 'top',
        align: 'center',
      },
    },
  ],

  // 5. リーダーTODO画面
  '/leader-todo': [
    {
      popover: {
        title: '📋 リーダーTODO画面',
        description: 'リーダー看護師がチーム全体の患者対応、医師連絡、検査処置の進行状況を監督・管理できます。',
        side: 'top',
        align: 'center',
      },
    },
  ],

  // 6. 設定画面
  '/settings': [
    {
      popover: {
        title: '⚙️ システム設定画面',
        description: '夜勤モードや集中モード、表示テーマカラーをここから切り替えられます。',
        side: 'top',
        align: 'center',
      },
    },
  ],
};

/**
 * URLパスまたは画面識別子を統一キー（/path）に正規化するヘルパー関数
 */
export function normalizeTutorialPath(pathOrScreen?: string): string {
  if (!pathOrScreen) {
    if (typeof window !== 'undefined') {
      pathOrScreen = window.location.pathname;
    } else {
      return '/timeline';
    }
  }

  const clean = pathOrScreen.toLowerCase().trim();
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * 現在のパスに応じたチュートリアルを動的に開始するメイン関数
 */
export function startTutorialByPath(pathOrScreen?: string, isManual: boolean = true) {
  const normalizedPath = normalizeTutorialPath(pathOrScreen);
  const storageKey = `has_seen_tutorial_${normalizedPath.replace('/', '')}`;

  // 自動実行時の初回閲覧チェック
  if (!isManual) {
    const hasSeen = localStorage.getItem(storageKey);
    if (hasSeen === 'true') return;
  }

  const steps = tutorialStepsByPath[normalizedPath];

  // ガイドが未定義のパスの場合のメッセージ制御
  if (!steps || steps.length === 0) {
    if (isManual) {
      alert("⚠️ このページの使い方ガイドは現在準備中です");
    }
    return;
  }

  const driverObj = driver({
    showProgress: true,
    animate: true,
    nextBtnText: '次へ ›',
    prevBtnText: '‹ 前へ',
    doneBtnText: '完了',
    onDestroyStarted: () => {
      localStorage.setItem(storageKey, 'true');
      driverObj.destroy();
    },
    steps: steps,
  });

  driverObj.drive();
}

let activeHandsOnDriverInstance: ReturnType<typeof driver> | null = null;

/**
 * ハンズオン（体験型）チュートリアルを開始する関数（全16ステップ実務完全再現）
 */
export function startHandsOnTutorial(
  addDemoTask: () => void,
  removeDemoTask: () => void
) {
  // デモ用タスク（09:00 【練習用】術前絶飲食確認（中島 伊織））を自動追加
  addDemoTask();

  const handsOnSteps: DriveStep[] = [
    // Index 0: ウェルカム画面
    {
      popover: {
        title: '🖐️ 実務完全再現ハンズオンガイドへようこそ！',
        description: '「タスク選択」➔「モーダル説明」➔「ボタン操作」という看護現場の完全フローを体験しましょう。「次へ」を押して開始します。',
        side: 'over',
        align: 'center',
        showButtons: ['next', 'close'],
      },
    },
    // Index 1: 未着手カード選択
    {
      element: '#dummy-task-step1-untouched',
      popover: {
        title: 'Step 1: 未着手タスクを選択',
        description: 'タイムライン09:00の「【練習用】術前絶飲食確認」タスクをタップしてください。',
        side: 'bottom',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 2: モーダル全体説明（※ユーザーが「次へ」を押せるように next ボタンを表示！）
    {
      element: '#tour-status-modal',
      popover: {
        title: 'Step 2: 状態変更モーダル',
        description: 'これがタスクの状態変更画面です。ここでケアの進捗を変更します。確認したら「次へ」をタップしてください。',
        side: 'left',
        align: 'center',
        showButtons: ['next', 'close'],
      },
    },
    // Index 3: 「実施を開始」ボタン選択
    {
      element: '#tour-modal-start-btn',
      popover: {
        title: 'Step 3: 実施を開始',
        description: 'ハイライトされた『実施を開始』ボタンをタップしてケアを開始しましょう。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 4: 実施中カード選択 (サイドバー)
    {
      element: '#dummy-task-progressing',
      popover: {
        title: 'Step 4: 実施中タスクを選択',
        description: '実施中になると左サイドバーへ移動します。タップしてポップアップを開きましょう。',
        side: 'right',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 5: 「中断・保留」ボタン選択
    {
      element: '#tour-modal-pending-btn',
      popover: {
        title: 'Step 5: 実施の中断・保留',
        description: 'ナースコール等の割り込み対応時、『中断・保留』をタップします。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 6: 実施中断中カード選択 (サイドバー保留エリア)
    {
      element: '#dummy-task-pending',
      popover: {
        title: 'Step 6: 保留タスクを選択',
        description: '保留中のタスクはここに入ります。タップして再開の準備をします。',
        side: 'right',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 7: 「再開」ボタン選択
    {
      element: '#tour-modal-start-btn',
      popover: {
        title: 'Step 7: 実施の再開',
        description: '『再開』ボタンをタップして実施を再開します。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 8: 実施中カード選択 (サイドバー・完了前)
    {
      element: '#dummy-task-progressing',
      popover: {
        title: 'Step 8: 実施中タスクを選択',
        description: 'ケアが終わったら、再度タスクをタップしてポップアップを開きましょう。',
        side: 'right',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 9: 「実施完了」ボタン選択
    {
      element: '#tour-modal-complete-btn',
      popover: {
        title: 'Step 9: 実施完了',
        description: '『実施完了』ボタンをタップしてケアを完了にします。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 10: 実施完了/記録待ちカード選択 (タイムライン)
    {
      element: '#dummy-task-step5-completed-timeline',
      popover: {
        title: 'Step 10: 記録待ちタスクを選択',
        description: 'タイムラインに戻った完了タスクをタップしましょう。',
        side: 'bottom',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 11: 「記録開始」ボタン選択
    {
      element: '#tour-modal-record-start-btn',
      popover: {
        title: 'Step 11: 記録開始',
        description: '『記録開始』ボタンをタップして看護記録を入力開始します。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 12: 記録中カード選択 (サイドバー)
    {
      element: '#dummy-task-recording',
      popover: {
        title: 'Step 12: 記録中タスクを選択',
        description: '記録中になると左サイドバーへ入ります。タップしてください。',
        side: 'right',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 13: 「記録の一時中断」ボタン選択
    {
      element: '#tour-modal-record-pending-btn',
      popover: {
        title: 'Step 13: 記録の一時中断',
        description: '記録を中断する場合は『記録を一時中断』をタップします。',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 14: 記録中断中カード選択 (サイドバー)
    {
      element: '#dummy-task-record-pending',
      popover: {
        title: 'Step 14: 記録中断中タスクを選択',
        description: '記録中断エリアのタスクをタップして再開します。',
        side: 'right',
        align: 'center',
        showButtons: ['close'],
      },
    },
    // Index 15: 「記録完了」ボタン選択
    {
      element: '#tour-modal-record-complete-btn',
      popover: {
        title: 'Step 15: 記録完了',
        description: '最後に『記録を完了しました』をタップしましょう！',
        side: 'left',
        align: 'center',
        showButtons: ['close'],
      },
    },

    // Index 16: 完了称賛
    {
      popover: {
        title: '🎉 全マスターおめでとうございます！',
        description: '素晴らしいです！タスク選択からモーダル操作に至る全ステータスフローを完璧に習得しました！',
        side: 'over',
        align: 'center',
      },
    },
  ];

  const driverObj = driver({
    allowClose: false,
    showProgress: true,
    animate: true,
    nextBtnText: '次へ ›',
    prevBtnText: '‹ 前へ',
    doneBtnText: 'チュートリアル完了',
    onDestroyStarted: () => {
      // スキップ・完了時に自動クリーンアップ
      removeDemoTask();
      activeHandsOnDriverInstance = null;
      driverObj.destroy();
    },
    steps: handsOnSteps,
  });

  activeHandsOnDriverInstance = driverObj;
  driverObj.drive();
}

/**
 * 遅延制御付きで次のハンズオンステップへ自動進める関数
 */
export function advanceHandsOnTutorialStep() {
  if (activeHandsOnDriverInstance) {
    activeHandsOnDriverInstance.moveNext();
  }
}

/**
 * 現在のハンズオンチュートリアルのステップインデックスを取得する関数
 */
export function getHandsOnActiveIndex(): number {
  if (activeHandsOnDriverInstance) {
    return activeHandsOnDriverInstance.getActiveIndex() ?? -1;
  }
  return -1;
}

// 後方互換性のための既存エイリアス
export function startTutorial(currentPage: string = 'timeline', isManual: boolean = true) {
  startTutorialByPath(currentPage, isManual);
}
