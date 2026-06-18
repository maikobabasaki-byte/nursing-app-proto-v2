import { useState, useEffect, useMemo } from 'react';
import TimelineSidebar from "../components/Timeline/TimelineSidebar.tsx"; 
import TimelineMain from "../components/Timeline/TimelineMain.tsx";  
import { TaskCard } from '../components/Timeline/TaskCard.tsx'; 
import type { TaskStatus } from '../types/types.ts';
import { getTaskStyles } from '../utils/taskStyles'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';

interface TimelineProps {
  selectedPatients: string[];
}

export default function Timeline({ selectedPatients }: TimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

 const handleDragEnd = (event: any) => {
  const { active, over } = event;
  
  // 1. ドロップ先がない場合は無視
  if (!over) {
    setActiveId(null);
    return;
  }

  // 2. ドラッグ移動距離が極端に短い（＝クリックに近い）場合は無視する
  const delta = event.delta;
  const wasDragged = Math.abs(delta.x) > 5 || Math.abs(delta.y) > 5;
  
  // 3. 元の場所とドロップ先が同じなら無視
  if (active.id === over.id || !wasDragged) {
    setActiveId(null);
    return;
  }
    
  handleGroupTasks(active.id, over.id);
  setActiveId(null); // ドラッグ終了後にリセット
};

  
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 💡 1. タスク同士が重なってグループ化する関数（サイドバーからの直接ドロップ対応版）
const handleGroupTasks = (draggedId: string, targetIdentifier: string) => {
  console.log("--- ドラッグ＆ドロップ開始 ---");
  console.log("ドラッグ元タスクID:", draggedId);
  console.log("ドロップ先ID/時刻:", targetIdentifier);
  

  setAllTasks((prevTasks) => {
    const draggedTask = prevTasks.find((t: any) => String(t.task_id) === String(draggedId));
    const targetTask = prevTasks.find((t: any) => String(t.task_id) === String(targetIdentifier));

    console.log("検索結果 - ドラッグ:", draggedTask, "ターゲット:", targetTask);

    if (!draggedTask) {
      console.log("エラー: ドラッグ対象が見つかりません");
      return prevTasks;
    }

    // 判定ロジックのデバッグ
    if (targetTask) {
      console.log("タイトル一致:", draggedTask.title === targetTask.title);
      console.log("時間一致:", draggedTask.display_period === targetTask.display_period);
      console.log("自分自身ではない:", draggedId !== targetIdentifier);
    } else {
      console.log("ドロップ先はタスクではなく時刻:", targetIdentifier);
    }

    // --- 【条件チェック】グループ化できるか？ ---
    // A: ターゲットがタスクであること
    // B: タイトルが同じであること
    // C: 時間(display_period)が同じであること
    // D: 自分自身ではないこと
    const isSameTitle = targetTask && draggedTask.title === targetTask.title;
    const isSameTime = targetTask && draggedTask.display_period === targetTask.display_period;
    const canGroup = isSameTitle && isSameTime && draggedId !== targetIdentifier;

    if (canGroup) {
      const targetPeriod = targetTask.display_period;

      return prevTasks.reduce((acc: any[], task: any) => {
        if (task.task_id === draggedId) return acc; // ドラッグ元を削除

        if (task.task_id === targetIdentifier) {
          if (task.isGroup) {
            // 既にグループなら子に追加
            return [...acc, { 
              ...task, 
              children: [...(task.children || []), { ...draggedTask, display_period: targetPeriod }] 
            }];
          } else {
            // 新規グループ作成
            return [...acc, {
              ...task,
              task_id: `group-${targetIdentifier}`,
              isGroup: true,
              children: [
                { ...task, display_period: targetPeriod }, 
                { ...draggedTask, display_period: targetPeriod }
              ]
            }];
          }
        }
        return [...acc, task];
      }, []);
    }

    // --- 【移動の処理】グループ化条件を満たさない場合 ---
    // targetIdentifier が「時間文字列」の場合だけ更新する
    if (!targetIdentifier.includes(':')) return prevTasks;

    return prevTasks.map((t) =>
      t.task_id === draggedId ? { ...t, display_period: targetIdentifier } : t
    );
  });
};
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

  return (
    <DndContext 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <main 
        className={`flex flex-row w-full h-full bg-gray-50 overflow-hidden select-none ${
          hasPendingTasks ? 'pb-28' : ''
        }`}
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <div className="w-60 min-w-[320px] max-w-[320px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <TimelineSidebar tasks={poolTasks || []} />
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-white">
          <TimelineMain 
            allTasks={allTasks}
            timedTasks={timedTasks || []}
            onUpdateTaskPeriod={handleUpdateTaskPeriod} 
            onUpdateTaskStatus={handleUpdateStatus}
            onGroupTasks={handleGroupTasks}    
            onUngroupTask={handleUngroupTask}    
          />
        </div>
      </main>
      <DragOverlay>
        {activeId ? (() => {
          const activeTask = allTasks.find(t => t.task_id === activeId);
          if (!activeTask) return null;
          
          // スタイルを計算する（ドラッグ中は過去判定は不要なので false）
          const { cardColorClass, borderStyle } = getTaskStyles(activeTask, () => false);

          return (
            <TaskCard 
              task={activeTask} 
              cardColorClass={cardColorClass} // ここに色情報を渡す！
              borderStyle={borderStyle}       // ここに枠線情報を渡す！
              className="shadow-2xl cursor-grabbing scale-105" 
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}