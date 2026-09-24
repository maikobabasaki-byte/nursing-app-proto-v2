import { useState, useMemo } from 'react';
import { getJSTDateString, getLoginDates } from '../../../utils/dateUtils';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { getTaskTargetDate } from '../../../utils/taskLogic';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: CalendarModalProps) {
  const allTasks = useTimelineStore((state) => state.allTasks);
  const activeDatesStore = useTimelineStore((state) => state.activeDates);

  // カレンダーの表示月管理
  const [viewYearMonth, setViewYearMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // ログイン履歴およびタスク存在日付を集計・保持
  const loginDatesSet = useMemo(() => {
    const set = new Set<string>();
    
    // 1. LocalStorageに保存されているログイン履歴
    const savedLogins = getLoginDates();
    savedLogins.forEach((d) => set.add(d));

    // 2. Zustandストアの activeDates
    if (Array.isArray(activeDatesStore)) {
      activeDatesStore.forEach((d) => set.add(d));
    }

    // 3. 全タスクの中に存在する target_date
    if (Array.isArray(allTasks)) {
      allTasks.forEach((t) => {
        const d = getTaskTargetDate(t);
        if (d) set.add(d);
      });
    }

    // 本日も確実に追加
    set.add(getJSTDateString());

    return set;
  }, [activeDatesStore, allTasks]);

  if (!isOpen) return null;

  const todayStr = getJSTDateString();

  // 月の移動処理
  const handlePrevMonth = () => {
    setViewYearMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewYearMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewYearMonth({ year: now.getFullYear(), month: now.getMonth() });
    onSelectDate(todayStr);
    onClose();
  };

  // カレンダーグリッドデータの計算
  const year = viewYearMonth.year;
  const month = viewYearMonth.month; // 0-indexed

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 (日) ~ 6 (土)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 日付マスの配列構築
  const daysArray: ({ dateStr: string; dayNum: number; isCurrentMonth: boolean } | null)[] = [];
  
  // 空白マス（前月分）
  for (let i = 0; i < startDayOfWeek; i++) {
    daysArray.push(null);
  }

  // 当月分
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = getJSTDateString(dateObj);
    daysArray.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-indigo-900 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <h3 className="font-extrabold text-base leading-tight">過去履歴カレンダー</h3>
              <p className="text-[11px] text-indigo-200">ログイン実績がある日は背景色が変化します</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-indigo-800 hover:bg-indigo-700 text-indigo-100 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 月切り替えコントロール */}
        <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
          >
            ◀ 前月
          </button>

          <span className="font-black text-sm text-indigo-950">
            {year}年 {month + 1}月
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
          >
            次月 ▶
          </button>
        </div>

        {/* 曜日表示 */}
        <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-xs font-bold border-b border-slate-100 pb-1">
          <span className="text-red-500">日</span>
          <span className="text-slate-600">月</span>
          <span className="text-slate-600">火</span>
          <span className="text-slate-600">水</span>
          <span className="text-slate-600">木</span>
          <span className="text-slate-600">金</span>
          <span className="text-blue-500">土</span>
        </div>

        {/* グリッド本体 */}
        <div className="grid grid-cols-7 gap-1.5 p-3 max-h-[320px] overflow-y-auto">
          {daysArray.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10 rounded-lg"></div>;
            }

            const { dateStr, dayNum } = cell;
            const hasLogin = loginDatesSet.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            // 背景色クラスの動的判定
            let cellStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
            
            if (hasLogin) {
              // 💡 ログイン実績・記録がある日：強調エメラルドグリーン背景！
              cellStyle = "bg-emerald-100/90 border-emerald-400 text-emerald-950 font-black hover:bg-emerald-200 shadow-2xs";
            }

            if (isSelected) {
              cellStyle += " ring-2 ring-indigo-600 border-indigo-600 shadow-sm";
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(dateStr);
                  onClose();
                }}
                className={`relative h-11 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none p-1 ${cellStyle}`}
              >
                <span className="text-xs">{dayNum}</span>

                {/* 🟩 ログイン実績ありのマーク */}
                {hasLogin && (
                  <span className="text-[9px] font-black text-emerald-700 leading-none mt-0.5 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>記録</span>
                  </span>
                )}

                {/* ⭐️ 本日バッジ */}
                {isToday && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-extrabold px-1 rounded-full shadow-2xs">
                    今日
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 凡例 & 今日ボタン Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block"></span>
              <span>ログイン・記録あり</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border-2 border-indigo-600 bg-white inline-block"></span>
              <span>選択中</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            本日に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
