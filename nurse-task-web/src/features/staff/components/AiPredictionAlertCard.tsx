import React, { useState } from 'react';

interface SuggestionOption {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

const SUGGESTIONS: SuggestionOption[] = [
  {
    id: 'sug-1',
    label: '15:45 巡回時に声かけを追加',
    defaultChecked: true,
  },
  {
    id: 'sug-2',
    label: '15:50 隣室(202)の物品補充も済ませる',
    defaultChecked: false,
  },
];

interface AiPredictionAlertCardProps {
  time?: string; // 例: "16:00"
}

export const AiPredictionAlertCard: React.FC<AiPredictionAlertCardProps> = ({ time: _time = '16:00' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>(() =>
    SUGGESTIONS.filter((s) => s.defaultChecked).map((s) => s.id)
  );
  const [isApplied, setIsApplied] = useState(false);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleApplyRoute = () => {
    setIsApplied(true);
    setTimeout(() => {
      setIsApplied(false);
      setIsOpen(false);
    }, 1800);
  };

  return (
    <>
      {/* 📱 タイムライン行内(16:00)に収まるタスクカードサイズの小型UI */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="w-full text-xs p-2 rounded-xl border-2 border-purple-400 !bg-purple-100/90 text-purple-950 shadow-sm hover:shadow-md hover:!bg-purple-200/90 cursor-pointer flex flex-col justify-between select-none transition-all ring-2 ring-purple-300/60 min-h-[64px] relative"
      >
        <div className="flex items-center justify-between gap-1 w-full border-b border-purple-300/60 pb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs">🤖</span>
            <span className="text-[10px] font-black !bg-purple-600 !text-white px-1.5 py-0.2 rounded-full shrink-0">
              AI先回り予測
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-purple-800 bg-white/90 border border-purple-300 px-1 py-0.2 rounded shrink-0">
            16:00想定
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-1">
          <div className="truncate font-black text-xs text-purple-950">
            鈴木様 不穏注意 (夕暮れ)
          </div>
          <span className="text-[10px] font-extrabold text-purple-700 bg-white border border-purple-300 px-1.5 py-0.5 rounded shadow-2xs shrink-0">
            詳細 💡
          </span>
        </div>
      </div>

      {/* 🔍 クリック時に表示される詳細モーダルポップアップ */}
      {isOpen && (
        <div 
          className="fixed inset-0 !bg-black/60 flex items-center justify-center z-50 p-3 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="relative bg-purple-50 border-2 border-purple-400 rounded-2xl p-4 shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-purple-200/80 hover:bg-purple-300 text-purple-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>

            {/* ① ヘッダー表示エリア */}
            <div className="flex items-center gap-2 border-b border-purple-200 pb-2.5 mb-3 pr-8">
              <span className="text-2xl">🤖</span>
              <div>
                <span className="text-[11px] font-black text-purple-700 bg-purple-200/80 px-2 py-0.5 rounded-full inline-block border border-purple-300">
                  AI先回り介入アラート
                </span>
                <h3 className="text-sm font-black text-purple-950 mt-0.5">
                  不穏行動予測・最適化提案
                </h3>
              </div>
            </div>

            {/* ② 予測内容 ＆ 根拠・ヒント */}
            <div className="mb-3 space-y-2">
              <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded shrink-0 border border-rose-300">
                    🚨 16:00頃
                  </span>
                  <p className="text-xs font-black text-slate-900">
                    鈴木様 不穏リスク高（夕暮れ）
                  </p>
                </div>
              </div>

              <div className="text-xs text-purple-900 bg-purple-100/90 p-2.5 rounded-lg border border-purple-200 leading-relaxed">
                <span className="font-bold text-purple-950 block mb-0.5">📌 根拠とヒント:</span>
                過去3日間のデータに基づく予測。早めの訪室、照明点灯、声かけが有効です。
              </div>
            </div>

            {/* ③ 動線最適化提案エリア */}
            <div className="bg-white rounded-xl p-3 border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-purple-950 flex items-center gap-1">
                  <span>💡</span>
                  <span>動線最適化提案</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                  {checkedIds.length}件選択
                </span>
              </div>

              {/* サジェスト項目（チェックボックス付きリスト） */}
              <div className="space-y-1.5 mb-3">
                {SUGGESTIONS.map((item) => {
                  const isChecked = checkedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-purple-50 border-purple-400 text-purple-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isChecked
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="truncate font-bold">{item.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/3 py-2 rounded-lg font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleApplyRoute}
                  disabled={checkedIds.length === 0}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isApplied
                      ? 'bg-emerald-600 text-white'
                      : checkedIds.length > 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isApplied ? '✓ 再構成しました' : '⚡ このルートで再構成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiPredictionAlertCard;
