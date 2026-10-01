import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import type { UserRoleInfo } from '../../types/personalDashboard';

export interface JNALadderCompetency {
  key: string;
  subject: string;
  score: number; // 1〜5
  rationale: string;
}

export interface ClinicalLadderData {
  currentLevel: string; // e.g. "レベルⅡ"
  targetLevel: string;  // e.g. "レベルⅢ"
  strengths: string;
  improvements: string;
  competencies: JNALadderCompetency[];
}

interface ClinicalLadderSectionProps {
  currentUser: UserRoleInfo;
  effectiveTargetId: string;
  ladderData: ClinicalLadderData;
  onUpdateCompetencyScore: (key: string, newScore: number) => void;
  onSaveFeedback: (strengths: string, improvements: string) => void;
  isViewingSelf?: boolean;
}

// 💡 レーダーチャート用カスタムツールチップ
const CustomRadarTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-1.5">
          <span className="font-extrabold text-indigo-300">🎯 {data.subject}</span>
          <span className="font-black text-indigo-400 bg-slate-800 px-2 py-0.5 rounded">
            Lv.{(data.score / 20).toFixed(0)} ({data.score}pt)
          </span>
        </div>
        <p className="text-slate-200 text-[11px] leading-relaxed font-medium">{data.rationale}</p>
      </div>
    );
  }
  return null;
};

export const ClinicalLadderSection: React.FC<ClinicalLadderSectionProps> = ({
  currentUser,
  effectiveTargetId,
  ladderData,
  onUpdateCompetencyScore,
  onSaveFeedback,
  isViewingSelf = false,
}) => {
  const [strengthsText, setStrengthsText] = useState(ladderData.strengths);
  const [improvementsText, setImprovementsText] = useState(ladderData.improvements);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const isAdmin = !isViewingSelf && currentUser.role === 'admin';

  // React to prop updates if target staff changes
  React.useEffect(() => {
    setStrengthsText(ladderData.strengths);
    setImprovementsText(ladderData.improvements);
  }, [ladderData, effectiveTargetId]);

  const handleSave = () => {
    onSaveFeedback(strengthsText, improvementsText);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // 📊 JNAコア要件のスコア(1〜5) を レーダーチャート用データ (0〜100pt) に変換
  const radarData = ladderData.competencies.map((comp) => ({
    subject: comp.subject,
    score: comp.score * 20, // 1->20, 2->40, 3->60, 4->80, 5->100
    rationale: comp.rationale || `JNAラダー評価: Lv.${comp.score} / 5`,
  }));

  return (
    <section className="bg-gradient-to-br from-indigo-900/5 via-slate-50 to-blue-900/5 p-4 lg:p-6 rounded-2xl shadow-sm border-2 border-indigo-200/80 flex flex-col gap-5">
      {/* ヘッダー & ラダーレベルバッジ表示 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
        <div>
          <h3 className="text-base lg:text-lg font-extrabold text-indigo-950 flex items-center gap-2">
            <span className="text-xl">🎖️</span> 日本看護協会 JNAクリニカルラダー評価 & 定性フィードバック
          </h3>
          <p className="text-xs text-indigo-700 font-medium mt-0.5">
            能力段階に応じた5つのコア要件評価、スキル多角チャート、指導者コメント
          </p>
        </div>

        {/* ラダー目標バッジ */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-xs border border-blue-700">
            <span className="text-xs font-bold opacity-80">現在地:</span>
            <span className="text-sm font-black tracking-wide">{ladderData.currentLevel}</span>
          </div>
          <span className="text-slate-400 font-bold">➔</span>
          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-950 px-3 py-1.5 rounded-xl border border-amber-300 font-bold shadow-xs">
            <span className="text-xs font-bold text-amber-800">次期目標:</span>
            <span className="text-sm font-black text-amber-900 tracking-wide">{ladderData.targetLevel}</span>
          </div>
        </div>
      </div>

      {/* 🎯 【2カラムレイアウト】 左: JNAコア要件個別評価スコア (1〜5) vs 右: スキル多角評価レーダーチャート */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* 左カラム: JNAコア要件 個別評価 (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
            <h4 className="text-xs lg:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>🎯</span> JNAコア要件 個別評価 (1〜5段階)
            </h4>
            {isAdmin ? (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                ✏️ スコア変更で右のチャートが即時変化します
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                ※指導者による評価スコア
              </span>
            )}
          </div>

          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {ladderData.competencies.map((comp) => (
              <div
                key={comp.key}
                className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 hover:border-indigo-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-800 truncate">
                    {comp.subject}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate" title={comp.rationale}>
                    {comp.rationale}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 w-12 text-right">
                    Lv.{comp.score} / 5
                  </span>
                  {isAdmin ? (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((scoreVal) => (
                        <button
                          key={scoreVal}
                          type="button"
                          onClick={() => onUpdateCompetencyScore(comp.key, scoreVal)}
                          className={`!w-6 !h-6 !rounded !text-xs !font-extrabold !transition-all !border !flex !items-center !justify-center ${
                            comp.score === scoreVal
                              ? '!bg-indigo-600 !text-white !border-indigo-700 !shadow-xs !scale-105'
                              : '!bg-white !text-slate-600 !border-slate-300 hover:bg-indigo-50 hover:text-indigo-700'
                          }`}
                        >
                          {scoreVal}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <span
                          key={starIdx}
                          className={`text-xs ${
                            starIdx <= comp.score ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右カラム: スキル多角評価 レーダーチャート (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs flex flex-col justify-between min-h-[280px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
            <h4 className="text-xs lg:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>📊</span> スキル多角評価 (レーダーチャート)
            </h4>
            <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              リアルタイム連動
            </span>
          </div>

          <div className="w-full h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#1e293b', fontSize: 10, fontWeight: 800 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar
                  name="JNA評価"
                  dataKey="score"
                  stroke="#4f46e5"
                  fill="#6366f1"
                  fillOpacity={0.5}
                />
                <Tooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2. 権限ベース定性評価フォーム (強み・改善課題) */}
      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs lg:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span>💬</span> 指導者からの定性フィードバック（強み・課題）
          </h4>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-1.5 rounded-xl shadow-xs border border-indigo-800 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>💾</span> フィードバック内容を保存
            </button>
          )}
        </div>

        {isSavedNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-extrabold p-2.5 rounded-xl animate-fade-in flex items-center gap-1.5">
            <span>✨</span> 定性フィードバックを保存しました。
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 強み */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col gap-2">
            <label className="text-xs font-extrabold text-emerald-900 flex items-center gap-1">
              <span>💪</span> 良いところ（強み・評価できる点）
            </label>
            {isAdmin ? (
              <textarea
                rows={3}
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
                placeholder="患者への声かけが丁寧、バイタル測定の手順が忠実で正確など"
                className="w-full p-2.5 text-xs font-medium text-slate-800 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-slate-400"
              />
            ) : (
              <div className="text-xs font-medium text-emerald-950 bg-white p-3 rounded-lg border border-emerald-200 leading-relaxed whitespace-pre-wrap min-h-[72px]">
                {strengthsText || '（指導者コメント準備中）'}
              </div>
            )}
          </div>

          {/* 課題 */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2">
            <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
              <span>⚠️</span> 改善が必要なところ（成長課題・指導事項）
            </label>
            {isAdmin ? (
              <textarea
                rows={3}
                value={improvementsText}
                onChange={(e) => setImprovementsText(e.target.value)}
                placeholder="事前準備の段取り、時間指定ケアと複数処置の組み合わせ方など"
                className="w-full p-2.5 text-xs font-medium text-slate-800 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none placeholder:text-slate-400"
              />
            ) : (
              <div className="text-xs font-medium text-amber-950 bg-white p-3 rounded-lg border border-amber-200 leading-relaxed whitespace-pre-wrap min-h-[72px]">
                {improvementsText || '（指導者コメント準備中）'}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
