import { useState } from 'react';
import type { Hint, ShiftInfo } from '../types/dashboard';

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

/**
 * 看護管理者向け 業務改善・配置最適化ダッシュボード
 */
export default function AdminDashboard() {
  // 選択された時間帯スロットの状態 { day: "月", hour: "10時" } | null
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  // 選択されたAIアクション提案（ヒント）の状態
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);
  // 画面・文字の表示拡大スケール (1: 標準, 1.15: 大, 1.3: 特大)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  // 1. 状態管理の追加: 師長の対応メモ・実行記録テキスト
  const [actionMemo, setActionMemo] = useState<string>('');

  const shiftInfo: ShiftInfo = adminDashboardMock.shiftInfo;
  const trendData: TrendData[] = adminDashboardMock.trendData;
  const heatmapData: HeatmapDay[] = adminDashboardMock.heatmapData;

  /**
   * モーダルクローズ＆入力値リセット用ハンドラー
   */
  const handleCloseModal = () => {
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
   * アクション適用・記録ハンドラー
   */
  const handleApplyAction = () => {
    if (!selectedHint) return;
    const logText = actionMemo.trim() ? actionMemo : '(入力メモなし)';
    console.log(`実行記録: ${logText}`);
    alert(`このアクションを適用しました。\n\n実行記録: ${logText}`);
    handleCloseModal();
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
          {/* 【ズームコントロール】ズーム関連スタイルに限定して ! を付与 */}
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

          <div className="text-sm font-bold text-slate-800 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-300">
            📅 {shiftInfo.shiftDate} ({shiftInfo.shiftType}) | 🏥 {shiftInfo.wardId}
          </div>
        </div>
      </header>

      {/* 2. メイングリッドレイアウト */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ================= 左側エリア (箱A + 箱B) ================= */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 h-full">
          
          {/* 箱A: トレンドグラフ */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center shrink-0">
              <span className="mr-2 text-xl">📈</span> 病棟全体の負荷トレンドと介入の軌跡 (Past 3 Months)
            </h2>
            <div className="flex-1 min-h-0 w-full">
              <TrendLineChart data={trendData} />
            </div>
          </section>

          {/* 箱B: ヒートマップ（クリックインタラクション対応） */}
          <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2 text-xl">🟥</span> 慢性過密ヒートマップ (曜日×時間帯)
              </h2>
              <span className="text-xs text-slate-600 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                💡 セルをクリックしてピンポイント分析
              </span>
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
              {selectedSlot && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs text-blue-800 hover:text-blue-950 font-bold bg-white px-2.5 py-1 rounded-lg shadow-sm border border-blue-300 transition-colors"
                >
                  全体表示に戻す ✕
                </button>
              )}
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

      {/* 3. AIアクション詳細モーダル（対応メモ入力フォーム付き） */}
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
                className="!text-slate-500 hover:!text-slate-800 hover:!bg-slate-200 !p-1.5 !rounded-xl !transition-colors !shrink-0 !text-base !font-extrabold"
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

              {/* 2. 師長の対応メモ・実行記録フォームエリア */}
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
                  onChange={(e) => setActionMemo(e.target.value)}
                  placeholder="例: 提案通りフリー担当の〇〇さんを配置。ただし10:30に一度状況報告を受ける。"
                  className="!w-full !p-3 !text-xs lg:!text-sm !font-medium !text-slate-800 !bg-gray-50 !border-2 !border-slate-300 !rounded-xl !focus:outline-none !focus:ring-2 !focus:ring-blue-500 !focus:border-blue-500 !transition-all !resize-none"
                />
              </div>
            </div>

            {/* 3. モーダルフッター */}
            <div className="!bg-slate-100 !border-t !border-slate-300 !p-3.5 lg:!p-4 !flex !justify-end !items-center !gap-3 !shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="!px-4 !py-2 !text-xs lg:!text-sm !font-bold !text-slate-700 hover:!text-slate-900 hover:!bg-slate-200 !rounded-xl !transition-colors !border-2 !border-slate-300 !bg-white !shadow-sm"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleApplyAction}
                className="!px-5 !py-2 !text-xs lg:!text-sm !font-extrabold !text-white !bg-blue-700 hover:!bg-blue-800 !rounded-xl !transition-colors !shadow-md !border !border-blue-900"
              >
                このアクションを適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}