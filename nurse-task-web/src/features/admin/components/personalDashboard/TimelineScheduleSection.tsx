import React from 'react';
import type {
  StaffProfile,
  TimelineItem,
  GapItem,
  GapSubSegment,
} from '../../types/personalDashboard';
import { GAP_ACTIVITY_OPTIONS } from '../../types/personalDashboard';

interface TimelineScheduleSectionProps {
  currentStaff: StaffProfile;
  currentTimeStr: string;
  currentTopPx: number;
  simulatedTimeStr: string | null;
  setSimulatedTimeStr: (val: string | null) => void;
  showGaps: boolean;
  setShowGaps: (show: boolean) => void;
  timelineViewMode: 'patient' | 'gantt' | 'table';
  setTimelineViewMode: (mode: 'patient' | 'gantt' | 'table') => void;
  scheduleGaps: GapItem[];
  gapSegments: Record<string, GapSubSegment[]>;
  setGapSegments: React.Dispatch<React.SetStateAction<Record<string, GapSubSegment[]>>>;
}

export const TimelineScheduleSection: React.FC<TimelineScheduleSectionProps> = ({
  currentStaff,
  currentTimeStr,
  currentTopPx,
  simulatedTimeStr,
  setSimulatedTimeStr,
  showGaps,
  setShowGaps,
  timelineViewMode,
  setTimelineViewMode,
  scheduleGaps,
  gapSegments,
  setGapSegments,
}) => {
  const TOTAL_TIMELINE_HOURS = 10;
  const TOTAL_GRID_HEIGHT_PX = 1800;
  const timelineHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const getVerticalGanttPosition = (timeStr: string, durationMinutes: number) => {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    const startMinFrom8 = Math.max(0, (h * 60 + (m || 0)) - (8 * 60));
    const dayTotalMin = TOTAL_TIMELINE_HOURS * 60;

    const topPx = (startMinFrom8 / dayTotalMin) * TOTAL_GRID_HEIGHT_PX;
    const heightPx = Math.max(30, (durationMinutes / dayTotalMin) * TOTAL_GRID_HEIGHT_PX);

    return { topPx, heightPx };
  };

  const uniquePatients = Array.from(
    new Set(currentStaff.timeline.map((item) => item.patientName))
  );

  const patientColumnInfo = uniquePatients.map((patientName) => {
    const match = currentStaff.timeline.find((t) => t.patientName === patientName);
    return {
      patientName,
      room: match?.room || '各部屋',
    };
  });

  const getSegmentsForGap = (gap: GapItem): GapSubSegment[] => {
    const existing = gapSegments[gap.id];
    if (existing && existing.length > 0) {
      return existing;
    }
    return [
      {
        id: `${gap.id}-seg-0`,
        minutes: gap.gapMinutes,
        activity: '👇 行動を選択してください...',
      },
    ];
  };

  const handleSplitSegment = (gap: GapItem, segId: string) => {
    const currentSegs = getSegmentsForGap(gap);
    const targetIdx = currentSegs.findIndex((s) => s.id === segId);
    if (targetIdx === -1) return;

    const target = currentSegs[targetIdx];
    if (target.minutes < 10) return;

    const half1 = Math.max(5, Math.floor(target.minutes / 2));
    const half2 = target.minutes - half1;

    const seg1: GapSubSegment = { ...target, minutes: half1 };
    const seg2: GapSubSegment = {
      id: `${gap.id}-seg-${Date.now()}`,
      minutes: half2,
      activity: '👇 行動を選択してください...',
    };

    const newSegs = [...currentSegs];
    newSegs.splice(targetIdx, 1, seg1, seg2);

    setGapSegments((prev) => ({
      ...prev,
      [gap.id]: newSegs,
    }));
  };

  const handleRemoveSegment = (gap: GapItem, segId: string) => {
    const currentSegs = getSegmentsForGap(gap);
    if (currentSegs.length <= 1) return;

    const targetIdx = currentSegs.findIndex((s) => s.id === segId);
    if (targetIdx === -1) return;

    const target = currentSegs[targetIdx];
    const newSegs = currentSegs.filter((s) => s.id !== segId);

    const mergeIdx = Math.max(0, targetIdx - 1);
    newSegs[mergeIdx] = {
      ...newSegs[mergeIdx],
      minutes: newSegs[mergeIdx].minutes + target.minutes,
    };

    setGapSegments((prev) => ({
      ...prev,
      [gap.id]: newSegs,
    }));
  };

  const handleUpdateSegmentActivity = (gapId: string, segId: string, activity: string) => {
    setGapSegments((prev) => {
      const currentSegs = prev[gapId] || [
        {
          id: `${gapId}-seg-0`,
          minutes: 30,
          activity,
        },
      ];
      const updated = currentSegs.some((s) => s.id === segId)
        ? currentSegs.map((s) => (s.id === segId ? { ...s, activity } : s))
        : [...currentSegs, { id: segId, minutes: 30, activity }];
      return {
        ...prev,
        [gapId]: updated,
      };
    });
  };

  const renderGapBlock = (gap: GapItem) => {
    const segments = getSegmentsForGap(gap);
    let accumMinutes = 0;

    return (
      <div
        key={gap.id}
        className="absolute left-0 right-0 pointer-events-auto z-10 flex flex-col divide-y divide-dashed divide-amber-300/80 rounded-lg overflow-hidden border border-dashed border-amber-400/90 bg-amber-50/50 shadow-2xs transition-all"
        style={{
          top: `${gap.topPx}px`,
          height: `${gap.heightPx}px`,
        }}
      >
        {segments.map((seg) => {
          const segStartMinFromMidnight = gap.startMin + 480 + accumMinutes;
          const segEndMinFromMidnight = segStartMinFromMidnight + seg.minutes;
          accumMinutes += seg.minutes;

          const startH = Math.floor(segStartMinFromMidnight / 60);
          const startM = segStartMinFromMidnight % 60;
          const endH = Math.floor(segEndMinFromMidnight / 60);
          const endM = segEndMinFromMidnight % 60;

          const segStartStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
          const segEndStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          const isRecorded = seg.activity && !seg.activity.includes('選択してください');

          return (
            <div
              key={seg.id}
              className={`w-full flex flex-wrap items-center justify-between px-2 sm:px-3 py-0.5 transition-all relative overflow-hidden ${
                isRecorded ? 'bg-emerald-50/90 hover:bg-emerald-100/90' : 'bg-amber-50/90 hover:bg-amber-100/90'
              }`}
              style={{
                flexGrow: seg.minutes,
                flexBasis: 0,
                minHeight: '26px',
              }}
            >
              <div className="flex items-center gap-1.5 shrink-0 my-0.5">
                <span
                  className={`font-black !px-1.5 !py-0.2 !rounded border shadow-2xs ${
                    isRecorded
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-amber-200 text-amber-950 border-amber-300'
                  }`}
                >
                  {isRecorded ? '✓ 実績' : 'Gap'} {seg.minutes}分
                </span>
                <span className="text-[10px] font-extrabold text-slate-700 hidden sm:inline">
                  ({segStartStr} 〜 {segEndStr})
                </span>
              </div>

              <div className="flex items-center gap-1 my-0.5 shrink-0 min-w-0">
                <div className="relative inline-flex items-center max-w-[170px] sm:max-w-[220px]">
                  <label htmlFor={`select-gap-seg-${seg.id}`} className="sr-only">
                    行動実績を選択
                  </label>
                  <select
                    id={`select-gap-seg-${seg.id}`}
                    value={seg.activity}
                    onChange={(e) => handleUpdateSegmentActivity(gap.id, seg.id, e.target.value)}
                    style={{ paddingRight: '28px' }}
                    className={`!w-full sm:!text-xs !font-black !pl-2 !py-0.5 !rounded-lg !border !shadow-2xs !cursor-pointer focus:!outline-none focus:!ring-1 !transition-all !appearance-none !truncate ${
                      isRecorded
                        ? '!bg-emerald-600 !text-white !border-emerald-700 focus:!ring-emerald-400'
                        : '!bg-white !text-amber-950 !border-amber-400 hover:!bg-amber-100 focus:!ring-amber-500 !font-extrabold'
                    }`}
                  >
                    {GAP_ACTIVITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white text-slate-900 font-bold">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <svg
                    className={`w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 stroke-[2.5] ${
                      isRecorded ? 'text-white' : 'text-amber-900'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-1 my-0.5 shrink-0">
                {seg.minutes >= 10 && (
                  <button
                    type="button"
                    onClick={() => handleSplitSegment(gap, seg.id)}
                    className="!px-1.5 !py-0.5 !bg-white hover:!bg-amber-200 !text-amber-900 !border !border-amber-300 !rounded !font-black !shadow-2xs !transition-all !flex !items-center !gap-0.5 !cursor-pointer"
                    title="この時間枠を2つに分割して別の行動を追加します"
                  >
                    <span>✂️</span> <span className="hidden md:inline">分割</span>
                  </button>
                )}

                {segments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSegment(gap, seg.id)}
                    className="px-1.5 py-0.5 bg-red-50 hover:bg-red-200 text-red-700 border border-red-300 rounded font-black text-[10px] shadow-2xs transition-all cursor-pointer"
                    title="この分割枠を削除して隣の枠と結合します"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-center mb-1 shrink-0 gap-2">
        <div>
          <h3 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span className="text-xl">⏱️</span> 本日のタイムライン
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            空き時間(Gap)は「✂️ 分割」で時間を細かく区切って複数の行動をプルダウン登録できます
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs">
            <span className="text-[10px] font-extrabold text-slate-600 pl-1 flex items-center gap-1">
              <span>🕒</span> 現在時刻:
            </span>
            <span className="font-black text-red-600 bg-white px-2 py-0.5 rounded border border-red-200 text-[11px] shadow-2xs">
              {currentTimeStr}
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={simulatedTimeStr || 'real'}
                onChange={(e) => setSimulatedTimeStr(e.target.value === 'real' ? null : e.target.value)}
                style={{ paddingRight: '28px' }}
                className="!appearance-none !bg-white !text-slate-800 !text-[10px] !font-extrabold !pl-2 !py-0.5 !rounded-md !border !border-slate-300 focus:!outline-none focus:!ring-1 focus:!ring-blue-400 hover:!border-slate-400 !cursor-pointer !shadow-2xs !transition-all !truncate"
              >
                <option value="real">⚡ リアルタイム (時計連動)</option>
                <option value="08:45">08:45 (朝のバイタル)</option>
                <option value="11:45">11:45 (昼前介助)</option>
                <option value="14:15">14:15 (午後重症ケア)</option>
                <option value="16:45">16:45 (終業申し送り)</option>
              </select>
              <svg
                className="w-3 h-3 text-slate-600 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 stroke-[2.5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGaps(!showGaps)}
            className={`!px-2.5 !py-1 !rounded-xl !text-xs !font-extrabold !border !transition-all !flex !items-center !gap-1 ${
              showGaps
                ? '!bg-amber-100 !text-amber-900 !border-amber-300 !shadow-2xs'
                : '!bg-slate-100 !text-slate-600 !border-slate-300 hover:!bg-slate-200'
            }`}
          >
            Gap可視化 ({showGaps ? 'ON' : 'OFF'})
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setTimelineViewMode('patient')}
              className={`!px-2.5 !py-1 !rounded-lg !font-extrabold !transition-all ${
                timelineViewMode === 'patient'
                  ? '!bg-blue-700 !text-white !shadow-sm'
                  : '!bg-white !text-slate-700 hover:!bg-slate-200'
              }`}
            >
              👥 患者別軸
            </button>
            <button
              type="button"
              onClick={() => setTimelineViewMode('gantt')}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-all ${
                timelineViewMode === 'gantt'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              📅 単一軸
            </button>
            <button
              type="button"
              onClick={() => setTimelineViewMode('table')}
              className={`px-2.5 py-1 rounded-lg font-extrabold transition-all ${
                timelineViewMode === 'table'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 詳細表
            </button>
          </div>
        </div>
      </div>

      {timelineViewMode === 'patient' ? (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 gap-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-extrabold text-slate-800">💡 プルダウン＆時間分割:</span>
              <span>長時間のGapは「✂️ 分割」で時間を細分化し、それぞれの時間帯に行動を選択できます。</span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-md bg-amber-100 border border-amber-300 inline-block" />Gap</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 完了</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> 進行中</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> 予定</span>
            </div>
          </div>

          <div className="w-full max-h-[760px] overflow-auto border border-slate-200 rounded-xl bg-slate-50/50 shadow-2xs relative">
            <div className="min-w-[560px] relative" style={{ minHeight: `${TOTAL_GRID_HEIGHT_PX + 40}px` }}>
              <div className="flex border-b border-slate-200 bg-slate-100 text-[11px] font-extrabold text-slate-700 sticky top-0 z-30 shadow-xs">
                <div className="w-14 sm:w-16 shrink-0 p-2 border-r border-slate-200 text-center bg-slate-200 font-black text-slate-800 sticky left-0 z-40 shadow-xs flex items-center justify-center">
                  時刻
                </div>
                <div className="flex-1 flex divide-x divide-slate-200">
                  {patientColumnInfo.map((col) => (
                    <div
                      key={`hdr-${col.patientName}`}
                      className="flex-1 p-2 text-center bg-slate-100 font-extrabold text-slate-800 truncate"
                      title={`${col.patientName} (${col.room})`}
                    >
                      <div className="truncate text-xs text-slate-900 font-extrabold">👤 {col.patientName}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full relative flex overflow-hidden" style={{ height: `${TOTAL_GRID_HEIGHT_PX}px` }}>
                <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200 bg-slate-100 relative select-none sticky left-0 z-20 shadow-xs">
                  {timelineHours.map((hour, idx) => {
                    const topPx = (idx / 10) * TOTAL_GRID_HEIGHT_PX;
                    const translateY = idx === 0 ? 'translate-y-0' : idx === timelineHours.length - 1 ? '-translate-y-full' : '-translate-y-1/2';
                    return (
                      <div
                        key={hour}
                        className={`absolute left-1 text-[10px] sm:text-[11px] font-black text-slate-700 ${translateY}`}
                        style={{ top: `${topPx}px` }}
                      >
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">
                          {hour}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 relative h-full bg-white flex divide-x divide-slate-200/80">
                  {timelineHours.map((hour, idx) => {
                    const topPx = (idx / 10) * TOTAL_GRID_HEIGHT_PX;
                    return (
                      <React.Fragment key={`grid-${hour}`}>
                        <div
                          className="absolute left-0 right-0 border-b border-slate-200 pointer-events-none"
                          style={{ top: `${topPx}px` }}
                        />
                        {idx < timelineHours.length - 1 && (
                          <div
                            className="absolute left-0 right-0 border-b border-dashed border-slate-100 pointer-events-none"
                            style={{ top: `${topPx + (TOTAL_GRID_HEIGHT_PX / 20)}px` }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {showGaps && scheduleGaps.map((gap) => renderGapBlock(gap))}

                  <div
                    className="absolute left-0 right-0 border-b-2 border-red-500 z-20 pointer-events-none flex items-center transition-all duration-500"
                    style={{ top: `${currentTopPx}px` }}
                  >
                    <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-r-md shadow-md flex items-center gap-1">
                      <span>📍</span> 現在 {currentTimeStr}
                      {simulatedTimeStr && <span className="text-[8px] opacity-90">(デモ)</span>}
                    </span>
                  </div>

                  {patientColumnInfo.map((col) => (
                    <div key={col.patientName} className="flex-1 relative h-full">
                      {currentStaff.timeline
                        .filter((item) => item.patientName === col.patientName)
                        .map((item) => {
                          const isCompleted = item.status === 'completed';
                          const isInProgress = item.status === 'in_progress';
                          const { topPx, heightPx } = getVerticalGanttPosition(item.time, item.estimatedMinutes);

                          return (
                            <div
                              key={item.id}
                              className={`group absolute rounded-xl border-2 p-1.5 sm:p-2 transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-lg overflow-hidden cursor-pointer z-20 ${
                                isInProgress
                                  ? 'bg-blue-50/95 border-blue-600 ring-2 ring-blue-300 shadow-md z-30'
                                  : isCompleted
                                  ? 'bg-emerald-50/90 border-emerald-400 hover:border-emerald-500'
                                  : 'bg-white border-indigo-300 hover:border-indigo-400'
                              }`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                left: '3px',
                                right: '3px',
                              }}
                              title={`${item.time} 開始 / 所要時間:${item.estimatedMinutes}分間 / 重症度:${item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'} / ${item.taskTitle}`}
                            >
                              {heightPx < 48 ? (
                                <div className="w-full h-full flex items-center justify-between gap-1 overflow-hidden pointer-events-none px-0.5">
                                  <span
                                    className={`font-black text-[9px] px-1 py-0.2 rounded shrink-0 ${
                                      isInProgress
                                        ? 'bg-blue-600 text-white font-black'
                                        : isCompleted
                                        ? 'bg-emerald-700 text-white'
                                        : 'bg-indigo-700 text-white'
                                    }`}
                                  >
                                    {item.time}
                                  </span>
                                  <h4 className="font-extrabold text-[10px] text-slate-900 truncate flex-1 min-w-0" title={item.taskTitle}>
                                    {item.taskTitle}
                                  </h4>
                                  <span className="text-[9px] font-extrabold text-slate-700 bg-white/90 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                    ⏱️{item.estimatedMinutes}分
                                  </span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col justify-between overflow-hidden gap-0.5 pointer-events-none">
                                  <div className="flex items-center justify-between gap-1 shrink-0 overflow-hidden w-full">
                                    <span
                                      className={`font-black text-[10px] px-1.5 py-0.2 rounded shrink-0 ${
                                        isInProgress
                                          ? 'bg-blue-600 text-white font-black'
                                          : isCompleted
                                          ? 'bg-emerald-700 text-white'
                                          : 'bg-indigo-700 text-white'
                                      }`}
                                    >
                                      {item.time}
                                    </span>
                                    
                                    <div className="flex items-center gap-1 shrink-0 min-w-0">
                                      <span className="text-[9px] font-extrabold text-slate-700 bg-white/90 px-1 py-0.2 rounded border border-slate-200 shrink-0 truncate">
                                        ⏱️ {item.estimatedMinutes}分
                                      </span>
                                      <span
                                        className={`font-black px-1 py-0.2 rounded text-[9px] shrink-0 ${
                                          item.priority === 'high'
                                            ? 'text-red-700 bg-red-100 border border-red-300'
                                            : item.priority === 'medium'
                                            ? 'text-amber-800 bg-amber-100 border border-amber-300'
                                            : 'text-blue-700 bg-blue-100 border border-blue-300'
                                        }`}
                                      >
                                        {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-h-0 flex items-center overflow-hidden w-full my-0.5">
                                    <h4
                                      className={`font-extrabold text-xs text-slate-900 leading-snug w-full block ${
                                        heightPx >= 105
                                          ? 'line-clamp-3 whitespace-normal'
                                          : heightPx >= 75
                                          ? 'line-clamp-2 whitespace-normal'
                                          : 'truncate'
                                      }`}
                                      title={item.taskTitle}
                                    >
                                      {item.taskTitle}
                                    </h4>
                                  </div>
                                </div>
                              )}

                              <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute left-0 bottom-full mb-1.5 w-64 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50">
                                <div className="flex items-center justify-between text-xs border-b border-slate-700 pb-1.5 mb-1.5 font-bold">
                                  <span className="text-blue-300 font-extrabold">⏱️ {item.time} 開始 ({item.estimatedMinutes}分間)</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isCompleted ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                                    {isCompleted ? '✓ 完了' : isInProgress ? '⏳ 進行中' : '📅 予定'}
                                  </span>
                                </div>
                                <div className="font-black text-xs text-white leading-relaxed mb-1.5 break-words">
                                  {item.taskTitle}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                                  <span>👤 {item.patientName} ({item.room})</span>
                                  <span className="text-amber-400 font-bold">重症度: {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : timelineViewMode === 'gantt' ? (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 gap-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-extrabold text-slate-800">💡 プルダウン入力:</span>
              <span>「👇 行動を選択してください ▾」をタップして看護記録や昼休憩等の実績を選択できます。</span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-md bg-amber-100 border border-amber-300 inline-block" /> Gap</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 完了</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> 進行中</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> 予定</span>
            </div>
          </div>

          <div className="w-full max-h-[760px] overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 shadow-2xs relative">
            <div className="w-full relative flex overflow-hidden" style={{ height: `${TOTAL_GRID_HEIGHT_PX}px` }}>
              <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200 bg-slate-100 relative select-none sticky left-0 z-20 shadow-xs">
                {timelineHours.map((hour, idx) => {
                  const topPx = (idx / 10) * TOTAL_GRID_HEIGHT_PX;
                  const translateY = idx === 0 ? 'translate-y-0' : idx === timelineHours.length - 1 ? '-translate-y-full' : '-translate-y-1/2';
                  return (
                    <div
                      key={hour}
                      className={`absolute left-1 text-[10px] sm:text-[11px] font-black text-slate-700 ${translateY}`}
                      style={{ top: `${topPx}px` }}
                    >
                      <span className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300 shadow-2xs">
                        {hour}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 relative h-full bg-white">
                {timelineHours.map((hour, idx) => {
                  const topPx = (idx / 10) * TOTAL_GRID_HEIGHT_PX;
                  return (
                    <React.Fragment key={`grid-${hour}`}>
                      <div
                        className="absolute left-0 right-0 border-b border-slate-200 pointer-events-none"
                        style={{ top: `${topPx}px` }}
                      />
                      {idx < timelineHours.length - 1 && (
                        <div
                          className="absolute left-0 right-0 border-b border-dashed border-slate-100 pointer-events-none"
                          style={{ top: `${topPx + (TOTAL_GRID_HEIGHT_PX / 20)}px` }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {showGaps && scheduleGaps.map((gap) => renderGapBlock(gap))}

                <div
                  className="absolute left-0 right-0 border-b-2 border-red-500 z-20 pointer-events-none flex items-center transition-all duration-500"
                  style={{ top: `${currentTopPx}px` }}
                >
                  <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-r-md shadow-md flex items-center gap-1">
                    <span>📍</span> 現在 {currentTimeStr}
                    {simulatedTimeStr && <span className="text-[8px] opacity-90">(デモ)</span>}
                  </span>
                </div>

                {currentStaff.timeline.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const isInProgress = item.status === 'in_progress';
                  const { topPx, heightPx } = getVerticalGanttPosition(item.time, item.estimatedMinutes);

                  return (
                    <div
                      key={item.id}
                      className={`group absolute rounded-xl border-2 p-2 sm:p-2.5 transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-lg overflow-hidden cursor-pointer z-20 ${
                        isInProgress
                          ? 'bg-blue-50/95 border-blue-600 ring-2 ring-blue-300 shadow-md z-30'
                          : isCompleted
                          ? 'bg-emerald-50/90 border-emerald-400 hover:border-emerald-500'
                          : 'bg-white border-indigo-300 hover:border-indigo-400'
                      }`}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: '8px',
                        right: '8px',
                      }}
                      title={`${item.time} 開始 / 所要時間:${item.estimatedMinutes}分間 / 重症度:${item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'} / ${item.taskTitle}`}
                    >
                      {heightPx < 48 ? (
                        <div className="w-full h-full flex items-center justify-between gap-1.5 overflow-hidden pointer-events-none px-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`font-black text-[10px] px-1.5 py-0.2 rounded ${
                                isInProgress
                                  ? 'bg-blue-600 text-white font-black'
                                  : isCompleted
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-indigo-700 text-white'
                              }`}
                            >
                              {item.time}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-700 bg-white/90 px-1 py-0.2 rounded border border-slate-300 shrink-0">
                              ⏱️ {item.estimatedMinutes}分
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-slate-900 truncate flex-1 min-w-0" title={item.taskTitle}>
                            {item.taskTitle}
                          </h4>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                              item.priority === 'high'
                                ? 'text-red-700 bg-red-100 border border-red-300'
                                : item.priority === 'medium'
                                ? 'text-amber-800 bg-amber-100 border border-amber-300'
                                : 'text-blue-700 bg-blue-100 border border-blue-300'
                            }`}
                          >
                            {item.priority === 'high' ? '重症:高' : item.priority === 'medium' ? '重症:中' : '重症:低'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col justify-between overflow-hidden gap-0.5 pointer-events-none">
                          <div className="flex items-center justify-between gap-1 shrink-0 overflow-hidden w-full">
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded shrink-0 ${
                                isInProgress
                                  ? 'bg-blue-600 text-white font-black'
                                  : isCompleted
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-indigo-700 text-white'
                              }`}
                            >
                              {item.time} 開始
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                              <span className="text-xs font-extrabold text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-slate-300 truncate">
                                ⏱️ 所要 {item.estimatedMinutes}分
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  item.priority === 'high'
                                    ? 'text-red-700 bg-red-100 border border-red-300'
                                    : item.priority === 'medium'
                                    ? 'text-amber-800 bg-amber-100 border border-amber-300'
                                    : 'text-blue-700 bg-blue-100 border border-blue-300'
                                }`}
                              >
                                重症度: {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-1 flex-1 min-h-0 flex items-center overflow-hidden w-full">
                            <h4
                              className={`font-extrabold text-xs sm:text-sm text-slate-900 leading-snug w-full block ${
                                heightPx >= 105
                                  ? 'line-clamp-3 whitespace-normal'
                                  : heightPx >= 75
                                  ? 'line-clamp-2 whitespace-normal'
                                  : 'truncate'
                              }`}
                              title={item.taskTitle}
                            >
                              {item.taskTitle}
                            </h4>
                          </div>
                        </div>
                      )}

                      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute left-2 bottom-full mb-1.5 w-72 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none z-50">
                        <div className="flex items-center justify-between text-xs border-b border-slate-700 pb-1.5 mb-1.5 font-bold">
                          <span className="text-blue-300 font-extrabold">⏱️ {item.time} 開始 ({item.estimatedMinutes}分間)</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isCompleted ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                            {isCompleted ? '✓ 完了' : isInProgress ? '⏳ 進行中' : '📅 予定'}
                          </span>
                        </div>
                        <div className="font-black text-xs text-white leading-relaxed mb-1.5 break-words">
                          {item.taskTitle}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                          <span>👤 {item.patientName} ({item.room})</span>
                          <span className="text-amber-400 font-bold">重症度: {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full border border-slate-200 rounded-xl bg-white shadow-2xs overflow-x-auto max-h-[760px]">
          <table className="w-full text-left text-xs border-collapse min-w-[440px]">
            <thead className="bg-slate-100 text-slate-800 font-extrabold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap w-16">時刻</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-24">所要時間</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-32">患者</th>
                <th className="py-2.5 px-3">業務・タスク内容</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center w-20">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {currentStaff.timeline.map((item) => {
                const isCompleted = item.status === 'completed';
                const isInProgress = item.status === 'in_progress';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-blue-50/50 ${
                      isInProgress
                        ? 'bg-blue-50/90 font-bold border-l-4 border-l-blue-600'
                        : isCompleted
                        ? 'bg-slate-50/70 text-slate-500'
                        : 'bg-white'
                    }`}
                  >
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      <span
                        className={`inline-block font-black px-2 py-0.5 rounded text-[11px] ${
                          isInProgress
                            ? 'bg-blue-700 text-white shadow-sm'
                            : isCompleted
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {item.time}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap align-middle font-extrabold text-slate-900">
                      ⏱️ {item.estimatedMinutes} 分
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap align-middle">
                      <div className="text-xs font-bold text-slate-900">
                        👤 {item.patientName}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <div className="font-extrabold text-slate-900 text-xs leading-snug">
                        {item.taskTitle}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap align-middle text-center">
                      <span
                        className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isInProgress
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isCompleted ? '✓ 完了' : isInProgress ? '⏳ 進行中' : '📅 予定'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
