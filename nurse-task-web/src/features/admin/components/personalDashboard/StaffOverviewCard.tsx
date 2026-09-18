import React from 'react';
import type { StaffProfile } from '../../types/personalDashboard';

interface StaffOverviewCardProps {
  currentStaff: StaffProfile;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export const StaffOverviewCard: React.FC<StaffOverviewCardProps> = ({
  currentStaff,
  completedCount,
  totalCount,
  progressPercent,
}) => {
  return (
    <section className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-2xl shadow-sm">
          {currentStaff.user.avatarEmoji}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg lg:text-xl font-extrabold text-slate-900">
              {currentStaff.user.name}
            </h2>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">
              {currentStaff.user.rank}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            配属: {currentStaff.user.ward} | ID: {currentStaff.user.id}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
        <div className="text-right">
          <span className="text-xs font-bold text-slate-500 block">本日のタスク進捗</span>
          <span className="text-base lg:text-lg font-black text-slate-900">
            {completedCount} <span className="text-xs text-slate-500 font-bold">/ {totalCount} 件完了</span>
          </span>
        </div>

        <div className="w-28 bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          {progressPercent}%
        </span>
      </div>
    </section>
  );
};
