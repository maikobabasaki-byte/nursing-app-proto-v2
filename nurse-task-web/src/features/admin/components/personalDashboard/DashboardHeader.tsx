import React from 'react';
import type { UserRoleInfo, StaffProfile } from '../../types/personalDashboard';
import { getJSTDateString } from '../../../../utils/dateUtils';
import { useTimelineStore } from '../../../../stores/useTimelineStore';
import { getStaffCandidates } from '../../../../utils/userUtils';

interface DashboardHeaderProps {
  currentUser: UserRoleInfo;
  setTargetUserId: (id: string) => void;
  effectiveTargetId: string;
  currentStaff: StaffProfile;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  showOjtSection?: boolean;
  setShowOjtSection?: (show: boolean) => void;
  ojtFilterMode?: 'all' | 'personal' | 'ojt';
  setOjtFilterMode?: (mode: 'all' | 'personal' | 'ojt') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentUser,
  setTargetUserId,
  effectiveTargetId,
  currentStaff,
  selectedDate,
  setSelectedDate,
  showOjtSection = true,
  setShowOjtSection,
  ojtFilterMode = 'all',
  setOjtFilterMode,
}) => {
  const nurseMaster = useTimelineStore((state) => state.nurseMaster);
  const nurses = useTimelineStore((state) => state.nurses);
  const storeUser = useTimelineStore((state) => state.currentUser);

  const staffCandidates = getStaffCandidates(nurseMaster, nurses, storeUser);

  const handlePrevDay = () => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() - 1);
    setSelectedDate(getJSTDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() + 1);
    setSelectedDate(getJSTDateString(d));
  };

  const handleToday = () => {
    setSelectedDate(getJSTDateString());
  };

  return (
    <header className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
            個人パフォーマンス & タイムラインダッシュボード
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold text-slate-600">
            ログイン中: <strong className="text-slate-900">{currentUser.name}</strong>
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded ${
              currentUser.role === 'admin'
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-blue-100 text-blue-900 border border-blue-300'
            }`}
          >
            {currentUser.role === 'admin' ? '👑 師長 (管理者権限)' : '🩺 一般看護師'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 📅 日付選択＆過去履歴切り替えコントロール */}
        <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 p-1 rounded-xl shadow-2xs text-xs">
          <span className="text-[10px] font-extrabold text-indigo-900 px-1.5 flex items-center gap-1">
            <span>📅</span> 日付指定:
          </span>
          <button
            type="button"
            onClick={handlePrevDay}
            className="!px-2 !py-0.5 !bg-white hover:!bg-indigo-100 !text-indigo-900 !font-bold !rounded-md !border !border-indigo-300 !shadow-2xs !cursor-pointer"
            title="前日へ"
          >
            ◀
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="!bg-white !text-indigo-950 !font-black !text-xs !px-2 !py-0.5 !rounded-md !border !border-indigo-300 focus:!outline-none focus:!ring-1 focus:!ring-indigo-500 !cursor-pointer !shadow-2xs"
          />
          <button
            type="button"
            onClick={handleNextDay}
            className="!px-2 !py-0.5 !bg-white hover:!bg-indigo-100 !text-indigo-900 !font-bold !rounded-md !border !border-indigo-300 !shadow-2xs !cursor-pointer"
            title="翌日へ"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="!px-2 !py-0.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white !font-black !text-[11px] !rounded-md !shadow-2xs !cursor-pointer"
            title="本日に戻る"
          >
            今日
          </button>
        </div>

        {currentUser.role === 'admin' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-sm animate-fade-in">
              <label htmlFor="staff-select" className="text-xs font-extrabold text-blue-950 flex items-center gap-1 shrink-0">
                <span>🔍</span> 対象スタッフ選択:
              </label>
              <div className="relative inline-flex items-center max-w-full">
                <select
                  id="staff-select"
                  value={effectiveTargetId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  style={{ paddingRight: '36px' }}
                  className="!appearance-none !bg-white !text-slate-900 !font-extrabold !text-xs !pl-3 !py-1.5 !rounded-lg !border !border-blue-300 focus:!outline-none focus:!ring-2 focus:!ring-blue-500 hover:!border-blue-400 !cursor-pointer !shadow-sm !transition-all !truncate"
                >
                  {staffCandidates.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.roleLabel})
                    </option>
                  ))}
                </select>
                <svg
                  className="w-4 h-4 text-blue-600 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* 👑 管理者権限：OJT指導連携セクション表示切り替え & セクション切替フィルター */}
            {setShowOjtSection && (
              <button
                type="button"
                onClick={() => setShowOjtSection(!showOjtSection)}
                className={`!px-3 !py-1.5 !rounded-xl !text-xs !font-extrabold !flex !items-center !gap-1.5 !border transition-all !cursor-pointer shadow-xs ${
                  showOjtSection
                    ? '!bg-emerald-600 !text-white !border-emerald-700 shadow-md ring-2 ring-emerald-200'
                    : '!bg-white !text-slate-700 !border-slate-300 hover:!bg-slate-100'
                }`}
                title="管理者権限：OJT指導連携セクションの表示/非表示を切り替え"
              >
                <span>🌱 OJT指導:</span>
                <span className="font-black">{showOjtSection ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {setOjtFilterMode && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-700 px-1.5 flex items-center gap-1 shrink-0">
                  <span>📂</span> 表示項目:
                </span>
                <button
                  type="button"
                  onClick={() => setOjtFilterMode('all')}
                  className={`!px-2.5 !py-1 !rounded-lg !text-[11px] !font-extrabold transition-all cursor-pointer ${
                    ojtFilterMode === 'all'
                      ? '!bg-indigo-600 !text-white shadow-xs'
                      : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
                  }`}
                  title="全セクションを表示"
                >
                  すべて
                </button>
                <button
                  type="button"
                  onClick={() => setOjtFilterMode('personal')}
                  className={`!px-2.5 !py-1 !rounded-lg !text-[11px] !font-extrabold transition-all cursor-pointer ${
                    ojtFilterMode === 'personal'
                      ? '!bg-purple-600 !text-white shadow-xs'
                      : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
                  }`}
                  title="本人の評価（タイムライン・振り返り・ラダー）のみ表示"
                >
                  👤 本人の評価のみ
                </button>
                <button
                  type="button"
                  onClick={() => setOjtFilterMode('ojt')}
                  className={`!px-2.5 !py-1 !rounded-lg !text-[11px] !font-extrabold transition-all cursor-pointer ${
                    ojtFilterMode === 'ojt'
                      ? '!bg-emerald-600 !text-white shadow-xs'
                      : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
                  }`}
                  title="指導対象・新人の評価（OJTフィードバック・技術習熟度）のみ表示"
                >
                  🌱 OJT・指導評価のみ
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-900 shadow-xs">
            <span>🔒</span> 対象スタッフ: <strong>{currentStaff.user.name}</strong> （閲覧固定中）
          </div>
        )}
      </div>
    </header>
  );
};
