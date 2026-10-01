import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { StaffProfile } from '../../types/personalDashboard';

interface PerformanceChartsSectionProps {
  currentStaff: StaffProfile;
  selectedDate?: string;
  chartView?: 'radar' | 'pace';
  setChartView?: (view: 'radar' | 'pace') => void;
}

export const PerformanceChartsSection: React.FC<PerformanceChartsSectionProps> = ({
  currentStaff,
  selectedDate,
}) => {
  return (
    <>
      {/* ---------------- 📈 タスク消化ペース比較 ---------------- */}
      <section className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center shrink-0 gap-2">
          <div>
            <h3 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="text-xl">📈</span> タスク消化ペース比較 (計画 vs 実績)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              時間経過に応じた計画タスク数と実際の完了パフォーマンス推移
            </p>
          </div>

          <div className="text-xs font-extrabold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
            📊 リアルタイム消化状況
          </div>
        </div>

        <div className="w-full h-72 bg-slate-50/50 rounded-xl border border-slate-200 p-2 relative flex items-center justify-center">
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
