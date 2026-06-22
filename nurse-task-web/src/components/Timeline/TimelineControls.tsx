import type { TimelineControlsProps } from '../../types/types';

export const TimelineControls = ({ 
  timelineMode, 
  setTimelineMode,
  groupingMode, 
  setGroupingMode 
}: TimelineControlsProps) => {
  console.log("TimelineControls: 現在のgroupingModeは:", groupingMode);
  const configs = [
    { label: '1時間', value: 60 },
    { label: '30分', value: 30 },
    { label: '15分', value: 15 },
  ] as const;

  return (
    <div className="flex flex-col mb-4 gap-2">
      {groupingMode && (
        <div className="p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex justify-between items-center text-sm font-bold shadow-sm">
          <span>グループ化ターゲットを選択中...</span>
          <button 
            onClick={() => setGroupingMode(null)} 
            className="bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded text-xs"
          >
            キャンセル
          </button>
        </div>
      )}

      <div className="flex space-x-2 mb-4 bg-gray-100 p-2 rounded shadow-inner">
      {configs.map((config) => (
        <button
          key={config.value}
          type="button"
          className={`!px-4 !py-2 !text-sm !font-bold !rounded !transition-colors !cursor-pointer ${
            timelineMode === config.value ? '!bg-blue-600 !text-white' : 'bg-white text-gray-700'
          }`}
          onClick={() => setTimelineMode(config.value)}
        >
          {config.label}
        </button>
      ))}
      </div>
    </div>
  );
};