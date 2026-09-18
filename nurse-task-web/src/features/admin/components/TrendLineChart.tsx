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
  isExpanded?: boolean;
}

/**
 * カスタムドットコンポーネント
 */
const CustomDot = (props: any) => {
  const { cx, cy, payload, isExpanded } = props;
  if (!cx || !cy) return null;

  if (payload.hasIntervention) {
    return (
      <g key={`dot-intervention-${payload.date}`} transform={`translate(${cx},${cy})`}>
        <circle r={isExpanded ? 11 : 8} fill="#EF4444" opacity="0.3" className="animate-ping" />
        <circle r={isExpanded ? 7.5 : 5.5} fill="#EF4444" stroke="#FFFFFF" strokeWidth={isExpanded ? 2.5 : 2} />
        <text
          x="0"
          y={isExpanded ? -12 : -9}
          textAnchor="middle"
          fontSize={isExpanded ? 15 : 11}
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
      r={isExpanded ? 4.5 : 3}
      fill="#3B82F6"
      stroke="#FFFFFF"
      strokeWidth={isExpanded ? 2 : 1.5}
    />
  );
};

/**
 * カスタム Tooltip コンポーネント
 */
const CustomTooltip = ({ active, payload, label, isExpanded }: any) => {
  if (active && payload && payload.length) {
    const item: TrendData = payload[0].payload;
    const isHighLoad = item.gapIndex >= 70;

    return (
      <div
        className={`bg-white/95 backdrop-blur-sm shadow-xl border border-gray-100 max-w-sm z-30 ${
          isExpanded ? 'p-4 rounded-2xl text-sm space-y-2' : 'p-3 rounded-xl text-xs space-y-1.5'
        }`}
      >
        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
          <span className={`font-bold text-gray-800 ${isExpanded ? 'text-base' : 'text-xs'}`}>
            📅 {label}
          </span>
          <span className={`text-gray-400 font-semibold ${isExpanded ? 'text-xs' : 'text-[10px]'}`}>
            GapIndex
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className={`text-gray-600 font-medium ${isExpanded ? 'text-sm' : 'text-xs'}`}>
            病棟全体負荷:
          </span>
          <span
            className={`font-extrabold ${isExpanded ? 'text-lg' : 'text-sm'} ${
              isHighLoad ? 'text-red-600' : 'text-blue-600'
            }`}
          >
            {item.gapIndex}{' '}
            <span className={`font-normal text-gray-500 ${isExpanded ? 'text-xs' : 'text-[10px]'}`}>
              pt
            </span>
          </span>
        </div>

        {item.hasIntervention && (
          <div
            className={`pt-2 border-t border-red-100 bg-red-50/90 -mx-1 -mb-1 rounded-b-lg ${
              isExpanded ? 'p-3' : 'p-2'
            }`}
          >
            <div
              className={`flex items-center gap-1 font-bold text-red-700 mb-1 ${
                isExpanded ? 'text-sm' : 'text-[11px]'
              }`}
            >
              <span>📍</span>
              <span>管理者介入メモ</span>
            </div>
            <p
              className={`text-red-900 leading-normal font-medium ${
                isExpanded ? 'text-xs lg:text-sm' : 'text-[10px]'
              }`}
            >
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
export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data = [],
  isExpanded = false,
}) => {
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
          margin={
            isExpanded
              ? { top: 20, right: 30, left: -10, bottom: 10 }
              : { top: 15, right: 15, left: -25, bottom: 0 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: isExpanded ? 13 : 10, fontWeight: isExpanded ? 600 : 400 }}
          />

          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: isExpanded ? 13 : 10, fontWeight: isExpanded ? 600 : 400 }}
          />

          <Tooltip content={<CustomTooltip isExpanded={isExpanded} />} />

          <ReferenceLine
            y={70}
            stroke="#F87171"
            strokeDasharray="4 4"
            label={{
              value: isExpanded ? '警戒ライン (70pt)' : '警戒ライン(70)',
              fill: '#EF4444',
              fontSize: isExpanded ? 12 : 9,
              fontWeight: isExpanded ? 'bold' : 'normal',
              position: 'insideTopRight',
            }}
          />

          <Line
            type="monotone"
            dataKey="gapIndex"
            stroke="#3B82F6"
            strokeWidth={isExpanded ? 3.5 : 2}
            dot={<CustomDot isExpanded={isExpanded} />}
            activeDot={{
              r: isExpanded ? 8 : 6,
              stroke: '#2563EB',
              strokeWidth: isExpanded ? 3 : 2,
              fill: '#FFFFFF',
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineChart;
