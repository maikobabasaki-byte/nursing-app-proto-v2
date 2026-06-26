import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TimelineRow } from '../components/Timeline/TimelineRow.tsx'
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { groupTasks, ungroupTask } from '../utils/taskLogic';
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import type { TaskStatus,ExtendedTask } from '../types/types.ts';
import { getTaskStyles } from '../utils/taskStyles';
import { handleCardClick } from '../utils/taskLogic';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext, 
  DragOverlay, 
  pointerWithin,
  useSensor,    
  useSensors,  
  PointerSensor 
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface TimelineProps {
  selectedPatients: string[];
}

export default function Timeline({ selectedPatients }: TimelineProps) {
    const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // 💡 5ピクセル動かした時点で「ドラッグ開始」と確定させる
    },
  })
);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<ExtendedTask[]>([]); // 🔥 これを一番上に！
  const [memos, setMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupingMode, setGroupingMode] = useState<string | null>(null);
  const draggedTaskRef = useRef<ExtendedTask | null>(null);

  const handleGroupTasks = useCallback((draggedId: string, targetId: string) => {
    const targetTask = allTasks.find(t => String(t.task_id) === String(targetId));
    const originalDraggedTask = draggedTaskRef.current;

    setAllTasks((prev) => {
      // 💡 どちらのタスクも存在し、かつ午前・午後が違う場合はここで厳密に弾く！
      if (originalDraggedTask && targetTask) {
        const getCat = (p: string) => (p === '午前' ? 'AM' : p === '午後' ? 'PM' : 'ANY');
        const draggedCat = getCat(originalDraggedTask.display_period);
        const targetCat = getCat(targetTask.display_period);

        if (draggedCat !== 'ANY' && targetCat !== 'ANY' && draggedCat !== targetCat) {
          alert(`エラー：${originalDraggedTask.display_period}のタスクを${targetTask.display_period}のグループに入れることはできません。`);
          return prev; // 状態を更新せずにそのまま返す（混入を阻止！）
        }
      }

      // 💡 チェックを通過、または通常のドラッグなら、元の groupTasks（ID渡し）を実行
      return groupTasks(prev, draggedId, targetId);
    });
  }, [allTasks]);

  const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  // allTasks から対象を検索し、型を確定させる
  const task = allTasks.find(t => String(t.task_id) === String(active.id));
    if (task) {
      draggedTaskRef.current = task;
    }
    setActiveId(String(active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveId(null);

  if (!over || active.id === over.id) return;

  const draggedId = String(active.id);
  const overId = String(over.id);

  // 🚀 【重要】「memo-」の処理（既存のまま）
  if (draggedId.startsWith('memo-')) {
    if (overId.startsWith('memo-drop-')) {
      const targetTime = overId.replace('memo-drop-', '');
      setMemos(prev => prev.map(m => m.id === draggedId ? { ...m, time: targetTime } : m));
    } else if (overId.includes(':')) {
      setMemos(prev => prev.map(m => m.id === draggedId ? { ...m, time: overId } : m));
    }
    setActiveId(null);
    return;
  }

  // ─── グループ内の子要素同士の並び替え処理（既存のまま） ───
  if (active.id !== over.id) {
    let isInternalSort = false;
    setAllTasks((prevTasks: any[]) => {
      return prevTasks.map((task: any) => {
        if (!task.isGroup || !task.children) return task;
        const hasActive = task.children.some((c: any) => String(c.task_id) === String(active.id));
        const hasOver = task.children.some((c: any) => String(c.task_id) === String(over.id));

        if (hasActive && hasOver) {
          isInternalSort = true;
          const oldIndex = task.children.findIndex((c: any) => String(c.task_id) === String(active.id));
          const newIndex = task.children.findIndex((c: any) => String(c.task_id) === String(over.id));
          return {
            ...task,
            children: arrayMove(task.children, oldIndex, newIndex)
          };
        }
        return task;
      });
    });

    if (isInternalSort) {
      setActiveId(null);
      return;
    }
  }

  // ─── 🚀 時間移動 or グループ化の分岐 ───
  console.log("🔥 最終ドロップ検知:", draggedId, overId);

  // 1. 時間軸のセルへの移動処理
  if (overId.includes(':')) {
    console.log(`⏰ タスク ${draggedId} を新しい時間 ${overId} へ移動します`);
    handleUpdateTaskPeriod(draggedId, overId);
    setActiveId(null);
    return;
  }

  // 2. タスク同士のグループ化処理（モードに応じた動的ガード）
  const targetTask = allTasks.find(t => String(t.task_id) === overId);
  const originalDraggedTask = draggedTaskRef.current;

  if (originalDraggedTask && targetTask) {
    
    // 💡 ターゲット（親カード）の groupType が「'patient'」の時だけ、他人の混入を弾く！
    const isPatientGroupingMode = targetTask.groupType === 'patient';

    if (isPatientGroupingMode) {
      if (originalDraggedTask.patient_id !== targetTask.patient_id) {
        console.log(`❌ 患者名グループのため拒否: ${originalDraggedTask.patient_name} !== ${targetTask.patient_name}`);
        alert(`【エラー】患者名グループ化の時は、異なる患者のタスクをまとめることはできません。`);
        setActiveId(null);
        draggedTaskRef.current = null;
        return; 
      }
    }

    // 💡 既存の「午前・午後・随時」のルーツチェック（これはタスク名グループ化でも共通ルールなら残す）
    const draggedRoot = originalDraggedTask.initial_period;
    const targetRoot = targetTask.initial_period;
    const isAny隨時 = draggedRoot?.includes('随時') || targetRoot?.includes('随時');

    if (!isAny隨時 && draggedRoot && targetRoot && draggedRoot !== targetRoot) {
      console.log(`❌ ルーツ不一致のためグループ化拒否: ${draggedRoot} !== ${targetRoot}`);
      alert(`【エラー】元の区分が異なるタスク（元の時間：${draggedRoot} と ${targetRoot}）をグループ化することはできません。`);
      setActiveId(null);
      draggedTaskRef.current = null;
      return; 
    }
  }

  // 💡 チェックを通過した場合のみグループ化を実行
  handleGroupTasks(draggedId, overId);
  setActiveId(null);
  draggedTaskRef.current = null;
};
  
  useEffect(() => {
    async function loadTimelineData() {
      try {
        const [tasksRes, patientsRes] = await Promise.all([
          fetch('/data/tasks.json'),
          fetch('/data/patients.json')
        ]);

        if (!tasksRes.ok || !patientsRes.ok) throw new Error('データ取得に失敗');

        const tasksData = await tasksRes.json();
        const patientsData = await patientsRes.json();

        const mergedTasks = tasksData.map((task: any) => {
          const targetPatient = patientsData.find((p: any) => p.patient_id === task.patient_id);
          return {
            ...task,
            patient_name: targetPatient ? targetPatient.name : '不明な患者',
            initial_period: task.display_period
          };
        });

        setAllTasks(mergedTasks);
      } catch (err) {
        console.error('タイムラインデータ読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTimelineData();
  }, []);

  const handleUpdateTaskPeriod = (taskId: string, newPeriod: string) => {
    setAllTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.task_id === taskId ? { ...task, display_period: newPeriod } : task
      )
    );
  };

  const { poolTasks, timedTasks } = useMemo(() => {
    const patientTasks = allTasks.filter(task => selectedPatients.includes(task.patient_id));
    return {
      poolTasks: patientTasks.filter(task => !task.display_period.includes(':')),
      timedTasks: patientTasks.filter(task => task.display_period.includes(':'))
    };
  }, [allTasks, selectedPatients]);

  const hasPendingTasks = timedTasks.some(task => task.status === 'pending');

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setAllTasks(prev => 
      prev.map(task => 
        task.task_id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

const handleStartGrouping = useCallback((taskId: string) => {
  console.log("🔥 親の handleStartGrouping が発火！ 押されたタスクID:", taskId);
  
  setGroupingMode(prev => {
    // 💡 もしすでに「今押されたタスク」が選択中なら、通常モードに戻す（解除）
    if (prev === taskId) {
      return null;
    }
    // 選ばれていなければ、そのタスクを選択中にする
    return taskId;
  });
}, []);

const handleUngroupTask = (groupId: string, childTaskId: string, currentPeriod: string) => {
  setAllTasks((prev) => ungroupTask(prev, groupId, childTaskId, currentPeriod));
};

  // 💡 【ここを追加】React側でメモを保存・更新する関数
const handleSaveMemo = (updatedMemo: any) => {
  setMemos((prevMemos) => {
    const exists = prevMemos.some((m) => m.id === updatedMemo.id);
    if (exists) {
      // 既存メモの更新
      return prevMemos.map((m) => (m.id === updatedMemo.id ? updatedMemo : m));
    } else {
      // 新規メモの追加
      return [...prevMemos, updatedMemo];
    }
  });
};

// 💡 【ここを追加】React側でメモを削除する関数
  const handleDeleteMemo = (memoId: string) => {
    if (confirm("このメモを削除してもよろしいですか？")) {
      setMemos((prevMemos) => prevMemos.filter((m) => m.id !== memoId));
    }
  };


  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <main 
      onMouseDownCapture={() => console.log("🔍 mainタグまでイベントが来ているか？")}
        className={`flex flex-row w-full h-full bg-gray-50 overflow-hidden select-none ${
          hasPendingTasks ? 'pb-28' : ''
        }`}
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <div className="w-fit flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <TimelineSidebar 
            tasks={poolTasks || []} 
            groupingMode={groupingMode}
            onStartGrouping={handleStartGrouping}/>
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-white">
          <TimelineMain 
            allTasks={allTasks}
            timedTasks={timedTasks}
            onUpdateTaskPeriod={handleUpdateTaskPeriod} 
            onUpdateTaskStatus={handleUpdateStatus}
            onGroupTasks={handleGroupTasks}    
            onUngroupTask={handleUngroupTask}
            groupingMode={groupingMode}
            setGroupingMode={setGroupingMode}
            onStartGrouping={handleStartGrouping}
            memos={memos}
            onSaveMemo={handleSaveMemo}
            onDeleteMemo={handleDeleteMemo}
          />
        </div>
      </main>
      <DragOverlay>
        {activeId ? (() => {
          // 💡 もしドラッグされているのが「メモ」だった場合
          if (String(activeId).startsWith('memo-')) {
            const activeMemo = memos.find(m => m.id === activeId);
            if (!activeMemo) return null;
            return (
              // ドラッグ中専用のスタイルを当てて横幅を固定する
              <div className="w-44 shadow-2xl scale-105 opacity-90 cursor-grabbing">
                <MemoCell memo={activeMemo} onEdit={() => {}} />
              </div>
            );
          }

          // ─── 以下は既存のタスクカード用の処理 ───
          const activeTask = allTasks.find(t => t.task_id === activeId);
          if (!activeTask) return null;
          
          const { cardColorClass, borderStyle } = getTaskStyles(activeTask, () => false);

          return (
            <TaskCard 
              task={activeTask} 
              onStartGrouping={handleStartGrouping}
              groupingMode={groupingMode}
              cardColorClass={cardColorClass} 
              borderStyle={borderStyle}       
              className="shadow-2xl cursor-grabbing scale-105" 
              onClick={() => handleCardClick(activeTask)}
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}