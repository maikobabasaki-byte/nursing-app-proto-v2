import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTimelineStore } from '../../stores/useTimelineStore';

// パス・画面IDごとのチュートリアルステップ定義マッピング
export const tutorialStepsByPath: Record<string, DriveStep[]> = {
  // 1. 患者選択画面
  '/patient-select': [
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
      element: '#member-selection',
      popover: {
        title: '👥 メンバー / リーダー選択エリア',
        description: '個人で受持ち患者を選ぶか、チーム全体の患者を一括で選択します。',
        side: 'bottom',
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
      element: '#timeline-main-container, #tour-timeline',
      popover: {
        title: '🗓️ 時刻別タイムライン',
        description: '本日の看護業務スケジュールが時間ごとに並びます。タスクカードをタップまたはドラッグして進捗変更・時間移動を行えます。',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tutorial-task-pool, #tour-pool',
      popover: {
        title: '📥 タスクプール（随時タスク）',
        description: '時間が決まっていない「随時」や「未割り当て」のタスクが置かれます。タイムラインへ自由に移動・割り当てが可能です。',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tutorial-nurse-call, #tour-add-task',
      popover: {
        title: '📞 ナースコール・緊急割り込み対応',
        description: '急なナースコール対応や割り込み発生時、タップして現在進行中のタスクを自動中断し、即座に対応実績を作成できます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#footer-settings-btn, #bottom-nav-settings',
      popover: {
        title: '⚙️ システム設定ナビゲーション',
        description: '画面最下部（フッター）の「システム設定」ボタンから、夜勤モードやカラーテーマ設定画面へいつでもワンタップで遷移できます。',
        side: 'top',
        align: 'start',
      },
    },
  ],

  // 3. マップ画面
  '/map': [
    {
      element: '#tour-map-canvas',
      popover: {
        title: '🗺️ 病室＆看護師ピンマップ',
        description: '病棟内の患者配置と自分の看護師ピンの現在地が可視化されます。ピンをドラッグして動かしたり、部屋ごとの状況を確認できます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-sos-panel',
      popover: {
        title: '🚨 緊急アラート（SOS）パネル',
        description: '患者の急変や看護師からの緊急応援要請（SOS）が発生すると、ここにリアルタイム表示されます。',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-progress-panel',
      popover: {
        title: '📊 看護師別 計画進捗状況パネル',
        description: '選択された受け持ち患者のケア進捗率と各看護師の完了件数をリアルタイムでパーセンテージ集計表示します。',
        side: 'left',
        align: 'start',
      },
    },
  ],

  // 4. 患者マスター画面
  '/patient-master': [
    {
      element: '#patient-master-header',
      popover: {
        title: '👥 患者マスター画面',
        description: '受持ち患者の総数とリアルタイム検索バーがここに表示されます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#patient-master-search',
      popover: {
        title: '🔍 患者・タスク検索機能',
        description: '患者名やタスク名（例: 血糖・点滴など）を入力して、該当する患者・タスクを即座に絞り込めます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#patient-master-cards-container, .tutorial-patient-master',
      popover: {
        title: '📋 本日の受け持ち患者一覧',
        description: '受持ち患者のADL、転倒リスクレベル、アレルギー情報および本日の全タスクを一覧で確認・管理できます。',
        side: 'bottom',
        align: 'center',
      },
    },
  ],

  // 5. リーダーTODO画面
  '/leader-todo': [
    {
      element: '#leader-todo-header',
      popover: {
        title: '📋 リーダー用TODO ＆ 申し送り管理',
        description: 'チーム全体の看護指示、医師連絡、検査処置の進行状況を一括管理・監督する画面です。計画進捗や優先度フィルターも上部で確認できます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#leader-todo-patients-header, #leader-todo-patients',
      popover: {
        title: '🏥 1. 患者リスト（TODO作成）',
        description: '受け持ち患者さんを選択して、優先度や時間指定付きのリーダー指示TODOを即座に作成・発行できます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#leader-todo-active-header, #leader-todo-active-list',
      popover: {
        title: '⏱️ 2. 未対応・対応中TODO一覧',
        description: '発行された未対応のリーダーTODOが並びます。カードをタップすると『対応入力・結果記録』モーダルが開きます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#leader-todo-completed-header, #leader-todo-completed-list',
      popover: {
        title: '✅ 3. 本日対応済み・完了TODO＆記録履歴',
        description: '対応が完了したTODOや医師指示メモ・結果方針が保存され、本日の経過・申し送りとして参照・再編集できます。',
        side: 'bottom',
        align: 'center',
      },
    },
  ],

  // 6. 設定画面
  '/settings': [
    {
      element: '#settings-header',
      popover: {
        title: '⚙️ システム設定画面',
        description: '看護環境や勤務帯に応じた最適なシステム設定を行えます。',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#settings-theme-selector',
      popover: {
        title: '🎨 視覚心理カラーテーマ',
        description: '日勤・夜勤・集中モードなど、視覚心理に基づいた3つのカラーパレットをワンタップで切り替えられます。',
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

  let clean = pathOrScreen.toLowerCase().trim();
  if (!clean.startsWith('/')) {
    clean = `/${clean}`;
  }

  if (clean === '/patientselect' || clean === '/patient-select') return '/patient-select';
  if (clean === '/patientmaster' || clean === '/patient-master') return '/patient-master';
  if (clean === '/leadertodo' || clean === '/leader-todo') return '/leader-todo';

  return clean;
}

/**
 * Driver.js の各ステップハイライト時にターゲット要素のクリックイベントを監視し、
 * Reactの非同期レンダリング完了（300msディレイ）を待ってから moveNext() を安全に発火する共通ハンドラー
 */
function createStepHighlightHandler(getDriverInstance: () => ReturnType<typeof driver> | null) {
  return (_element: Element | undefined, step: DriveStep, opts: { index?: number }) => {
    if (!step?.element) return;
    const currentStepIndex = opts?.index;
    if (typeof currentStepIndex !== 'number') return;

    const selector = typeof step.element === 'string' ? step.element : undefined;
    if (!selector) return;

    let isTriggered = false;

    // Leader TODO モバイル表示時の自動タブ切替
    if (selector.includes('leader-todo-active')) {
      document.getElementById('tab-btn-active')?.click();
    } else if (selector.includes('leader-todo-completed')) {
      document.getElementById('tab-btn-completed')?.click();
    } else if (selector.includes('leader-todo-patients')) {
      document.getElementById('tab-btn-patients')?.click();
    }

    // 🎯 DOMレンダリングおよびレイアウト確定後（0ms, 80ms, 200ms）の3段階で Driver.js のハイライト位置を即座かつ精密に再計算
    [0, 80, 200].forEach((delay) => {
      setTimeout(() => {
        const driverInst = getDriverInstance();
        if (driverInst && driverInst.isActive()) {
          driverInst.refresh();
        }
      }, delay);
    });

    // DOM要素の取得（display:none の非表示要素をスキップし、画面上可視の要素を優先抽出）
    const findVisibleElement = (sel: string): Element | null => {
      const parts = sel.split(',').map((s) => s.trim());
      for (const p of parts) {
        const els = Array.from(document.querySelectorAll(p));
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
            return el;
          }
        }
      }
      return document.querySelector(sel);
    };

    // DOM要素の取得とクリックイベントのアタッチ（動的描画を待つためリトライ機能付き）
    const attachListener = (attempts = 0) => {
      const targetEl = findVisibleElement(selector);
      // 「実施中」タスクの場合、サイドバー（#dummy-task-progressing）とタイムライン上（#dummy-task-inprogress-timeline）の両方のクリックに対応
      const altSelector = selector.includes('dummy-task-progressing') ? '#dummy-task-inprogress-timeline' : undefined;
      const altEl = altSelector ? findVisibleElement(altSelector) : null;

      const elementsToAttach = [targetEl, altEl].filter((el): el is Element => el !== null);

      if (elementsToAttach.length > 0) {
        // 🎯 ターゲット要素を画面中央へスムーズスクロールして要素フォーカスを視覚的に強調
        try {
          elementsToAttach[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        } catch (scrollErr) {
          console.log("Scroll focus error:", scrollErr);
        }

        const handleTargetClick = (e: Event) => {
          // モーダル全体（#tour-status-modal）がターゲットの場合
          if (selector === '#tour-status-modal') {
            const clickTarget = e.target as HTMLElement;
            // モーダル内のボタン要素がクリックされたかを判定
            const isBtn = clickTarget.closest('button');
            if (!isBtn) return; // ボタン以外のクリック時はイベント消化せず維持
          }

          if (isTriggered) return;
          isTriggered = true;

          elementsToAttach.forEach((el) => el.removeEventListener('click', handleTargetClick));

          // タスクカード等のタップ時にモーダルを強制展開するべき要素
          if (selector.includes('dummy-task')) {
            useTimelineStore.getState().setActivePopupTaskId('demo-task-tutorial');
          }

          // 💡 ReactのState更新およびモーダル等のDOM描画完了を300ms確実に待機してから moveNext() で進行
          setTimeout(() => {
            const instance = getDriverInstance();
            if (instance && instance.isActive()) {
              const activeIdx = instance.getActiveIndex();
              // 🎯 アクティブなステップインデックスが発火元のステップインデックスと厳密に一致している場合のみ1回だけ moveNext() を実行（スキップ防止）
              if (activeIdx === currentStepIndex) {
                try {
                  instance.moveNext();
                } catch (err) {
                  console.log("Driver moveNext error:", err);
                }
              }
            }
          }, 300);
        };

        elementsToAttach.forEach((el) => el.addEventListener('click', handleTargetClick));
      } else if (attempts < 20) {
        setTimeout(() => attachListener(attempts + 1), 50);
      }
    };

    attachListener();
  };
}

// 🚫 チュートリアル機能の一時無効化フラグ（true に設定すると全チュートリアルが再有効化されます）
export const ENABLE_TUTORIAL = false;

/**
 * 現在のパスに応じたチュートリアルを動的に開始するメイン関数
 */
export function startTutorialByPath(pathOrScreen?: string, isManual: boolean = true) {
  // 💡 チュートリアル一時停止中：すべてのチュートリアル起動をスキップ
  if (!ENABLE_TUTORIAL) return;

  const normalizedPath = normalizeTutorialPath(pathOrScreen);
  const storageKey = `has_seen_tutorial_${normalizedPath.replace('/', '')}`;
  const isGuestSession = Boolean(
    sessionStorage.getItem('is_guest_session') === 'true' || 
    useTimelineStore.getState().currentUser?.isAnonymous === true
  );

  // 💡 ゲストセッションの場合は毎回チュートリアルを体験してもらうため初回閲覧チェックをバイパス
  if (!isManual && !isGuestSession) {
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

  let driverObjInstance: ReturnType<typeof driver> | null = null;
  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 8,
    popoverOffset: 12,
    nextBtnText: '次へ ›',
    prevBtnText: '‹ 前へ',
    doneBtnText: '完了',
    onHighlightStarted: createStepHighlightHandler(() => driverObjInstance),
    onDestroyStarted: () => {
      // 💡 正規ユーザーの場合のみ閲覧済みフラグをローカルストレージへ保存（ゲストは次回も毎回ガイドを表示）
      if (!isGuestSession) {
        localStorage.setItem(storageKey, 'true');
      }
      driverObj.destroy();
    },
    steps: steps,
  });

  driverObjInstance = driverObj;
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
  // 💡 チュートリアル一時停止中：すべてのチュートリアル起動をスキップ
  if (!ENABLE_TUTORIAL) return;

  // デモ用タスク（09:00 【練習用】術前絶飲食確認（中島 伊織））を自動追加
  addDemoTask();

  const handsOnSteps: DriveStep[] = [
    // Index 0: ウェルカム画面
    {
      popover: {
        title: '🖐️ 実務完全再現ハンズオンガイドへようこそ！',
        description: '「タスク選択」➔「モーダル説明」➔「ボタン操作」という看護現場の完全フローを体験しましょう。「次へ」を押して開始します。',
        side: 'bottom',
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

    // Index 4: 実施中カード選択 (サイドバー または タイムライン)
    {
      element: '#dummy-task-progressing, #dummy-task-inprogress-timeline',
      popover: {
        title: 'Step 4: 実施中トレイ（左サイドバー）',
        description: '「実施開始」したケアは左サイドバーの『実施中』トレイ（またはタイムライン）に移動します。タップして詳細画面を開きましょう。',
        side: 'right',
        align: 'start',
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
      element: '#dummy-task-pending, #dummy-task-inprogress-timeline',
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
      element: '#dummy-task-progressing, #dummy-task-inprogress-timeline',
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
        side: 'top',
        align: 'center',
      },
    },
  ];

  const driverObj = driver({
    allowClose: false,
    showProgress: true,
    animate: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 8,
    popoverOffset: 12,
    nextBtnText: '次へ ›',
    prevBtnText: '‹ 前へ',
    doneBtnText: 'チュートリアル完了',
    onHighlightStarted: createStepHighlightHandler(() => activeHandsOnDriverInstance),
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
export function advanceHandsOnTutorialStep(delayMs: number = 300) {
  if (activeHandsOnDriverInstance && activeHandsOnDriverInstance.isActive()) {
    const currentIndex = activeHandsOnDriverInstance.getActiveIndex();
    setTimeout(() => {
      if (activeHandsOnDriverInstance && activeHandsOnDriverInstance.isActive()) {
        if (activeHandsOnDriverInstance.getActiveIndex() === currentIndex) {
          try {
            activeHandsOnDriverInstance.moveNext();
          } catch (e) {
            console.log("Driver moveNext error:", e);
          }
        }
      }
    }, delayMs);
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
