import type { TimelineMode } from '../../types/types';
interface TimelineControlsProps {
  timelineMode: TimelineMode;
  setTimelineMode: (value: TimelineMode) => void;
}

export const TimelineControls = ({ timelineMode, setTimelineMode }: TimelineControlsProps) => {
  const configs = [
    { label: '1時間', value: 60 },
    { label: '30分', value: 30 },
    { label: '15分', value: 15 },
  ] as const;

  return (
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
  );
};