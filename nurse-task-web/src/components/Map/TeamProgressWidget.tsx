import React, { useMemo } from 'react';
import { useTimelineStore, type NursePin } from '../../stores/useTimelineStore';
import {
  calculateNurseProgressList,
  calculateSelectedPatientProgress,
  calculateExtendedTasksProgress,
  useCurrentTimeMinutes,
} from '../../utils/progressCalculator';

export interface TeamProgressWidgetProps {
  selectedPatients?: string[];
  className?: string;
  nurses?: NursePin[];
  compact?: boolean;
}

/**
 * 📊 計画加味型プログレスバー共有ウィジェット
 * 
 * 【スコープ仕様】
 * 1. 看護師個別バー（上部）: 選択された患者（selectedPatients）のタスクのみで個人の受け持ち件数・進捗率を計算。
 * 2. 病棟全体バー（下部）: 選択状況に関わらず病棟全体の全タスク（allTasks）で進捗率を計算。
 * 
 * 【リアルタイム同期】
 * Zustandストア (state.allTasks / state.nurses / state.selectedPatients) をReactフックで直接購読。
 * Firestore onSnapshot の更新を自動検知して全端末でリアルタイムに再描画されます。
 */
export const TeamProgressWidget: React.FC<TeamProgressWidgetProps> = ({
  selectedPatients: propSelectedPatients,
  className = '',
  nurses: propNurses,
  compact = false,
}) => {
  // 1. 1分ごとに自動更新される基準時刻フック (時間軸判定のリアルタイム化)
  const currentMinutes = useCurrentTimeMinutes(60000);

  // 2. Zustandストアからリアクティブに最新の全タスク・看護師・全看護師の受け持ち患者割り当てを取得
  const allTasks = useTimelineStore((state) => state.allTasks);
  const storeNurses = useTimelineStore((state) => state.nurses);
  const storeSelectedPatients = useTimelineStore((state) => state.selectedPatients);
  const nurseAssignments = useTimelineStore((state) => state.nurseAssignments);

  // 3. props または Zustandストア / sessionStorage から selectedPatients を優先判定
  const rawSelectedPatients = useMemo(() => {
    if (propSelectedPatients && propSelectedPatients.length > 0) {
      return propSelectedPatients;
    }
    if (storeSelectedPatients && storeSelectedPatients.length > 0) {
      return storeSelectedPatients;
    }
    try {
      const saved = sessionStorage.getItem('selectedPatients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('selectedPatients parse error:', e);
    }
    return [];
  }, [propSelectedPatients, storeSelectedPatients]);

  // 💡 患者ID（文字列）の配列へ完全正規化
  const selectedPatientIds = useMemo(() => {
    if (!rawSelectedPatients || !Array.isArray(rawSelectedPatients)) return [];
    return rawSelectedPatients
      .map((p: any) => {
        if (!p) return '';
        if (typeof p === 'object' && p !== null) {
          return String(p.patient_id || p.id || p.room_id || '').trim();
        }
        return String(p).trim();
      })
      .filter((id: string) => id !== '');
  }, [rawSelectedPatients]);

  const activeNurses = propNurses && propNurses.length > 0 ? propNurses : storeNurses;

  // 4. リーダー権限（is_leader === true）を除外したメンバー看護師一覧を抽出
  const memberNurses = useMemo(() => {
    return activeNurses.filter((n) => !n.is_leader);
  }, [activeNurses]);

  // 5. 【プランB】各看護師のリアルタイム選択患者（nurseAssignments）に基づき全員の進捗バーを同期計算
  const nurseProgressList = useMemo(() => {
    return calculateNurseProgressList(memberNurses, allTasks, nurseAssignments, currentMinutes);
  }, [memberNurses, allTasks, nurseAssignments, currentMinutes]);

  // 6. 【B: 下部】病棟全体の進捗バー：選択患者に関わらず病棟全体の全タスク（allTasks）で集計
  const overallProgress = useMemo(() => {
    return calculateExtendedTasksProgress(allTasks, undefined, currentMinutes);
  }, [allTasks, currentMinutes]);

  // 💡 【詳細診断ログ】データの型・要素数・時刻の値をコンソールに明瞭に出力
  console.group("🔍 [TeamProgressWidget レンダリング診断ログ]");
  console.log("1. 選択患者データ (SelectedPatients):", {
    propSelectedPatients,
    storeSelectedPatients,
    rawSelectedPatients,
    rawLength: rawSelectedPatients?.length || 0,
    firstRawElement: rawSelectedPatients?.[0],
    firstRawElementTypeof: typeof rawSelectedPatients?.[0],
  });
  console.log("2. ID正規化後データ (Normalized SelectedPatientIds):", {
    selectedPatientIds,
    length: selectedPatientIds?.length || 0,
    firstElement: selectedPatientIds?.[0],
    firstElementTypeof: typeof selectedPatientIds?.[0],
  });
  console.log("3. 全タスク & 基準時刻 (Tasks & Minutes):", {
    allTasksCount: allTasks?.length || 0,
    firstTaskPatientId: allTasks?.[0]?.patient_id,
    firstTaskRoomId: allTasks?.[0]?.room_id,
    currentMinutes,
    isCurrentMinutesNaN: Number.isNaN(currentMinutes),
  });
  console.log("4. 進捗率計算結果 (Nurse Progress Breakdown):", {
    memberNursesCount: memberNurses?.length || 0,
    nurseProgressListCount: nurseProgressList?.length || 0,
    breakdown: nurseProgressList?.map((n) => `${n.nurse_name} (${n.team}): 受け持ち${n.totalCount}件 (${n.progressPercent}%)`),
  });
  console.groupEnd();

  return (
    <div
      style={{
        width: compact ? '100%' : '250px',
        flexShrink: 0,
        backgroundColor: '#f8fafc',
        padding: '16px',
        borderLeft: compact ? 'none' : '1px solid #e2e8f0',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      className={`flex flex-col gap-4 font-sans animate-fade-in ${className}`}
    >
      <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
            <span>🩺 看護師別 計画進捗</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5">
            {selectedPatientIds.length > 0
              ? `選択患者 (${selectedPatientIds.length}名) 限定集計`
              : '患者未選択'}
          </p>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
          リアルタイム同期
        </span>
      </div>

      {/* 看護師ごとの個別プログレスバー一覧 (選択患者タスク限定) */}
      <div className="flex flex-col gap-2.5">
        {selectedPatientIds.length === 0 ? (
          <div className="text-center py-6 px-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-bold">患者が選択されていません</p>
            <p className="text-[10px] text-slate-400 mt-1">患者選択画面で担当患者を選択してください</p>
          </div>
        ) : (
          nurseProgressList.map((np) => (
            <div
              key={`nurse-progress-${np.nurse_id || np.nurse_name}`}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-3 shadow-2xs transition-all flex flex-col gap-1.5"
            >
              {/* 看護師名 ＆ チームバッジ ＆ 進捗率 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: np.color || '#6366f1' }}
                  />
                  <span className="font-extrabold text-xs text-slate-900 truncate max-w-[100px]">
                    {np.nurse_name}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    {np.team || 'Aチーム'}
                  </span>
                </div>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    np.totalCount === 0
                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                      : np.progressPercent === 100
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : np.progressPercent >= 50
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {np.totalCount === 0 ? '0%' : `${np.progressPercent}%`}
                </span>
              </div>

              {/* 個別プログレスバー */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    np.progressPercent === 100
                      ? 'bg-emerald-500'
                      : np.progressPercent >= 50
                      ? 'bg-indigo-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${np.progressPercent}%` }}
                />
              </div>

              {/* 受け持ち件数 / 完了件数 */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>受け持ち: {np.totalCount}件</span>
                <span>完了: {np.overallCompletedCount} / {np.totalCount}件</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 病棟全体の全タスク計画進捗サマリー (B: 病棟全タスク対象) */}
      <div className="mt-2 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-3 shadow-sm flex flex-col gap-2 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="font-black text-xs text-slate-200">🏥 病棟全体 計画進捗</span>
          <span className="text-xs font-black text-emerald-400">{overallProgress.progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${overallProgress.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
          <span>病棟全タスク: {overallProgress.totalCount}件</span>
          <span>完了: {overallProgress.overallCompletedCount}件</span>
        </div>
      </div>
    </div>
  );
};

export default TeamProgressWidget;
