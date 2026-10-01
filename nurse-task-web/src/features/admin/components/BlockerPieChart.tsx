import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
} from 'recharts';

export interface BlockerData {
  name: string;
  value: number;
  color: string;
}

export interface BlockerPieChartProps {
  data?: BlockerData[];
  isExpanded?: boolean;
}

/**
 * カスタム Tooltip コンポーネント
 */
const CustomTooltip = ({ active, payload, isExpanded }: any) => {
  if (active && payload && payload.length) {
    const item: BlockerData = payload[0].payload;
    return (
      <div
        className={`bg-white rounded-xl shadow-2xl border border-gray-200 z-50 ${
          isExpanded ? 'p-4 rounded-2xl text-sm space-y-2 max-w-sm' : 'p-3 text-xs max-w-xs space-y-1.5'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <span
            className={`rounded-full inline-block shrink-0 ${isExpanded ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`}
            style={{ backgroundColor: item.color }}
          />
          <span className={`text-gray-900 ${isExpanded ? 'text-base' : 'text-xs'}`}>{item.name}</span>
          <span
            className={`ml-auto font-black ${isExpanded ? 'text-lg' : 'text-sm'}`}
            style={{ color: item.color }}
          >
            {item.value}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * BlockerPieChart コンポーネント
 * グラフと詳細テキスト・凡例を左右分割レイアウト（重ねずに右側に完全独立表示）
 */
export const BlockerPieChart: React.FC<BlockerPieChartProps> = ({
  data = [],
  isExpanded = false,
}) => {
  const safeData = data || [];
  const totalValue = safeData.reduce((acc, curr) => acc + curr.value, 0);

  // 各データ項目に fill プロパティをマッピング
  const formattedData = safeData.map((item) => ({
    ...item,
    fill: item.color,
  }));

  if (safeData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-1">
      {/* 🟢 上側：円グラフ */}
      <div className="w-full h-[160px] relative shrink-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<CustomTooltip isExpanded={isExpanded} />}
              wrapperStyle={{ zIndex: 100, outline: 'none' }}
            />
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={isExpanded ? '46%' : '44%'}
              outerRadius={isExpanded ? '78%' : '75%'}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 🟢 下側：要因・割合リスト (内訳) */}
      <div className={`w-full flex flex-col bg-slate-50/90 rounded-xl border border-slate-200 shadow-sm ${
        isExpanded ? 'p-3.5 gap-2' : 'p-2.5 gap-2'
      }`}>
        {/* リストヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 shrink-0">
          <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
            <span>📊</span>
            <span>遅延要因内訳</span>
          </span>
          <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
            計: {totalValue}%
          </span>
        </div>

        {/* 要因リスト */}
        <ul className="space-y-1.5 w-full">
          {formattedData.map((item, index) => (
            <li
              key={`legend-${index}`}
              className={`flex items-center justify-between font-bold bg-white rounded-lg border border-slate-200/90 shadow-2xs ${
                isExpanded ? 'px-3 py-2 text-xs lg:text-sm' : 'px-2.5 py-1.5 text-xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`rounded-full shrink-0 shadow-xs ${
                    isExpanded ? 'w-3 h-3' : 'w-2.5 h-2.5'
                  }`}
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-900 font-extrabold truncate leading-none">{item.name}</span>
              </div>
              <span className="font-black text-slate-900 shrink-0 ml-2 whitespace-nowrap leading-none" style={{ color: item.color }}>
                {item.value}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BlockerPieChart;
