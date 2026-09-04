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

export const AiPredictionAlertCard: React.FC = () => {
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
    }, 2500);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 font-sans select-none">
      {/* 🤖 AI予測アラートカード容器（背景: purple-50, 枠線: purple-300, 紫グローシャドウ） */}
      <div className="relative bg-purple-50 border-2 border-purple-300 rounded-xl p-4 shadow-xl shadow-purple-200/70 transition-all hover:border-purple-400">
        
        {/* ① ヘッダー表示エリア */}
        <div className="flex items-center justify-between gap-2 border-b border-purple-200/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <span className="text-[11px] font-black text-purple-700 bg-purple-200/80 px-2 py-0.5 rounded-full inline-block border border-purple-300">
                AI予測：先回りアラート
              </span>
              <h3 className="text-sm font-black text-purple-950 mt-0.5 tracking-tight">
                不穏行動予測・介入提案
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-purple-700 bg-white px-2 py-1 rounded-lg border border-purple-200 shadow-xs">
            信頼度 92%
          </span>
        </div>

        {/* ② 予測内容 ＆ 根拠・ヒント */}
        <div className="mb-4 space-y-2">
          {/* 予測内容 */}
          <div className="bg-white p-3 rounded-lg border border-purple-200/90 shadow-xs">
            <div className="flex items-start gap-2">
              <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded shrink-0 border border-rose-300">
                🚨 16:00頃
              </span>
              <p className="text-sm font-black text-slate-900 leading-snug">
                橋本 瑞希様 不穏リスク高（夕暮れ）
              </p>
            </div>
          </div>

          {/* 根拠とヒント */}
          <div className="text-xs text-purple-900 bg-purple-100/80 p-2.5 rounded-lg border border-purple-200 leading-relaxed">
            <span className="font-bold text-purple-950 block mb-0.5">📌 根拠とヒント:</span>
            過去3日間のデータに基づく予測。早めの訪室、照明点灯、声かけが有効です。
          </div>
        </div>

        {/* ③ 動線最適化提案エリア（白背景で視覚的に区切り） */}
        <div className="bg-white rounded-xl p-3.5 border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-purple-950 flex items-center gap-1">
              <span>💡</span>
              <span>動線最適化提案</span>
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
              {checkedIds.length}件選択
            </span>
          </div>

          {/* サジェスト項目（チェックボックス付きリスト） */}
          <div className="space-y-2 mb-3">
            {SUGGESTIONS.map((item) => {
              const isChecked = checkedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
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

          {/* ルート再構成アクションボタン */}
          <button
            type="button"
            onClick={handleApplyRoute}
            disabled={checkedIds.length === 0}
            className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer ${
              isApplied
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : checkedIds.length > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-300'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isApplied ? (
              <>
                <span>✓</span>
                <span>このルートで再構成しました</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>このルートで再構成</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiPredictionAlertCard;
