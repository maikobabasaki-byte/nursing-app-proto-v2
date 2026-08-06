import type { TimelineControlsProps } from '../../types/types';
import { useTimelineStore } from '../../stores/useTimelineStore';

// 💡 30分刻みの時間オプション（00:00 〜 23:30）を網羅
const TIME_RANGE_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const SHIFT_PRESETS = [
  { label: '日勤', start: '08:00', end: '17:30' },
  { label: '早出', start: '07:00', end: '16:00' },
  { label: '遅出', start: '11:00', end: '20:00' },
  { label: '夜勤', start: '17:00', end: '09:00' },
  { label: '全時間', start: '06:00', end: '23:30' },
];

export const TimelineControls = ({ 
  timelineMode, 
  setTimelineMode,
}: TimelineControlsProps) => {
  const groupingMode = useTimelineStore((state) => state.groupingMode);
  const setGroupingMode = useTimelineStore((state) => state.setGroupingMode);
  const timelineStartTime = useTimelineStore((state) => state.timelineStartTime);
  const timelineEndTime = useTimelineStore((state) => state.timelineEndTime);
  const setTimelineTimeRange = useTimelineStore((state) => state.setTimelineTimeRange);

  const configs = [
    { label: '1時間', value: 60 },
    { label: '30分', value: 30 },
    { label: '15分', value: 15 },
  ] as const;

  return (
    <div className="flex flex-col mb-3 gap-2">
      {groupingMode && (
        <div className="p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl flex justify-between items-center text-sm font-bold shadow-xs">
          <span>グループ化ターゲットを選択中...</span>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setGroupingMode(null);
            }} 
            className="bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded-lg text-xs cursor-pointer font-bold"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* 🛠️ メインツールバーコントロール */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100/90 p-2.5 rounded-2xl border border-gray-200/80 shadow-inner text-xs">
        {/* A. 目盛り間隔切り替えボタン */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-2xs border border-gray-200">
          <span className="text-[10px] font-extrabold text-gray-400 px-1.5">目盛り:</span>
          {configs.map((config) => (
            <button
              key={config.value}
              type="button"
              className={`!px-2.5 !py-1 !text-xs !font-extrabold !rounded-lg !transition-all !cursor-pointer ${
                timelineMode === config.value ? '!bg-indigo-600 !text-white !shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setTimelineMode(config.value)}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* B. 勤務シフト別プリセット選択ボタン */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] font-extrabold text-gray-400 px-1">シフト:</span>
          {SHIFT_PRESETS.map((preset) => {
            const isActive = timelineStartTime === preset.start && timelineEndTime === preset.end;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setTimelineTimeRange(preset.start, preset.end)}
                className={`!px-2.5 !py-1.5 !text-xs !font-extrabold !rounded-xl !border transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? '!bg-emerald-600 !text-white !border-emerald-700 !shadow-xs !ring-2 !ring-emerald-200'
                    : '!bg-white !text-gray-700 !border-gray-200 hover:!bg-emerald-50 hover:!border-emerald-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* C. 開始時間 ➔ 終了時間 ドロップダウン指定 */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl shadow-2xs border border-gray-200 font-extrabold text-gray-700">
          <span>表示範囲:</span>
          <select
            value={timelineStartTime}
            onChange={(e) => setTimelineTimeRange(e.target.value, timelineEndTime)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-1.5 py-1 text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {TIME_RANGE_OPTIONS.map((time) => (
              <option key={`start-${time}`} value={time}>
                {time}
              </option>
            ))}
          </select>
          <span className="text-gray-400">〜</span>
          <select
            value={timelineEndTime}
            onChange={(e) => setTimelineTimeRange(timelineStartTime, e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-1.5 py-1 text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {TIME_RANGE_OPTIONS.map((time) => (
              <option key={`end-${time}`} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};