import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export interface TrendData {
  date: string;
  gapIndex: number;
  hasIntervention: boolean;
  interventionNote?: string;
}

export interface TrendLineChartProps {
  data?: TrendData[];
}

/**
 * カスタムドットコンポーネント
 */
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;

  if (payload.hasIntervention) {
    return (
      <g key={`dot-intervention-${payload.date}`} transform={`translate(${cx},${cy})`}>
        <circle r="8" fill="#EF4444" opacity="0.3" className="animate-ping" />
        <circle r="5.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
        <text
          x="0"
          y="-9"
          textAnchor="middle"
          fontSize="11"
          className="select-none pointer-events-none drop-shadow"
        >
          📍
        </text>
      </g>
    );
  }

  return (
    <circle
      key={`dot-normal-${payload.date}`}
      cx={cx}
      cy={cy}
      r={3}
      fill="#3B82F6"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
  );
};

/**
 * カスタム Tooltip コンポーネント
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item: TrendData = payload[0].payload;
    const isHighLoad = item.gapIndex >= 70;

    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-gray-100 text-xs max-w-xs space-y-1.5 z-30">
        <div className="flex justify-between items-center border-b border-gray-100 pb-1">
          <span className="font-bold text-gray-700">📅 {label}</span>
          <span className="text-gray-400 text-[10px]">GapIndex</span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-gray-600 font-medium">病棟全体負荷:</span>
          <span className={`text-sm font-extrabold ${isHighLoad ? 'text-red-600' : 'text-blue-600'}`}>
            {item.gapIndex} <span className="text-[10px] font-normal text-gray-500">pt</span>
          </span>
        </div>

        {item.hasIntervention && (
          <div className="pt-1.5 border-t border-red-100 bg-red-50/90 -mx-1 -mb-1 p-2 rounded-b-lg">
            <div className="flex items-center gap-1 font-bold text-red-700 mb-0.5 text-[11px]">
              <span>📍</span>
              <span>管理者介入メモ</span>
            </div>
            <p className="text-red-900 leading-tight font-medium text-[10px]">
              {item.interventionNote}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

/**
 * 1. TrendLineChart コンポーネント
 */
export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data = [] }) => {
  const safeData = data || [];

  if (safeData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={safeData}
          margin={{ top: 15, right: 15, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 10 }}
          />
          
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 10 }}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={70}
            stroke="#F87171"
            strokeDasharray="4 4"
            label={{
              value: '警戒ライン(70)',
              fill: '#EF4444',
              fontSize: 9,
              position: 'insideTopRight',
            }}
          />

          <Line
            type="monotone"
            dataKey="gapIndex"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2, fill: '#FFFFFF' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineChart;
