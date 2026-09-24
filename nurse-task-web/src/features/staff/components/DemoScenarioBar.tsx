import { useTimelineStore, type DemoScenario } from '../../../stores/useTimelineStore';

export default function DemoScenarioBar() {
  const demoScenario = useTimelineStore((state) => state.demoScenario);
  const setDemoScenario = useTimelineStore((state) => state.setDemoScenario);

  const handleScenarioChange = (scenario: DemoScenario) => {
    setDemoScenario(scenario);
  };

  return (
    <div
      id="demo-scenario-bar"
      className="flex items-center gap-1 bg-slate-900/90 text-white p-1 rounded-xl shadow-md border border-slate-700/80 backdrop-blur-xs text-[11px] shrink-0 tutorial-demo-scenario"
    >
      <div className="flex items-center gap-1 text-[10px] font-black text-amber-300 px-1 shrink-0">
        <span className="text-xs">🎬</span>
        <span className="hidden sm:inline">シナリオ:</span>
      </div>

      <div className="flex items-center gap-0.5">
        {/* ☀️ 朝 (業務開始) */}
        <button
          type="button"
          onClick={() => handleScenarioChange('morning')}
          className={`!px-2 !py-0.5 !rounded-lg !font-extrabold !text-[11px] !transition-all !cursor-pointer flex items-center gap-0.5 whitespace-nowrap ${
            demoScenario === 'morning'
              ? '!bg-amber-400 !text-slate-950 !shadow-xs scale-105 font-black'
              : '!bg-slate-800/90 !text-slate-300 hover:!bg-slate-700 hover:!text-white'
          }`}
          title="【☀️ 朝・業務開始モード】全タスク未完了状態（進捗率0%）"
        >
          <span>☀️</span>
          <span>朝</span>
        </button>

        {/* 🕛 午前終了 (12:00) */}
        <button
          type="button"
          onClick={() => handleScenarioChange('noon')}
          className={`!px-2 !py-0.5 !rounded-lg !font-extrabold !text-[11px] !transition-all !cursor-pointer flex items-center gap-0.5 whitespace-nowrap ${
            demoScenario === 'noon'
              ? '!bg-sky-400 !text-slate-950 !shadow-xs scale-105 font-black'
              : '!bg-slate-800/90 !text-slate-300 hover:!bg-slate-700 hover:!text-white'
          }`}
          title="【🕛 午前終了モード】12:00以前の全タスク完了（進捗50%程度）"
        >
          <span>🕛</span>
          <span>午前済</span>
        </button>

        {/* 🌙 勤務終了 (17:00) */}
        <button
          type="button"
          onClick={() => handleScenarioChange('evening')}
          className={`!px-2 !py-0.5 !rounded-lg !font-extrabold !text-[11px] !transition-all !cursor-pointer flex items-center gap-0.5 whitespace-nowrap ${
            demoScenario === 'evening'
              ? '!bg-indigo-400 !text-slate-950 !shadow-xs scale-105 font-black'
              : '!bg-slate-800/90 !text-slate-300 hover:!bg-slate-700 hover:!text-white'
          }`}
          title="【🌙 勤務終了モード】全タスク完了（進捗100%）"
        >
          <span>🌙</span>
          <span>夕済(全完了)</span>
        </button>
      </div>
    </div>
  );
}
