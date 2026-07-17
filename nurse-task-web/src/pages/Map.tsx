import React, { useState, useEffect } from 'react';
import WardMap from '../components/Map/WardMap';
import type { Patient, Room, Facility } from '../components/Map/WardMap';
import { useTimelineStore } from '../stores/useTimelineStore'; // 💡 作成したZustandストアをインポート

// 💡 左側のSOSパネル（LeftPanel）：ストアから切り取ってきたSOSタスクを流し込みます
const LeftPanel: React.FC<{ sosTasks: any[] }> = ({ sosTasks }) => (
  <div style={{ width: '220px', flexShrink: 0, backgroundColor: '#ffebee', padding: '15px', borderRight: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
    <h3 style={{ fontWeight: 'bold', marginBottom: '15px', color: '#c62828', display: 'flex', alignItems: 'center', gap: '5px' }}>
      🚨 緊急アラート
    </h3>
    
    {sosTasks.length === 0 ? (
      <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
        現在、SOSはありません。<br/>
        <span style={{ fontSize: '11px', color: '#999' }}>（患者名を右クリックしてSOSを発生させられます）</span>
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sosTasks.map((task) => (
          <div key={task.task_id} style={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '14px', marginBottom: '4px' }}>
              {task.room_id}号室
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              対象: {task.title}
            </div>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#f5f5f5', padding: '6px', borderRadius: '2px', lineHeight: '1.4' }}>
              ⚠️ {task.sos_reason}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const RightPanel: React.FC = () => (
  <div style={{ width: '200px', flexShrink: 0, backgroundColor: '#ffebee', padding: '20px', borderLeft: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
    <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>チーム負荷</h3>
    <p style={{ color: '#666', fontSize: '13px' }}>（リアルタイム連動）</p>
  </div>
);

// 💡 useTimelineStore から 'setTasks' も取得するように追加します
export default function MapContainer(): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 💡 Zustandストアから状態とアクションを取得（★setTasks を追加）
  const allTasks = useTimelineStore((state) => state.allTasks);
  const toggleTaskSos = useTimelineStore((state) => state.toggleTaskSos);
  const setTasks = useTimelineStore((state) => state.setTasks); // ★追加

  useEffect(() => {
    Promise.all([
      fetch('/data/patients.json').then((res) => {
        if (!res.ok) throw new Error("patients.jsonの取得失敗");
        return res.json();
      }),
      fetch('/data/rooms.json').then((res) => {
        if (!res.ok) throw new Error("rooms.jsonの取得失敗");
        return res.json();
      }),
      // 💡 ★タスクのダミーデータ（JSON）も一緒にロードする
      // (※実際のタスク用JSONファイルのパスに合わせて調整してください。例: '/data/tasks.json')
      fetch('/data/tasks.json').then((res) => {
        if (!res.ok) throw new Error("tasks.jsonの取得失敗");
        return res.json();
      })
    ])
      .then(([patientsData, roomsData, tasksData]) => {
        setPatients(patientsData);
        setRooms(roomsData.rooms || []);
        setFacilities(roomsData.facilities || []);
        
        // 💡 ★ロードしたタスクをZustandストアにセットする！
        // これで allTasks にデータが入り、右クリックの検索がヒットするようになります
        setTasks(tasksData); 
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ データ反映エラー:", err);
        setLoading(false);
      });
  }, [setTasks]); // 💡 依存配列に setTasks を追加

  // 💡 マップ上の患者が右クリックされた時のイベント
  const handlePatientRightClick = (taskId: string, patientName: string) => {
    // 💡 すでに狙ったタスクIDが引数で直接渡ってくるので、そのままストアのアクションを呼ぶだけ！
    toggleTaskSos(
      taskId,
      `緊急応援：${patientName}さんのケア中に介助が必要になりました`
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '18px', color: '#666' }}>
        病棟データを読み込み中...
      </div>
    );
  }

  // 💡 ストアのタスク全体から SOS が true になっているものだけをフィルター
  const sosTasks = allTasks.filter(task => task.is_sos === true);

  return (
    <div style={{ 
        display: 'flex', 
        width: '100vw',               /* 💡 画面の横幅いっぱいに広げる */
        height: 'calc(100vh - 120px)', /* 💡 画面の高さからヘッダー（約120px分）を引いた高さに固定 */
        backgroundColor: '#fff', 
        boxSizing: 'border-box',
        overflow: 'hidden'            /* 💡 外枠に余計なスクロールバーが出ないようにする */
      }}>
      {/* 💡 抽出したSOSタスクを流し込む */}
      <LeftPanel sosTasks={sosTasks} />
      
      <div style={{ 
          flexGrow: 1,                /* 💡 左右パネルの残りの隙間をすべてマップエリアに割り当てる */
          height: '100%',             /* 💡 高さは親（100vh - 120px）に完全に合わせる */
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',       /* 💡 縦横とも中央に配置 */
          boxSizing: 'border-box',
          overflow: 'hidden'          /* 💡 マップがコンテナからはみ出すのを防ぐ */
        }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <WardMap 
            rooms={rooms} 
            facilities={facilities} 
            patients={patients} 
            allTasks={allTasks} // 💡 これを追加！
            onPatientRightClick={handlePatientRightClick} 
          />
        </div>
      </div>
      
      <RightPanel />
    </div>
  );
}