import React, { useState, useEffect, useMemo } from 'react';
import WardMap from '../components/Map/WardMap';
import type { Patient, Room, Facility } from '../components/Map/WardMap';
import { useTimelineStore, type NursePin } from '../stores/useTimelineStore';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { DraggableNursePin } from '../components/Map/DraggableNursePin';
import { useUserName } from '../hooks/useUserName';

// 💡 左側のSOSパネル（LeftPanel）：タスクSOSおよび看護師SOSをリアルタイム統合表示
const LeftPanel: React.FC<{ sosTasks: any[]; sosNurses: NursePin[] }> = ({ sosTasks, sosNurses }) => (
  <div style={{ width: '220px', flexShrink: 0, backgroundColor: '#ffebee', padding: '15px', borderRight: '1px solid #e0e0e0', boxSizing: 'border-box', overflowY: 'auto' }}>
    <h3 style={{ fontWeight: 'bold', marginBottom: '15px', color: '#c62828', display: 'flex', alignItems: 'center', gap: '5px' }}>
      🚨 緊急アラート
    </h3>
    
    {sosTasks.length === 0 && sosNurses.length === 0 ? (
      <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
        現在、SOSはありません。<br/>
        <span style={{ fontSize: '11px', color: '#999' }}>（自分のピン右クリックでSOS可能）</span>
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 1. 看護師からの緊急要請 (Nurse SOS) */}
        {sosNurses.map((nurse) => (
          <div key={`nurse-sos-${nurse.nurse_id}`} style={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🩺 看護師要請</span>
              <span style={{ fontSize: '10px', backgroundColor: '#ffebee', color: '#c62828', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>緊急</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              対象: {nurse.name} さん
            </div>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#fff5f5', padding: '6px', borderRadius: '2px', lineHeight: '1.4' }}>
              ⚠️ {nurse.sos_reason || `${nurse.name}さんが緊急応援を要請しています`}
            </div>
          </div>
        ))}

        {/* 2. 患者タスクからの緊急要請 (Task SOS) */}
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


import TeamProgressWidget from '../components/Map/TeamProgressWidget';

const RightPanel: React.FC<{ nurses: NursePin[]; selectedPatients?: string[] }> = ({ nurses, selectedPatients }) => {
  return <TeamProgressWidget nurses={nurses} selectedPatients={selectedPatients} />;
};

interface MapContainerProps {
  selectedPatients?: string[];
}

export default function MapContainer({ selectedPatients }: MapContainerProps): React.JSX.Element {
  // 💡 受け持ち患者IDリスト（props または sessionStorage から安全に復元）
  const activeSelectedPatients = useMemo(() => {
    if (selectedPatients && selectedPatients.length > 0) {
      return selectedPatients;
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
  }, [selectedPatients]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeNurse, setActiveNurse] = useState<NursePin | null>(null);

  const currentUserName = useUserName();
  const myPinName = currentUserName || "ログイン看護師";
  const myPinId = `nurse-me-${myPinName}`;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 💡 Zustandストアから状態とアクションを取得
  const allTasks = useTimelineStore((state) => state.allTasks);
  const nurses = useTimelineStore((state) => state.nurses);
  const setNurses = useTimelineStore((state) => state.setNurses);
  const toggleTaskSos = useTimelineStore((state) => state.toggleTaskSos);
  const updateNursePosition = useTimelineStore((state) => state.updateNursePosition);

  // 🧠 【100%確実表示＆重複ゼロ保証】ログイン中ユーザーのピンを自他判定しつつ完全1つに統一
  // 🧠 【完全な重複排除】出勤中（is_logged_in !== false）の看護師のみ一意にフィルタリング
  const displayNurses = useMemo(() => {
    const seenKeys = new Set<string>();
    return nurses.filter((nurse) => {
      if (nurse.is_logged_in === false) {
        return false;
      }
      const key = nurse.nurse_id || nurse.name.replace(/[\s　]+/g, '');
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    });
  }, [nurses]);

  useEffect(() => {
    Promise.all([
      fetch('/data/patients.json').then((res) => {
        if (!res.ok) throw new Error("patients.jsonの取得失敗");
        return res.json();
      }),
      fetch('/data/rooms.json').then((res) => {
        if (!res.ok) throw new Error("rooms.jsonの取得失敗");
        return res.json();
      })
    ])
      .then(([patientsData, roomsData]) => {
        setPatients(patientsData);
        setRooms(roomsData.rooms || []);
        setFacilities(roomsData.facilities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ データ反映エラー:", err);
        setLoading(false);
      });
  }, []);

  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.type === 'nurse') {
      setActiveNurse(activeData.nurse as NursePin);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveNurse(null);

    const activeNurseId = String(active.id).replace('nurse-', '');
    const activeNurseObj = displayNurses.find(n => n.nurse_id === activeNurseId);

    if (!activeNurseObj) return;

    // 🧠 マップ実描画幅・高さ(px)を取得して移動量をパーセンテージに即時換算
    const container = mapContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const deltaXPercent = (delta.x / rect.width) * 100;
        const deltaYPercent = (delta.y / rect.height) * 100;

        const newXPercent = Math.min(Math.max(0, (activeNurseObj.x_percent || 50) + deltaXPercent), 92);
        const newYPercent = Math.min(Math.max(0, (activeNurseObj.y_percent || 45) + deltaYPercent), 92);

        const existsInStore = nurses.some(n => n.nurse_id === activeNurseId);
        if (!existsInStore && activeNurseId.includes('me')) {
          const myPin: NursePin = {
            nurse_id: activeNurseId,
            name: myPinName,
            role: '担当看護師(自分)',
            color: '#7c3aed',
            x_percent: newXPercent,
            y_percent: newYPercent,
          };
          setNurses([myPin, ...nurses]);
        } else {
          updateNursePosition(activeNurseId, newXPercent, newYPercent);
        }
      }
    }
  };

  // 💡 マップ上の患者が右クリックされた時のイベント
  const handlePatientRightClick = (taskId: string, patientName: string) => {
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

  // 💡 ストアのタスク全体から SOS が true になっているものをフィルター
  const sosTasks = allTasks.filter(task => task.is_sos === true);

  // 💡 ストアの看護師から SOS が true になっているものをフィルター
  const sosNurses = displayNurses.filter(nurse => nurse.is_sos === true);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ 
          display: 'flex', 
          width: '100vw',               /* 💡 画面の横幅いっぱいに広げる */
          height: 'calc(100vh - 120px)', /* 💡 画面の高さからヘッダー（約120px分）を引いた高さに固定 */
          backgroundColor: '#fff', 
          boxSizing: 'border-box',
          overflow: 'hidden'            /* 💡 外枠に余計なスクロールバーが出ないようにする */
        }}>
        {/* 💡 抽出したSOSタスクおよびSOS看護師を流し込む */}
        <LeftPanel sosTasks={sosTasks} sosNurses={sosNurses} />
        
        <div style={{ 
            flexGrow: 1,                /* 💡 左右パネルの残りの隙間をすべてマップエリアに割り当てる */
            height: '100%',             /* 💡 高さは親（100vh - 120px）に完全に合わせる */
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',       /* 💡 縦横とも中央に配置 */
            boxSizing: 'border-box',
            overflow: 'hidden'          /* 💡 マップがコンテナからはみ出すのを防ぐ */
          }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <WardMap 
              rooms={rooms} 
              facilities={facilities} 
              patients={patients} 
              allTasks={allTasks} 
              displayNurses={displayNurses}
              onPatientRightClick={handlePatientRightClick} 
            />
          </div>
        </div>
        
        <RightPanel nurses={displayNurses} selectedPatients={activeSelectedPatients} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNurse ? <DraggableNursePin nurse={activeNurse} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}