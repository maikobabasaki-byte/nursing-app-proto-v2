import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { StaffProfile, SkillItem } from '../../types/personalDashboard';

// 💡 根拠付きカスタムツールチップコンポーネント
const CustomRadarTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data: SkillItem = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 max-w-xs transition-all animate-fade-in z-50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-2 mb-2">
          <span className="font-extrabold text-sm text-blue-300 flex items-center gap-1.5">
            <span>🎯</span> {data.subject}
          </span>
          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
            {data.score} 点 / 100
          </span>
        </div>
        <div className="relative bg-slate-800/90 rounded-xl p-2.5 text-xs border border-slate-700 leading-relaxed text-slate-200">
          <div className="font-extrabold text-[11px] text-amber-400 mb-1 flex items-center gap-1">
            <span>💡</span> 評価の根拠 (Rationale):
          </div>
          <p className="font-medium text-slate-100">{data.rationale}</p>
        </div>
      </div>
    );
  }
  return null;
};

interface PerformanceChartsSectionProps {
  currentStaff: StaffProfile;
  chartView: 'radar' | 'pace';
  setChartView: (view: 'radar' | 'pace') => void;
  selectedDate?: string;
}

export const PerformanceChartsSection: React.FC<PerformanceChartsSectionProps> = ({
  currentStaff,
  chartView,
  setChartView,
  selectedDate,
}) => {
  return (
    <>
      {/* ---------------- 📊 パフォーマンスレーダー & 消化ペース比較 ---------------- */}
      <section className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center shrink-0 gap-2">
          <div>
            <h3 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="text-xl">📊</span> スキル多角評価 & 消化ペース
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              各評価軸をホバーすると根拠テキストが表示されます
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setChartView('radar')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                chartView === 'radar'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              レーダーチャート
            </button>
            <button
              type="button"
              onClick={() => setChartView('pace')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                chartView === 'pace'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              消化ペース比較
            </button>
          </div>
        </div>

        <div className="w-full h-80 bg-slate-50/50 rounded-xl border border-slate-200 p-2 relative flex items-center justify-center">
          {chartView === 'radar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={currentStaff.skillData}>
                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 800 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar
                  name={currentStaff.user.name}
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.45}
                />
                <Tooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentStaff.paceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                <Line type="monotone" dataKey="planned" name="計画タスク数" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="実績完了数" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ---------------- 🤖 AIからのフィードバック（テキスト） ---------------- */}
      <section
        className="w-full p-4 lg:p-6 rounded-2xl shadow-sm border-2 flex flex-col gap-3"
        style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd' }}
      >
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-base lg:text-lg font-extrabold text-blue-950 flex items-center gap-2">
            <span className="text-xl">🤖</span> AI パーソナルフィードバック
          </h3>
          <span className="text-xs font-extrabold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
            対象日 {selectedDate || new Date().toLocaleDateString('ja-JP')} 分析
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 text-xs lg:text-sm font-bold text-blue-950 leading-relaxed shadow-2xs">
          💡 {currentStaff.feedback.evalSummary}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5">
            <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1 mb-1.5">
              <span>💪</span> あなたの強み (Strengths)
            </h4>
            <ul className="space-y-1 text-xs text-emerald-950 font-medium leading-relaxed">
              {currentStaff.feedback.strengths.map((item, idx) => (
                <li key={`str-${idx}`} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5">
            <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1 mb-1.5">
              <span>⚠️</span> 成長・改善ポイント
            </h4>
            <ul className="space-y-1 text-xs text-amber-950 font-medium leading-relaxed">
              {currentStaff.feedback.improvements.map((item, idx) => (
                <li key={`imp-${idx}`} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-blue-600 text-white p-3.5 rounded-xl text-xs lg:text-sm font-medium leading-relaxed shadow-md flex items-start gap-2.5">
          <span className="text-base shrink-0">🚀</span>
          <div>
            <span className="font-extrabold block text-blue-100 mb-0.5">推奨アクション:</span>
            <span>{currentStaff.feedback.recommendation}</span>
          </div>
        </div>
      </section>
    </>
  );
};
