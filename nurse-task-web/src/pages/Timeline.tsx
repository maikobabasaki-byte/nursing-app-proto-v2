import { useState, useEffect,useMemo } from 'react';
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
            initial_period: task.display_period // 変更前の時間を保持するフィールドを追加
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

  if (loading) {
    return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  }

  // タスクのステータスを更新する関数を新しく定義する
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
  setAllTasks(prev => 
    prev.map(task => 
      task.task_id === taskId 
        ? { ...task, status: newStatus } // 該当するタスクを上書き
        : task // それ以外はそのまま
    )
  );
};
  return (
    <main 
      className="flex flex-row w-full h-full bg-gray-50 overflow-hidden"
      style={{ display: 'flex', flexDirection: 'row' }}
    >
      
      {/* 👤 左側：タスクプール（横幅320px固定、縦スクロール） */}
      <div className="w-60 min-w-[320px] max-w-[320px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <TimelineSidebar tasks={poolTasks || []} />
      </div>

      {/* 🗓️ 右側：タイムラインメイン（残りの幅を全部使い、縦横スクロール） */}
      <div className="flex-1 min-w-0 overflow-auto bg-white">
        <TimelineMain timedTasks={timedTasks || []}
          onUpdateTaskPeriod={handleUpdateTaskPeriod} 
          onUpdateTaskStatus={handleUpdateStatus}
        />
      </div>

    </main>
  );
}