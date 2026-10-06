import { useState, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import { getTaskStyles } from '../../../utils/taskStyles.ts';
import { handleCardClick } from '../../../utils/taskLogic.ts';
import { useTimelineDnd } from '../../../hooks/useTimelineDnd';
import { useTimelineStore } from '../../../stores/useTimelineStore';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface TimelineProps {
  selectedPatients: string[];
}

// 🎓 新人IDから表示名へのマッピング
const MENTEE_NAME_MAP: Record<string, string> = {
  'nurse05': '田中 結衣 (1年目)',
  'n002': '田中 結衣 (1年目)',
  'nurse02': '佐藤 看護師 (1年目)',
  'n003': '佐藤 看護師 (1年目)',
  'nurse03': '鈴木 看護師 (2年目)',
  'n004': '鈴木 看護師 (2年目)',
  'nurse04': '高橋 看護師 (1年目)',
  'n005': '高橋 看護師 (1年目)',
};

export default function Timeline({ selectedPatients }: TimelineProps) {
  // 1. カスタムフックからドラッグ&ドロップの制御機能や基本状態を取得
  const {
    loading,
    activeId,
    sensors,
    customCollisionDetection,
    handleDragStart,
    handleDragEnd,
  } = useTimelineDnd({ selectedPatients });

  // 🎯 2. Zustand ストアからデータを取得
  const storeAllTasks = useTimelineStore((state) => state.allTasks);
  const storeMemos = useTimelineStore((state) => state.memos);
  const handleStartGrouping = useTimelineStore((state) => state.handleStartGrouping);

  // 🎓 3. Zustand から OJT 設定 (isOjtMode, menteeId) を読み取り
  const isOjtMode = useTimelineStore((state) => state.isOjtMode);
  const menteeId = useTimelineStore((state) => state.menteeId);

  // 🎓 新人タイムライン列の折りたたみ（最小化）ローカル状態
  const [isMenteeCollapsed, setIsMenteeCollapsed] = useState<boolean>(false);

  // 🎓 指導者列 vs 新列の横幅比率（パーセント: 25% 〜 75%）
  const [mentorWidthPercent, setMentorWidthPercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ojt_mentor_width_percent');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 25 && parsed <= 75) return parsed;
      }
    }
    return 50;
  });

  const pairContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingResizer = useRef(false);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingResizer.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingResizer.current || !pairContainerRef.current) return;
      const rect = pairContainerRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      let newPercent = (offsetX / rect.width) * 100;
      if (newPercent < 25) newPercent = 25;
      if (newPercent > 75) newPercent = 75;
      setMentorWidthPercent(Math.round(newPercent));
    };

    const onMouseUp = () => {
      isDraggingResizer.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setMentorWidthPercent((latest) => {
        localStorage.setItem('ojt_mentor_width_percent', String(latest));
        return latest;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 読み込み中ならローディング画面を表示
  if (loading) {
    return <div className="flex w-full h-full justify-center items-center font-bold text-gray-500">データを読み込み中...</div>;
  }

  const isMobile = useIsMobile();

  // 🌱 OJT・ペア表示モードの判定
  const isPairModeActive = Boolean(isOjtMode && menteeId);
  const menteeName = menteeId ? (MENTEE_NAME_MAP[menteeId] || `新人看護師 (${menteeId})`) : '新人看護師';

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0.1, y: 0.15 }, acceleration: 10 }}
    >
      <div 
        className="flex flex-col md:flex-row flex-1 min-h-0 w-full bg-gray-50 overflow-hidden select-none"
      >
        {/* 💻 PC版（!isMobile）でのみ左サイドバーをDOMツリーにマウント */}
        {!isMobile && (
          <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 min-h-0 overflow-hidden">
            <TimelineSidebar 
              selectedPatients={selectedPatients}
            />
          </div>
        )}

        {/* 🎯 【画面レイアウトの動的分岐】 */}
        {isPairModeActive ? (
          /* 🎓 【分岐 1】OJT画面共有モード ON かつ 担当新人設定済み：ペア画面（並列分割表示） */
          <div 
            ref={pairContainerRef}
            className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col md:flex-row gap-2 md:gap-2.5 p-2 bg-slate-100/90 transition-all"
          >
            {/* 1. 自分のタイムライン列 (ドラッグまたはプリセットボタンで自由な比率に変更可能) */}
            <div 
              className="flex flex-col min-w-0 min-h-0 bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden transition-all"
              style={{
                flex: isMenteeCollapsed || isMobile ? '1 1 100%' : `0 0 ${mentorWidthPercent}%`,
                maxWidth: isMenteeCollapsed || isMobile ? '100%' : `${mentorWidthPercent}%`,
              }}
            >
              <div className="bg-indigo-900 text-white px-3 py-2 flex items-center justify-between text-xs font-black shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <span>自分のタイムライン（指導者）</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {!isMenteeCollapsed && !isMobile && (
                    <div className="flex items-center gap-1 bg-indigo-950/70 p-0.5 rounded-lg border border-indigo-700/60 text-[10px]">
                      <span className="text-indigo-300 font-normal px-1">比率:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMentorWidthPercent(50);
                          localStorage.setItem('ojt_mentor_width_percent', '50');
                        }}
                        className={`px-1.5 py-0.5 rounded font-black cursor-pointer border-none transition-colors ${
                          mentorWidthPercent === 50 ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:text-white bg-transparent'
                        }`}
                        title="指導者 50% : 新人 50%"
                      >
                        5:5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMentorWidthPercent(70);
                          localStorage.setItem('ojt_mentor_width_percent', '70');
                        }}
                        className={`px-1.5 py-0.5 rounded font-black cursor-pointer border-none transition-colors ${
                          mentorWidthPercent === 70 ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:text-white bg-transparent'
                        }`}
                        title="指導者 70% : 新人 30%"
                      >
                        7:3
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMentorWidthPercent(30);
                          localStorage.setItem('ojt_mentor_width_percent', '30');
                        }}
                        className={`px-1.5 py-0.5 rounded font-black cursor-pointer border-none transition-colors ${
                          mentorWidthPercent === 30 ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:text-white bg-transparent'
                        }`}
                        title="指導者 30% : 新人 70%"
                      >
                        3:7
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] bg-indigo-700 text-indigo-100 px-2 py-0.5 rounded-full font-bold">
                    指導者メイン
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <TimelineMain selectedPatients={selectedPatients} />
              </div>
            </div>

            {/* ↕️ 可変区切りバー（マウスドラッグで列幅を直感的に変更） */}
            {!isMenteeCollapsed && !isMobile && (
              <div
                onMouseDown={handleMouseDownResizer}
                className="hidden md:flex flex-col items-center justify-center w-2.5 hover:w-3.5 bg-slate-200 hover:bg-indigo-400 active:bg-indigo-600 rounded-full cursor-col-resize transition-all shrink-0 group select-none shadow-2xs my-1"
                title="ドラッグして左右の幅を自由に変更"
              >
                <div className="w-1 h-8 bg-slate-400 group-hover:bg-white rounded-full transition-colors" />
              </div>
            )}

            {/* 2. 担当新人のタイムライン列（最小化/展開の切替対応） */}
            {isMenteeCollapsed ? (
              /* 📦 【最小化時】バー全体が1つのボタンとして機能するウルトラシンプル設計 */
              <button
                type="button"
                onClick={() => setIsMenteeCollapsed(false)}
                className="w-full md:w-12 shrink-0 bg-emerald-50 hover:bg-emerald-100/90 rounded-2xl border-2 border-emerald-400/80 shadow-xs flex flex-row md:flex-col items-center justify-between p-2.5 transition-all cursor-pointer group border-none"
                title="タップして新人のタイムラインを展開"
              >
                <div className="flex flex-row md:flex-col items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform shadow-2xs">
                    ▶
                  </span>
                  <span className="text-base">🌱</span>
                  <span className="text-xs font-black text-emerald-950 tracking-wider md:writing-mode-vertical-rl">
                    {menteeName}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded-md">
                  展開
                </span>
              </button>
            ) : (
              /* 🎓 【通常展開時】 */
              <div 
                className="flex-1 flex flex-col min-w-0 min-h-0 bg-emerald-50/40 rounded-2xl border-2 border-emerald-400 shadow-md overflow-hidden animate-fade-in transition-all"
                style={{
                  flex: isMobile ? '1 1 100%' : `1 1 ${100 - mentorWidthPercent}%`,
                  maxWidth: isMobile ? '100%' : `${100 - mentorWidthPercent}%`,
                }}
              >
                {/* 新人列専用の上部ヘッダー */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-3 py-2 flex items-center justify-between text-xs font-black shrink-0 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base animate-bounce flex-shrink-0">🌱</span>
                    <span className="text-xs font-black tracking-wide truncate">
                      {menteeName} さんのタスク
                    </span>
                  </div>

                  {/* 最小化ボタン */}
                  <button
                    type="button"
                    onClick={() => setIsMenteeCollapsed(true)}
                    className="!bg-emerald-800/80 hover:!bg-emerald-900 !text-white !text-xs !font-extrabold !px-2.5 !py-1 !rounded-lg !border !border-emerald-500 shadow-2xs transition-all cursor-pointer flex items-center gap-1 flex-shrink-0"
                    title="新人の列を折りたたんで自分の画面を広げる"
                  >
                    <span>◀ 最小化</span>
                  </button>
                </div>

                {/* 新人タイムラインエリア */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-emerald-50/20">
                  <TimelineMain 
                    selectedPatients={selectedPatients} 
                    targetNurseId={menteeId || 'n002'} 
                    isMenteeView={true} 
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 👤 【通常モード】OJT画面共有モード OFF または 新人未選択：従来のシングルフル画面表示 */
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-white flex flex-col">
            <TimelineMain selectedPatients={selectedPatients} />
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          if (String(activeId).startsWith('memo-')) {
            const pureActiveId = String(activeId).replace('memo-', '');
            const activeMemo = storeMemos.find(m => String(m.id) === pureActiveId); 
            if (!activeMemo) return null;
            return (
              <div className="w-48 shadow-2xl scale-105 opacity-95 cursor-grabbing">
                <MemoCell memo={activeMemo} isOverlay={true} />
              </div>
            );
          }

          const activeTask = storeAllTasks.find(t => t.task_id === activeId);
          if (!activeTask) return null;
          
          const { cardColorClass, borderStyle } = getTaskStyles(activeTask, () => false);

          return (
            <TaskCard 
              task={activeTask} 
              onStartGrouping={handleStartGrouping}
              cardColorClass={cardColorClass} 
              borderStyle={borderStyle}      
              className="shadow-2xl cursor-grabbing scale-105" 
              onClick={() => handleCardClick(activeTask)}
              isOverlay={true}
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}