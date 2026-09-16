import React, { useState } from 'react';

export interface HeatmapHour {
  hour: string;
  intensity: number; // 0〜100
  taskCount?: number; // 平均タスク発生件数
  riskFactor?: string; // 過密の主要原因コメント・リスク要素
}

export interface HeatmapDay {
  day: string;
  hours: HeatmapHour[];
}

export interface SelectedSlot {
  day: string;
  hour: string;
}

export interface OvercrowdedHeatmapProps {
  data?: HeatmapDay[];
  selectedSlot?: SelectedSlot | null;
  onCellClick?: (day: string, hour: string) => void;
}

const HOURS_HEADER = [
  '8時', '9時', '10時', '11時', '12時', '13時', '14時', '15時', '16時', '17時', '18時', '19時', '20時'
];

/**
 * intensity (0〜100) に応じて グリーン・イエロー・オレンジ・レッド の4段階カラーとスタイルの定義を取得
 */
const getIntensityStyles = (intensity: number) => {
  if (intensity <= 25) {
    return {
      className: 'bg-emerald-100 border-emerald-200 text-emerald-800',
      style: { backgroundColor: '#d1fae5', borderColor: '#a7f3d0', color: '#065f46' },
    };
  }
  if (intensity <= 50) {
    return {
      className: 'bg-amber-100 border-amber-300 text-amber-900 font-medium',
      style: { backgroundColor: '#fef3c7', borderColor: '#fcd34d', color: '#78350f' },
    };
  }
  if (intensity <= 75) {
    return {
      className: 'bg-orange-400 border-orange-500 text-white font-bold',
      style: { backgroundColor: '#fb923c', borderColor: '#f97316', color: '#ffffff' },
    };
  }
  return {
    className: 'bg-red-600 border-red-700 text-white font-black animate-pulse',
    style: { backgroundColor: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' },
  };
};

/**
 * ツールチップ用バッジの色を取得
 */
const getBadgeColor = (intensity: number) => {
  if (intensity <= 25) return 'bg-emerald-600';
  if (intensity <= 50) return 'bg-amber-500';
  if (intensity <= 75) return 'bg-orange-500';
  return 'bg-red-600';
};

/**
 * 3. OvercrowdedHeatmap コンポーネント
 */
export const OvercrowdedHeatmap: React.FC<OvercrowdedHeatmapProps> = ({
  data = [],
  selectedSlot = null,
  onCellClick,
}) => {
  const safeData = data || [];
  const [activeCell, setActiveCell] = useState<{
    day: string;
    item: HeatmapHour;
  } | null>(null);

  if (safeData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between select-none relative font-sans text-xs min-h-0">
      {/* 凡例・ヘッダー情報 */}
      <div className="flex justify-between items-center mb-1 px-0.5 text-[10px] text-gray-500 shrink-0">
        <span className="font-semibold text-gray-700">時間帯マトリクス（8:00〜20:00）</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="w-2.5 h-2.5 rounded border inline-block" style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }} />
            <span className="text-emerald-700 font-medium">安全 (〜25%)</span>
          </span>
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="w-2.5 h-2.5 rounded border inline-block" style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d' }} />
            <span className="text-amber-800 font-medium">注意 (〜50%)</span>
          </span>
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="w-2.5 h-2.5 rounded border inline-block" style={{ backgroundColor: '#fb923c', borderColor: '#f97316' }} />
            <span className="text-orange-600 font-medium">警戒 (〜75%)</span>
          </span>
          <span className="flex items-center gap-0.5 text-[9px]">
            <span className="w-2.5 h-2.5 rounded border inline-block" style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }} />
            <span className="text-red-600 font-bold">過密 (76%〜)</span>
          </span>
        </div>
      </div>

      {/* ヒートマップ本体コンテナ */}
      <div className="flex-1 flex flex-col justify-between min-h-0 gap-1">
        {/* 横軸: 時間ヘッダー行 */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-6 shrink-0 text-center font-bold text-gray-400 text-[9px]">
            曜日
          </div>
          <div
            className="flex-1 gap-1"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
          >
            {HOURS_HEADER.map((hour) => (
              <div
                key={hour}
                className="text-center font-bold text-gray-500 text-[9px] tracking-tighter"
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* 縦軸: 各曜日データ行 */}
        {safeData.map((row, rowIndex) => {
          const hours = row?.hours || [];
          const dayLabel = row?.day || `${rowIndex + 1}`;

          return (
            <div key={dayLabel} className="flex-1 flex items-center gap-1 min-h-0">
              {/* 曜日ラベル */}
              <div
                className={`w-6 shrink-0 h-full flex items-center justify-center font-bold text-[10px] rounded ${
                  dayLabel === '土'
                    ? 'text-blue-600 bg-blue-50'
                    : dayLabel === '日'
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-700 bg-gray-100'
                }`}
              >
                {dayLabel}
              </div>

              {/* 時間セル（13列グリッド） */}
              <div
                className="flex-1 h-full gap-1"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
              >
                {hours.map((item) => {
                  const styles = getIntensityStyles(item.intensity);
                  const isSelected =
                    selectedSlot?.day === dayLabel && selectedSlot?.hour === item.hour;

                  return (
                    <button
                      key={`${dayLabel}-${item.hour}`}
                      type="button"
                      onClick={() => onCellClick?.(dayLabel, item.hour)}
                      onMouseEnter={() => setActiveCell({ day: dayLabel, item })}
                      onMouseLeave={() => setActiveCell(null)}
                      style={{
                        ...styles.style,
                        ...(isSelected
                          ? { outline: '3px solid #3b82f6', outlineOffset: '1px', zIndex: 20 }
                          : {}),
                      }}
                      className={`h-full rounded flex items-center justify-center border transition-all duration-150 cursor-pointer ${
                        styles.className
                      } ${
                        isSelected
                          ? 'ring-4 ring-blue-500 ring-offset-1 z-20 scale-110 shadow-xl border-white font-black'
                          : 'hover:scale-105 hover:z-10 hover:shadow-md'
                      }`}
                      aria-label={`${dayLabel}曜日 ${item.hour}: 過密度${item.intensity}%`}
                    >
                      <span className="text-[9px] tracking-tighter">
                        {item.intensity > 35 ? item.intensity : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ホバー時の詳細ツールチップポップアップ（件数・過密理由コメント付き） */}
      {activeCell && (
        <div className="absolute bottom-1 right-2 bg-gray-900/95 text-white backdrop-blur p-2.5 rounded-xl shadow-2xl border border-gray-700 z-30 pointer-events-none text-xs space-y-1 max-w-xs animate-fade-in">
          <div className="flex items-center justify-between font-bold border-b border-gray-700 pb-1 gap-3">
            <span>
              📅 {activeCell.day}曜日 {activeCell.item.hour}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-black ${getBadgeColor(
                activeCell.item.intensity
              )}`}
            >
              過密度 {activeCell.item.intensity}%
            </span>
          </div>

          {/* 平均タスク件数表示 */}
          {activeCell.item.taskCount !== undefined && (
            <div className="text-[10px] text-gray-300">
              平均タスク発生: <span className="font-bold text-white">{activeCell.item.taskCount}件</span>
            </div>
          )}

          {/* なぜ過密なのかのコメント・理由メモ */}
          {activeCell.item.riskFactor && (
            <div className="text-[10px] text-red-300 font-medium pt-1 border-t border-gray-800 leading-snug">
              ⚠️ {activeCell.item.riskFactor}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OvercrowdedHeatmap;
