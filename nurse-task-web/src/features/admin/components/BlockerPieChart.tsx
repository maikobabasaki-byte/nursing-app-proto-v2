import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
} from 'recharts';

export interface BlockerData {
  name: string;
  value: number;
  color: string;
}

export interface BlockerPieChartProps {
  data?: BlockerData[];
}

/**
 * カスタム Tooltip コンポーネント
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item: BlockerData = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-2xl border border-gray-200 text-xs max-w-xs space-y-1.5 z-50">
        <div className="flex items-center gap-1.5 font-bold text-gray-800">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-900">{item.name}</span>
          <span className="ml-auto font-black text-sm" style={{ color: item.color }}>
            {item.value}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * カスタム凡例（Legend）描画コンポーネント
 * 【カラーアイコン ＋ 要因名 ＋ パーセンテージ】を重複なく1回だけ描画
 */
const renderCustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload || !payload.length) return null;

  return (
    <ul className="flex justify-center items-center gap-3 text-[11px] font-medium text-gray-600 mt-0">
      {payload.map((entry: any, index: number) => {
        const item: BlockerData = entry.payload;
        return (
          <li key={`item-${index}`} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full inline-block shadow-sm shrink-0"
              style={{ backgroundColor: item.color }}
            />
            {/* 要因名（例: 構造的競合） */}
            <span className="font-semibold text-gray-700">{item.name}</span>
            {/* パーセンテージ（例: (60%)） */}
            <span className="text-gray-500 font-bold text-[10px]">({item.value}%)</span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * 2. BlockerPieChart コンポーネント
 */
export const BlockerPieChart: React.FC<BlockerPieChartProps> = ({ data = [] }) => {
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
    <div className="relative w-full h-full min-h-0 flex flex-col justify-center">
      {/* ドーナツの中央テキスト */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6 z-0">
        <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
          TOTAL DELAY
        </span>
        <span className="text-xl font-black text-gray-800 tracking-tight leading-none mt-0.5">
          {totalValue}%
        </span>
        <span className="text-[9px] text-gray-400 font-medium mt-0.5">直近1週間</span>
      </div>

      {/* Recharts グラフ本体 */}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 100, outline: 'none' }}
          />
          
          <Pie
            data={formattedData}
            cx="50%"
            cy="42%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            stroke="none"
          />

          <Legend content={renderCustomLegend} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BlockerPieChart;
