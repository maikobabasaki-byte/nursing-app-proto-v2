import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import { MemoCell } from '../components/Timeline/MemoCell.tsx';
import type { TaskStatus } from '../types/types.ts';
import { getTaskStyles } from '../utils/taskStyles'
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
  const handleDragStart = (event: any) => {
    console.log("🔥 DndContext: ドラッグ開始検知！", event.active.id);
    setActiveId(event.active.id);
  };
  const handleDragEnd = (event: any) => {
    console.log("🏁 DndContext: ドラッグ終了検知！", event);
  const { active, over } = event;
  console.log("ドロップ先情報:", over ? over.id : "null (背景にドロップ)");
  console.log("ドラッグ元ID:", active.id);
  if (!over) {
    setActiveId(null);
    return;
  }

  const draggedId = String(active.id);
  const overId = String(over.id);

  // 🚀 【重要】「memo-」というワードで完全に世界を分ける！
  // 1. メモの操作なら、ここで全ての処理を完結させて外に出さない
  if (draggedId.startsWith('memo-')) {
    if (overId.startsWith('memo-drop-')) {
      const targetTime = overId.replace('memo-drop-', '');
      setMemos(prev => prev.map(m => m.id === draggedId ? { ...m, time: targetTime } : m));
    } else if (overId.includes(':')) {
      setMemos(prev => prev.map(m => m.id === draggedId ? { ...m, time: overId } : m));
    }
    setActiveId(null);
    return; // 🛑 ここで終了！タスク側のロジックには絶対に到達させない
  }

  // ─── 以下は既存のタスクカード用の処理（そのまま下に残す） ───
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

  console.log("グループ化関数へ送る ID:", active.id, over.id);
  handleGroupTasks(active.id, over.id);
  setActiveId(null);
};

  
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [memos, setMemos] = useState<any[]>([]);

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

  const [groupingMode, setGroupingMode] = useState<string | null>(null);

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

// ⭕ 【安全版】グループ化のロジック（エラーガード付き）
const performGroupingLogic = (prevTasks: any[], draggedId: string, targetId: string) => {
  const draggedTask = prevTasks.find((t: any) => String(t.task_id) === String(draggedId));
  const targetTask = prevTasks.find((t: any) => String(t.task_id) === String(targetId));

  // どちらかのタスクが見つからなければそのまま返す（エラー防止）
  if (!draggedTask || !targetTask) return prevTasks;

  const targetPeriod = targetTask.display_period;

  // ドラッグされたタスクを「子要素」の形に変形
  const childDragged = { ...draggedTask, display_period: targetPeriod, isChild: true };

  // 1. まず、ドラッグされたタスクを全体リストから除外する
  const filteredTasks = prevTasks.filter((t: any) => String(t.task_id) !== String(draggedId));

  // 2. 残ったリストを書き換える
  return filteredTasks.map((task: any) => {
    if (String(task.task_id) !== String(targetId)) return task;

    // ターゲットがすでにグループだった場合
    if (task.isGroup) {
      return {
        ...task,
        children: [...(task.children || []), childDragged]
      };
    }

    // ターゲットが通常の単体タスクだった場合（新しくグループを作る）
    const childTarget = { ...task, display_period: targetPeriod, isChild: true };
    return {
      ...task,
      task_id: `group-${targetId}-${Date.now()}`,
      isGroup: true,
      children: [childTarget, childDragged]
    };
  });
};

// ⭕ 修正版：グループ化モードを最優先する分岐関数
const handleGroupTasks = useCallback((draggedId: string, targetIdentifier: string): void => {
  if (!draggedId || !targetIdentifier) return;

  setAllTasks((prevTasks: any[]) => {
    // 🔥 【超重要】もしグループ化モード（誰かを選択中）の場合の処理
    if (groupingMode) {
      if (String(draggedId) === String(groupingMode)) return prevTasks;

      const realTargetId = groupingMode;
      
      // 🔥 【ここを追加！】
      // もしターゲット（今選択中）がまだグループ化されていない単体タスクなら、
      // 次に生成される新しいグループID（group-ターゲットID-timestamp）を先読みして、モードを継続させる！
      const targetTask = prevTasks.find(t => String(t.task_id) === String(realTargetId));
        if (targetTask && !targetTask.isGroup) {
          // 生成されるIDの形式を合わせて先回りしてセットする
          // ※performGroupingLogic内の `group-${targetId}-` の生成ルールに合わせます
          // ただし、Date.now() のズレを防ぐため、一番確実なのは一瞬後に最新のグループIDを追いかけることです
          setTimeout(() => {
            setAllTasks(currentTasks => {
              const latestGroup = currentTasks.find(t => t.isGroup && String(t.task_id).startsWith(`group-${realTargetId}`));
              if (latestGroup) setGroupingMode(latestGroup.task_id);
              return currentTasks;
            });
          }, 0);
        }

        return performGroupingLogic(prevTasks, draggedId, realTargetId);
      }

    // ─── 以下は通常モード（groupingMode が null）のときの挙動 ───

    // タイムラインの「時間枠（xx:xx）」にドロップされた場合（通常移動）
    if (String(targetIdentifier).includes(':')) {
      return prevTasks.map(t =>
        String(t.task_id) === String(draggedId) ? { ...t, display_period: targetIdentifier } : t
      );
    }

    // 他の「タスクカード」の上にドロップされた場合（通常時のグループ化）
    const targetTask = prevTasks.find(t => String(t.task_id) === String(targetIdentifier));
    if (targetTask) {
      return performGroupingLogic(prevTasks, draggedId, targetIdentifier);
    }

    return prevTasks;
  });
}, [groupingMode, performGroupingLogic]); // 💡 groupingMode を監視対象に加える
  // 💡 2. グループから特定のタスクを外してタイムラインに戻す関数（型エラー修正版）
  const handleUngroupTask = (groupId: string, childTaskId: string, currentPeriod: string) => {
    setAllTasks((prevTasks) => {
      // ✨ t: any を指定
      const groupTask = prevTasks.find((t: any) => t.task_id === groupId);
      if (!groupTask || !groupTask.children) return prevTasks;

      // ✨ ここも t: any を指定
      const extractedTask = groupTask.children.find((t: any) => t.task_id === childTaskId);
      const remainingChildren = groupTask.children.filter((t: any) => t.task_id !== childTaskId);

      if (!extractedTask) return prevTasks;
      
      const updatedExtractedTask = { ...extractedTask, display_period: currentPeriod };

      return prevTasks.reduce((acc: any[], task: any) => {
        if (task.task_id === groupId) {
          if (remainingChildren.length === 1) {
            return [...acc, { ...remainingChildren[0], display_period: currentPeriod }];
          } else {
            return [...acc, { ...task, children: remainingChildren }];
          }
        }
        return [...acc, task];
      }, [updatedExtractedTask]); 
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  }

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
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}