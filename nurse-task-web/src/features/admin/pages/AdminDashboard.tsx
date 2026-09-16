import { useState, useEffect } from 'react';
import type { Hint, ShiftInfo } from '../types/dashboard';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

// Zustandストアと日付ユーティリティのインポート
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { getJSTDateString } from '../../../utils/dateUtils';

// コンポーネント本体のインポート
import TrendLineChart from '../components/TrendLineChart';
import BlockerPieChart from '../components/BlockerPieChart';
import OvercrowdedHeatmap from '../components/OvercrowdedHeatmap';

// 型定義のインポート
import type { TrendData } from '../components/TrendLineChart';
import type { BlockerData } from '../components/BlockerPieChart';
import type { HeatmapDay, SelectedSlot } from '../components/OvercrowdedHeatmap';

// モックデータのJSONファイルインポート
import adminDashboardMock from '../data/adminDashboardMock.json';

interface ExtendedTrendData extends TrendData {
  time: number;
}

/**
 * 過去3ヶ月（12週分）の動的トレンドデータを自動生成するヘルパー関数
 */
const generateWeeklyTrendData = (baseDateStr: string): ExtendedTrendData[] => {
  const parts = baseDateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  let day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
    day = now.getDate();
  }

  const baseDate = new Date(year, month, day);

  // 12週分のダミー gapIndex (負荷指標: 40〜90の範囲)
  const dummyGapIndices = [45, 58, 78, 52, 64, 85, 61, 49, 80, 44, 39, 72];
  const generated: ExtendedTrendData[] = [];

  // 古い日付が最初 (i = 11: 11週間前)、最新日が最後 (i = 0: 当日)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - i * 7);

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formattedDate = `${mm}/${dd}`;

    generated.push({
      date: formattedDate,
      time: d.getTime(),
      gapIndex: dummyGapIndices[(11 - i) % dummyGapIndices.length],
      hasIntervention: false,
    });
  }

  return generated;
};

/**
 * モックの固定サンプル介入リスト
 */
const INITIAL_MOCK_INTERVENTIONS = [
  { dateStr: '06/16', note: '夜勤フリーナース1名緊急補テン' },
  { dateStr: '07/07', note: '203室全介助タスクを14時台へ時間分散' },
  { dateStr: '07/28', note: 'リーダー業務集約＆病棟クラーク連携強化' },
  { dateStr: '08/18', note: '配膳・搬送サポート助手を2名常駐化' },
];

/**
 * 介入日付（"YYYY-MM-DD" や "MM/DD"）から最寄りのトレンドデータインデックスを特定する関数
 */
const findClosestIndex = (
  chartItems: ExtendedTrendData[],
  targetDateStr: string
): number => {
  if (!targetDateStr) return -1;

  // 1. 文字列の完全一致チェック
  const exact = chartItems.findIndex((item) => item.date === targetDateStr);
  if (exact !== -1) return exact;

  // 2. タイムスタンプでの最寄り検索
  const parts = targetDateStr.split(/[-/]/);
  let targetTime: number | null = null;
  const currentYear = new Date().getFullYear();

  if (parts.length === 3) {
    // YYYY-MM-DD
    targetTime = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    ).getTime();
  } else if (parts.length === 2) {
    // MM/DD
    targetTime = new Date(
      currentYear,
      parseInt(parts[0], 10) - 1,
      parseInt(parts[1], 10)
    ).getTime();
  }

  if (!targetTime) return -1;

  let minDiff = Infinity;
  let closestIndex = -1;

  chartItems.forEach((item, idx) => {
    const diff = Math.abs(item.time - targetTime!);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = idx;
    }
  });

  // 14日以内の最寄りデータポイントに合体
  if (minDiff <= 14 * 24 * 60 * 60 * 1000) {
    return closestIndex;
  }

  return -1;
};

/**
 * 看護管理者向け 業務改善・配置最適化ダッシュボード
 */
export default function AdminDashboard() {
  // 1. 要件: Zustand ストアから選択中の日付を取得
  const selectedDate = useTimelineStore((state) => state.selectedDate);
  // 2. 要件: 表示・保存用日付の確定 (ストア値がない場合は現在JST日付)
  const displayDate = selectedDate || getJSTDateString();

  // 選択された時間帯スロットの状態 { day: "月", hour: "10時" } | null
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  // 選択されたAIアクション提案（ヒント）の状態
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);
  // 画面・文字の表示拡大スケール (1: 標準, 1.15: 大, 1.3: 特大)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  // 特定セクションの全画面拡大状態 ('trend' | 'heatmap' | 'blocker' | 'hints' | null)
  const [expandedSection, setExpandedSection] = useState<
    'trend' | 'heatmap' | 'blocker' | 'hints' | null
  >(null);
  // 師長の対応メモ・実行記録テキストの状態
  const [actionMemo, setActionMemo] = useState<string>('');
  // 保存中のローディング状態
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // トレンドデータ取得中のローディング状態
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  // トレンドグラフデータ（TrendData[]）の State 管理
  const [chartData, setChartData] = useState<TrendData[]>([]);

  const shiftInfo: ShiftInfo = adminDashboardMock.shiftInfo;
  const heatmapData: HeatmapDay[] = adminDashboardMock.heatmapData;

  /**
   * 2. 要件: Firestore からのデータ読み込みと 12週分トレンドデータの結合 (useEffect)
   */
  useEffect(() => {
    let isMounted = true;
    const fetchInterventionsAndBuildChart = async () => {
      setIsLoadingData(true);
      try {
        // ① 12週分の動的トレンドデータを自動生成
        const generatedData = generateWeeklyTrendData(displayDate);

        // 介入ノートを集約するマップ (index -> string)
        const notesMap: Record<number, string> = {};

        // ② モック初期のサンプルピンを最寄りの週データにマージ
        INITIAL_MOCK_INTERVENTIONS.forEach((mockItem) => {
          const idx = findClosestIndex(generatedData, mockItem.dateStr);
          if (idx !== -1) {
            notesMap[idx] = mockItem.note;
          }
        });

        // ③ Firestore の admin_interventions コレクションから介入記録を取得
        const querySnapshot = await getDocs(collection(db, 'admin_interventions'));

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.target_date) {
            const noteText =
              data.memo && data.memo.trim()
                ? data.memo.trim()
                : data.action_title || '介入適用';

            const idx = findClosestIndex(generatedData, data.target_date);
            if (idx !== -1) {
              if (notesMap[idx]) {
                if (!notesMap[idx].includes(noteText)) {
                  notesMap[idx] += ` / ${noteText}`;
                }
              } else {
                notesMap[idx] = noteText;
              }
            }
          }
        });

        // ④ 合体データを生成して state にセット
        const mergedData = generatedData.map((item, idx) => {
          if (notesMap[idx]) {
            return {
              ...item,
              hasIntervention: true,
              interventionNote: notesMap[idx],
            };
          }
          return item;
        });

        if (isMounted) {
          setChartData(mergedData);
        }
      } catch (error) {
        console.error('Firestore 介入記録の取得エラー:', error);
        if (isMounted) {
          setChartData(generateWeeklyTrendData(displayDate));
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchInterventionsAndBuildChart();

    return () => {
      isMounted = false;
    };
  }, [displayDate]);

  /**
   * モーダルクローズ＆入力値リセット用ハンドラー
   */
  const handleCloseModal = () => {
    if (isSubmitting) return; // 送信中は閉じない
    setSelectedHint(null);
    setActionMemo('');
  };

  /**
   * ヒントカード選択用ハンドラー
   */
  const handleSelectHint = (hint: Hint) => {
    setSelectedHint(hint);
    setActionMemo('');
  };

  /**
   * 保存ロジック (handleApplyAction)
   * target_date に displayDate をセットして Firestore (admin_interventions) に保存
   */
  const handleApplyAction = async () => {
    if (!selectedHint || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'admin_interventions'), {
        action_title: selectedHint.title,
        memo: actionMemo,
        target_date: displayDate, // 動的日付 data
        ward_id: shiftInfo.wardId,
        created_at: serverTimestamp(),
      });

      // 日付フォーマット変換 (YYYY-MM-DD -> MM/DD)
      const dateParts = displayDate.split('-');
      const formattedDate =
        dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : displayDate;
      const noteText = actionMemo.trim() ? actionMemo.trim() : selectedHint.title;

      setChartData((prevData) => {
        if (!prevData) return prevData;
        const newChartData = [...prevData];
        const targetIndex = findClosestIndex(
          newChartData as ExtendedTrendData[],
          displayDate
        );

        if (targetIndex !== -1) {
          const existingNote = newChartData[targetIndex].interventionNote;
          newChartData[targetIndex] = {
            ...newChartData[targetIndex],
            hasIntervention: true,
            interventionNote: existingNote
              ? `${existingNote} / ${noteText}`
              : noteText,
          };
        } else {
          newChartData.push({
            date: formattedDate,
            gapIndex: 70,
            hasIntervention: true,
            interventionNote: noteText,
          });
        }
        return newChartData;
      });

      alert('介入記録をデータベースに保存しました。');
      handleCloseModal();
    } catch (error) {
      console.error('Firestore介入記録の保存エラー:', error);
      alert('データベースへの保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * セルクリック時の切り替えハンドラー（トグル対応）
   */
  const handleCellClick = (day: string, hour: string) => {
    if (selectedSlot?.day === day && selectedSlot?.hour === hour) {
      setSelectedSlot(null); // 既に選択中のセルをクリックした場合は解除
    } else {
      setSelectedSlot({ day, hour });
    }
  };

  /**
   * 選択解除（クリア）ハンドラー
   */
  const handleClearSelection = () => {
    setSelectedSlot(null);
  };

  /**
   * 選択状態に応じた右側「遅延要因 (Blocker)」データの動的切り替え
   */
  const activeBlockerData: BlockerData[] = selectedSlot
    ? [
        { name: '構造的競合', value: 75, color: '#EF4444' }, // 選択枠では競合率が上昇
        { name: '他律的要因', value: 15, color: '#F59E0B' },
        { name: '自律的要因', value: 10, color: '#3B82F6' },
      ]
    : adminDashboardMock.blockerData;

  /**
   * 選択状態に応じた右側「AIアクション提案 (hints)」データの動的切り替え
   */
  const activeHints: Hint[] = selectedSlot
    ? [
        {
          optionId: 'SLOT_OPTION_A',
          title: `⚡️ 【${selectedSlot.day}曜 ${selectedSlot.hour}限定】フリー担当の局所補テン`,
          description: `${selectedSlot.day}曜日 ${selectedSlot.hour}の時間帯にフリーナース1名を局所投入し、全介助・検体採取の重複をピンポイント解消します。`,
          expectedImpact: `${selectedSlot.day}曜 ${selectedSlot.hour}枠の遅延リスク 85%削減`,
          riskFactor: '他エリアでの急変時サポート中断リスク',
          estimatedCost: '＋1.2万円（時間外・応援手当換算、月間予算枠内）',
          staffBurden: 'フリー枠ナースの局所集中（他ナースの残業負荷 40%軽減）',
        },
        {
          optionId: 'SLOT_OPTION_B',
          title: `🔄 【${selectedSlot.day}曜 ${selectedSlot.hour}限定】タスクの前後分散シフト`,
          description: `時間指定のゆるいケア（清拭・処置準備）を14時台または前後の枠へシフトし、${selectedSlot.hour}台のピークを平準化します。`,
          expectedImpact: `${selectedSlot.hour}台の業務密度を平準化`,
          riskFactor: '他時間帯の巡視・定期与薬との競合調整が必要',
          estimatedCost: '￥0（追加コストなし・既存シフト内で完結）',
          staffBurden: '14時台の巡視担当者との事前ミーティング調整負荷',
        },
      ]
    : (adminDashboardMock.hints as Hint[]).map((hint, idx) => ({
        ...hint,
        estimatedCost:
          idx === 0 ? '￥0（既存チーム配置の再最適化）' : '＋0.8万円（応援手当算出）',
        staffBurden:
          idx === 0
            ? 'チーム全体の予定外残業を約1.5時間削減'
            : '日勤リーダーによる指示・巡回調整負荷がやや増加',
      }));

  return (
    <div
      className="!h-screen !w-screen !overflow-hidden !bg-slate-100 !font-sans !p-4 lg:!p-6 !flex !flex-col !relative !transition-all !duration-300"
      style={{ zoom: zoomScale }}
    >
      {/* 1. ダッシュボードヘッダー */}
      <header className="shrink-0 mb-3 flex justify-between items-center border-b-2 border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            業務改善・配置最適化ダッシュボード
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Nurse Optimizer 拡張版 - 終わらない課題への適応支援
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 【ズームコントロール】 */}
          <div className="!flex !items-center !gap-1 !bg-slate-200/80 !p-1.5 !rounded-xl !border !border-slate-300">
            <span className="!text-xs !font-extrabold !text-slate-700 !px-2 !flex !items-center !gap-1 !select-none">
              🔍 表示サイズ:
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.0
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              標準
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.15)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.15
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              大 (+15%)
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.3)}
              className={`!px-3 !py-1 !rounded-lg !text-xs !font-extrabold !transition-all !border ${
                zoomScale === 1.3
                  ? '!bg-blue-700 !text-white !border-blue-800 !shadow-sm'
                  : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
              }`}
            >
              特大 (+30%)
            </button>
          </div>

          {/* 右上ヘッダー表示 */}
          <div className="text-sm font-bold text-slate-800 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-300">
            📅 {displayDate} ({shiftInfo.shiftType}) | 🏥 {shiftInfo.wardId}
          </div>
        </div>
      </header>

      {/* 2. メイングリッドレイアウト */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ================= 左側エリア (箱A + 箱B) ================= */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 h-full">
          
          {/* 箱A: トレンドグラフ */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2 text-xl">📈</span> 病棟全体の負荷トレンドと介入の軌跡 (Past 3 Months)
                {isLoadingData && (
                  <span className="ml-2 text-xs text-blue-600 font-semibold animate-pulse">
                    (データ同期中...)
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedSection('trend')}
                className="text-xs font-extrabold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
                title="トレンドグラフを全画面拡大表示"
              >
                ⛶ 全画面拡大
              </button>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <TrendLineChart data={chartData} />
            </div>
          </section>

          {/* 箱B: ヒートマップ（クリックインタラクション対応） */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2 text-xl">🟥</span> 慢性過密ヒートマップ (曜日×時間帯)
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  💡 セルをクリックしてピンポイント分析
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedSection('heatmap')}
                  className="text-xs font-extrabold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
                  title="ヒートマップを全画面拡大表示"
                >
                  ⛶ 全画面拡大
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <OvercrowdedHeatmap
                data={heatmapData}
                selectedSlot={selectedSlot}
                onCellClick={handleCellClick}
              />
            </div>
          </section>

        </div>

        {/* ================= 右側エリア (箱C + 箱D) ================= */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0 h-full">
          
          {/* 箱C: 要因分析 */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col relative">
            <div className="flex justify-between items-center mb-1 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                遅延要因 (Blocker)
              </h2>

              <div className="flex items-center gap-2">
                {selectedSlot ? (
                  <div className="flex items-center gap-1.5 bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg text-xs animate-fade-in">
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1">
                      <span className="text-sm">📍</span> {selectedSlot.day}曜 {selectedSlot.hour}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="ml-1 text-blue-700 hover:text-blue-950 hover:bg-blue-200 px-2 py-0.5 rounded text-xs font-bold transition-colors border border-blue-300"
                      title="選択を解除して全期間表示に戻す"
                    >
                      解除 ✕
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500">直近1週間平均</span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedSection('blocker')}
                  className="text-xs font-extrabold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
                  title="遅延要因グラフを全画面拡大表示"
                >
                  ⛶ 拡大
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
              <BlockerPieChart data={activeBlockerData} />
            </div>

            <p className="text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-lg text-center shrink-0 mt-1 border border-red-200">
              {selectedSlot
                ? `💡 ${selectedSlot.day}曜 ${selectedSlot.hour}は構造的競合が75%に急増しています。`
                : '💡 構造的競合が過半数 (60%) を占めています。'}
            </p>
          </section>

          {/* 箱D: AIインサイト（アクション検討提案） */}
          <section
            className="p-4 lg:p-5 rounded-2xl shadow-sm border-2 flex-1 min-h-0 flex flex-col"
            style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd' }}
          >
            <div className="flex justify-between items-center mb-2.5 shrink-0">
              <h2 className="text-lg font-extrabold text-blue-950 flex items-center">
                <span className="mr-2 text-xl">🤖</span> アクション検討提案
              </h2>
              <div className="flex items-center gap-2">
                {selectedSlot && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs text-blue-800 hover:text-blue-950 font-bold bg-white px-2.5 py-1 rounded-lg shadow-sm border border-blue-300 transition-colors"
                  >
                    全体表示に戻す ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedSection('hints')}
                  className="text-xs font-extrabold text-blue-800 hover:text-blue-950 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg shadow-sm border border-blue-300 transition-colors shrink-0"
                  title="提案一覧を拡大表示"
                >
                  ⛶ 拡大
                </button>
              </div>
            </div>

            <div className="!flex-1 !min-h-0 !overflow-y-auto !space-y-3 !pr-1">
              {activeHints.map((hint) => (
                <button
                  key={hint.optionId}
                  type="button"
                  onClick={() => handleSelectHint(hint)}
                  style={{ backgroundColor: '#ffffff', borderColor: '#bfdbfe' }}
                  className="!w-full !text-left !p-4 !rounded-xl !shadow-sm !border-2 !transition-all !duration-200 hover:!shadow-md hover:!border-blue-400 hover:!bg-blue-50/60 !cursor-pointer !group"
                >
                  <div className="font-bold text-blue-950 text-sm mb-1.5 group-hover:text-blue-800 flex items-center justify-between">
                    <span>{hint.title}</span>
                    <span className="text-xs text-blue-700 font-bold group-hover:underline shrink-0 ml-2">
                      詳細を確認 ➔
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    {hint.description}
                  </div>
                  {hint.expectedImpact && (
                    <div className="mt-2.5 pt-2 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-xs text-emerald-900 font-extrabold bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                        ✨ 期待効果: {hint.expectedImpact}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* 3. AIアクション詳細モーダル */}
      {selectedHint && (
        <div
          className="!fixed !inset-0 !bg-black/50 !backdrop-blur-md !flex !items-center !justify-center !p-3 lg:!p-4 !z-50 animate-fade-in !overflow-hidden"
          onClick={handleCloseModal}
        >
          <div
            className="!max-w-lg !w-full !max-h-[85vh] !bg-white !rounded-2xl !shadow-2xl !overflow-hidden !flex !flex-col !border-2 !border-slate-300 !relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="!bg-slate-100 !border-b !border-slate-300 !p-4 lg:!p-5 !flex !items-start !justify-between !shrink-0">
              <div className="!flex !items-center !gap-3 !pr-2">
                <span className="!text-2xl lg:!text-3xl !shrink-0">🤖</span>
                <h3 className="!font-extrabold !text-slate-900 !text-base lg:!text-lg !leading-snug">
                  {selectedHint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="!text-slate-500 hover:!text-slate-800 hover:!bg-slate-200 !p-1.5 !rounded-xl !transition-colors !shrink-0 !text-base !font-extrabold disabled:!opacity-50"
                title="閉じる"
              >
                ✕
              </button>
            </div>

            {/* モーダル本文エリア */}
            <div className="!p-4 lg:!p-5 !space-y-4 !text-sm lg:!text-base !overflow-y-auto !flex-1 !min-h-0">
              {/* 概要・説明 */}
              <div>
                <h4 className="!text-xs !font-extrabold !text-slate-500 !uppercase !tracking-wider !mb-1">
                  📋 提案の概要・説明
                </h4>
                <p className="!text-slate-800 !leading-relaxed !font-medium !bg-slate-50 !p-3.5 !rounded-xl !border !border-slate-200 !text-xs lg:!text-sm">
                  {selectedHint.description}
                </p>
              </div>

              {/* 4つの評価視点（効果・リスク・コスト・現場負担） */}
              <div className="!space-y-2.5">
                <h4 className="!text-xs !font-extrabold !text-slate-500 !uppercase !tracking-wider !mb-1">
                  ⚖️ アクション総合評価（4視点分析）
                </h4>

                {/* 1. 効果エリア */}
                {selectedHint.expectedImpact && (
                  <div className="!bg-green-50 !border-2 !border-green-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">✨</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-green-900 !uppercase !tracking-wider">
                          期待される効果
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-green-950 !leading-relaxed">
                          {selectedHint.expectedImpact}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. リスクエリア */}
                {selectedHint.riskFactor && (
                  <div className="!bg-amber-50 !border-2 !border-amber-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">⚠️</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-amber-900 !uppercase !tracking-wider">
                          考慮すべきリスク・調整事項
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-amber-950 !leading-relaxed">
                          {selectedHint.riskFactor}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 経営・コスト視点 */}
                {selectedHint.estimatedCost && (
                  <div className="!bg-purple-50 !border-2 !border-purple-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">💰</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-purple-900 !uppercase !tracking-wider">
                          経営・コスト視点
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-purple-950 !leading-relaxed">
                          {selectedHint.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 現場の負担視点 */}
                {selectedHint.staffBurden && (
                  <div className="!bg-orange-50 !border-2 !border-orange-300 !rounded-xl !p-3 lg:!p-3.5 !shadow-sm">
                    <div className="!flex !items-start !gap-2.5">
                      <span className="!text-xl !shrink-0">🔋</span>
                      <div>
                        <span className="!block !text-[11px] !font-extrabold !text-orange-900 !uppercase !tracking-wider">
                          現場の負担・疲労度視点
                        </span>
                        <p className="!text-xs lg:!text-sm !font-bold !text-orange-950 !leading-relaxed">
                          {selectedHint.staffBurden}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 師長の対応メモ・実行記録フォームエリア */}
              <div className="!space-y-1.5 !pt-2">
                <label
                  htmlFor="action-memo-textarea"
                  className="!block !text-xs !font-extrabold !text-slate-700 !uppercase !tracking-wider"
                >
                  📝 師長の対応メモ・実行記録
                </label>
                <textarea
                  id="action-memo-textarea"
                  rows={3}
                  value={actionMemo}
                  disabled={isSubmitting}
                  onChange={(e) => setActionMemo(e.target.value)}
                  placeholder="例: 提案通りフリー担当の〇〇さんを配置。ただし10:30に一度状況報告を受ける。"
                  className="!w-full !p-3 !text-xs lg:!text-sm !font-medium !text-slate-800 !bg-gray-50 !border-2 !border-slate-300 !rounded-xl !focus:outline-none !focus:ring-2 !focus:ring-blue-500 !focus:border-blue-500 !transition-all !resize-none disabled:!opacity-50"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="!bg-slate-100 !border-t !border-slate-300 !p-3.5 lg:!p-4 !flex !justify-end !items-center !gap-3 !shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="!px-4 !py-2 !text-xs lg:!text-sm !font-bold !text-slate-700 hover:!text-slate-900 hover:!bg-slate-200 !rounded-xl !transition-colors !border-2 !border-slate-300 !bg-white !shadow-sm disabled:!opacity-50"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleApplyAction}
                disabled={isSubmitting}
                className={`!px-5 !py-2 !text-xs lg:!text-sm !font-extrabold !text-white !rounded-xl !transition-colors !shadow-md !border !border-blue-900 ${
                  isSubmitting
                    ? '!bg-blue-400 !cursor-not-allowed !opacity-70'
                    : '!bg-blue-700 hover:!bg-blue-800 !cursor-pointer'
                }`}
              >
                {isSubmitting ? '保存中...' : 'このアクションを適用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. セクション全画面拡大表示モーダル */}
      {expandedSection && (
        <div
          className="!fixed !inset-0 !bg-black/60 !backdrop-blur-md !z-50 !p-4 lg:!p-8 !flex !flex-col animate-fade-in !overflow-hidden"
          onClick={() => setExpandedSection(null)}
        >
          <div
            className="!w-full !h-full !bg-white !rounded-3xl !shadow-2xl !p-6 lg:!p-8 !flex !flex-col !relative !overflow-hidden !border-2 !border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="!flex !justify-between !items-center !pb-4 !mb-4 !border-b !border-slate-200 !shrink-0">
              <h2 className="!text-xl lg:!text-2xl !font-extrabold !text-slate-900 !flex !items-center !gap-2">
                {expandedSection === 'trend' &&
                  '📈 病棟全体の負荷トレンドと介入の軌跡 (全画面表示)'}
                {expandedSection === 'heatmap' &&
                  '🟥 慢性過密ヒートマップ (全画面表示)'}
                {expandedSection === 'blocker' &&
                  '📊 遅延要因 (Blocker) 分析 (全画面表示)'}
                {expandedSection === 'hints' && '🤖 AI アクション検討提案 (全画面表示)'}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedSection(null)}
                className="!px-4 !py-2 !bg-slate-800 hover:!bg-slate-950 !text-white !font-extrabold !text-xs lg:!text-sm !rounded-xl !transition-all !shadow-md !flex !items-center !gap-1.5"
              >
                ✕ 元に戻す（全画面解除）
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="!flex-1 !min-h-0 !w-full !overflow-y-auto">
              {expandedSection === 'trend' && (
                <div className="!w-full !h-full !min-h-[500px]">
                  <TrendLineChart data={chartData} />
                </div>
              )}
              {expandedSection === 'heatmap' && (
                <div className="!w-full !h-full !min-h-[450px] !relative !overflow-visible">
                  <OvercrowdedHeatmap
                    data={heatmapData}
                    selectedSlot={selectedSlot}
                    onCellClick={handleCellClick}
                  />
                </div>
              )}
              {expandedSection === 'blocker' && (
                <div className="!w-full !h-full !flex !flex-col !justify-center !items-center !min-h-[400px]">
                  <div className="!w-full !h-[450px]">
                    <BlockerPieChart data={activeBlockerData} />
                  </div>
                  <p className="!text-sm !font-bold !text-red-700 !bg-red-50 !p-3.5 !rounded-xl !border !border-red-200 !mt-4 !text-center !w-full !max-w-lg">
                    {selectedSlot
                      ? `💡 ${selectedSlot.day}曜 ${selectedSlot.hour}は構造的競合が75%に急増しています。`
                      : '💡 構造的競合が過半数 (60%) を占めています。'}
                  </p>
                </div>
              )}
              {expandedSection === 'hints' && (
                <div className="!grid !grid-cols-1 md:!grid-cols-2 !gap-4 !p-2">
                  {activeHints.map((hint) => (
                    <button
                      key={hint.optionId}
                      type="button"
                      onClick={() => {
                        setExpandedSection(null);
                        handleSelectHint(hint);
                      }}
                      className="!w-full !text-left !p-5 !rounded-2xl !shadow-sm !border-2 !border-blue-200 !bg-white !transition-all !duration-200 hover:!shadow-md hover:!border-blue-400 hover:!bg-blue-50/60 !cursor-pointer"
                    >
                      <div className="!font-extrabold !text-blue-950 !text-base !mb-2 !flex !items-center !justify-between">
                        <span>{hint.title}</span>
                        <span className="!text-xs !text-blue-700 !font-bold !underline">
                          詳細を確認 ➔
                        </span>
                      </div>
                      <p className="!text-sm !text-slate-700 !leading-relaxed !font-medium !mb-3">
                        {hint.description}
                      </p>
                      {hint.expectedImpact && (
                        <div className="!pt-2 !border-t !border-blue-100">
                          <span className="!text-xs !text-emerald-900 !font-extrabold !bg-emerald-100 !px-3 !py-1.5 !rounded-lg !border !border-emerald-300">
                            ✨ 期待効果: {hint.expectedImpact}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}