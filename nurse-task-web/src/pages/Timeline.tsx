import { useState, useEffect, useMemo } from 'react';
import TimelineSidebar from "./TimelineSidebar.tsx"; 
import TimelineMain from "./TimelineMain.tsx";   
import type { TaskStatus } from '../types/types';    

interface TimelineProps {
  selectedPatients: string[];
}

export default function Timeline({ selectedPatients }: TimelineProps) {
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
const handleGroupTasks = (draggedId: string, targetId: string) => {
  setAllTasks((prevTasks) => {
    const draggedTask = prevTasks.find((t: any) => t.task_id === draggedId);
    const targetTask = prevTasks.find((t: any) => t.task_id === targetId);

    if (!draggedTask || !targetTask) return prevTasks;

    // 🔴 修正: 優先度チェックやタイトルチェックは残しつつ、時間の不一致での即拒否を無くす
    if (
      draggedTask.title !== targetTask.title ||
      draggedTask.priority === 'high' ||
      targetTask.priority === 'high' ||
      draggedId === targetId
    ) {
      return prevTasks;
    }

    // ドロップ先の時間（例: "10:00"）をグループ全体の時間として採用する
    const targetPeriod = targetTask.display_period;

    return prevTasks.reduce((acc: any[], task: any) => {
      // ドラッグされたタスクは単体リストからは消去（グループに入るため）
      if (task.task_id === draggedId) return acc;

      if (task.task_id === targetId) {
        if (task.isGroup) {
          // すでにグループ化されているカードにドロップされた場合
          // 子要素（children）に追加するタスクの時間も同期させる
          const updatedDragged = { ...draggedTask, display_period: targetPeriod };
          return [...acc, { ...task, children: [...(task.children || []), updatedDragged] }];
        } else {
          // 通常タスク同士が新しくグループを作る場合
          // 親となるグループタスクと、中に入る子タスクすべての時間をターゲットの時間に合わせる
          const updatedTarget = { ...task, display_period: targetPeriod };
          const updatedDragged = { ...draggedTask, display_period: targetPeriod };

          return [...acc, {
            ...updatedTarget,
            task_id: `group-${targetId}`, // 一意のグループID
            isGroup: true,
            children: [updatedTarget, updatedDragged] // 両方を子要素に入れる
          }];
        }
      }
      return [...acc, task];
    }, []);
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
          timedTasks={timedTasks || []}
          onUpdateTaskPeriod={handleUpdateTaskPeriod} 
          onUpdateTaskStatus={handleUpdateStatus}
          onGroupTasks={handleGroupTasks}    
          onUngroupTask={handleUngroupTask}    
        />
      </div>
    </main>
  );
}