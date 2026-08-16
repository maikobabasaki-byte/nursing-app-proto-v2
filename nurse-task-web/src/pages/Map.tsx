import React, { useState, useEffect, useMemo } from 'react';
import WardMap from '../components/Map/WardMap';
import type { Patient, Room, Facility } from '../components/Map/WardMap';
import { useTimelineStore, type NursePin } from '../stores/useTimelineStore';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, MouseSensor, TouchSensor, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { DraggableNursePin } from '../components/Map/DraggableNursePin';
import { useUserName } from '../hooks/useUserName';
import { auth, updateNursePositionInFirestore } from '../lib/firebase';

// 💡 左側のSOSパネル（LeftPanel）：タスクSOS、看護師SOS、患者SOSをリアルタイム統合表示
const LeftPanel: React.FC<{ sosTasks: any[]; sosNurses: NursePin[]; patientSosList?: any[]; isFullWidth?: boolean }> = ({ sosTasks, sosNurses, patientSosList = [], isFullWidth }) => (
  <div 
    id="tour-sos-panel"
    style={{ 
      width: isFullWidth ? '100%' : '240px', 
      flexShrink: 0, 
      backgroundColor: '#ffebee', 
      padding: '16px', 
      borderRight: isFullWidth ? 'none' : '1px solid #e0e0e0', 
      boxSizing: 'border-box', 
      overflowY: 'auto',
      height: '100%'
    }}
    className="flex flex-col gap-3 font-sans"
  >
    <h3 style={{ fontWeight: 'bold', color: '#c62828', display: 'flex', alignItems: 'center', gap: '6px' }} className="text-sm border-b border-red-200 pb-2">
      <span>🚨 緊急アラート</span>
      {(sosTasks.length + sosNurses.length + patientSosList.length) > 0 && (
        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-extrabold animate-pulse">
          {sosTasks.length + sosNurses.length + patientSosList.length}件
        </span>
      )}
    </h3>
    
    {sosTasks.length === 0 && sosNurses.length === 0 && patientSosList.length === 0 ? (
      <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
        現在、SOSはありません。<br/>
        <span style={{ fontSize: '11px', color: '#999' }}>（自分のピン右クリックまたはマップダブルクリックでSOS可能）</span>
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 1. 患者単体からの緊急要請 (Patient SOS) */}
        {patientSosList.map((p) => (
          <div key={`patient-sos-${p.patient_id}`} style={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f', padding: '10px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🚨 患者SOS ({p.room_id ? `${p.room_id}号室` : ''})</span>
              <span style={{ fontSize: '10px', backgroundColor: '#ffebee', color: '#c62828', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>緊急</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              対象: {p.patient_name} 様
            </div>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#fff5f5', padding: '6px', borderRadius: '4px', lineHeight: '1.4' }}>
              ⚠️ {p.reason}
            </div>
          </div>
        ))}

        {/* 2. 看護師からの緊急要請 (Nurse SOS) */}
        {sosNurses.map((nurse) => (
          <div key={`nurse-sos-${nurse.nurse_id}`} style={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f', padding: '10px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🩺 看護師要請</span>
              <span style={{ fontSize: '10px', backgroundColor: '#ffebee', color: '#c62828', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>緊急</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              対象: {nurse.name} さん
            </div>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#fff5f5', padding: '6px', borderRadius: '4px', lineHeight: '1.4' }}>
              ⚠️ {nurse.sos_reason || `${nurse.name}さんが緊急応援を要請しています`}
            </div>
          </div>
        ))}

        {/* 3. 患者タスクからの緊急要請 (Task SOS) */}
        {sosTasks.map((task) => (
          <div key={task.task_id} style={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f', padding: '10px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '14px', marginBottom: '4px' }}>
              {task.room_id}号室
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
              対象: {task.title}
            </div>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#f5f5f5', padding: '6px', borderRadius: '4px', lineHeight: '1.4' }}>
              ⚠️ {task.sos_reason}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

import TeamProgressWidget from '../components/Map/TeamProgressWidget';

const RightPanel: React.FC<{ nurses: NursePin[]; selectedPatients?: string[]; compact?: boolean }> = ({ nurses, selectedPatients, compact }) => {
  return <TeamProgressWidget nurses={nurses} selectedPatients={selectedPatients} compact={compact} />;
};

interface MapContainerProps {
  selectedPatients?: string[];
}

export default function MapContainer({ selectedPatients }: MapContainerProps): React.JSX.Element {
  // 💡 サブタブ状態（タブレット・モバイル版用）
  const [activeTab, setActiveTab] = useState<'map' | 'alerts' | 'progress'>('map');

  // 💡 受け持ち患者IDリスト
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
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } });
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor, pointerSensor);

  // 💡 Zustandストアから状態とアクションを取得
  const allTasks = useTimelineStore((state) => state.allTasks);
  const nurses = useTimelineStore((state) => state.nurses);
  const setNurses = useTimelineStore((state) => state.setNurses);
  const toggleTaskSos = useTimelineStore((state) => state.toggleTaskSos);
  const updateNursePosition = useTimelineStore((state) => state.updateNursePosition);
  const patientSosList = useTimelineStore((state) => state.patientSosList || []);

  const currentUser = useTimelineStore((state) => state.currentUser);

  const displayNurses = useMemo(() => {
    const currentUserId = currentUser?.nurse_id || auth.currentUser?.uid;
    const seenKeys = new Set<string>();
    return nurses.filter((nurse) => {
      if (nurse.is_logged_in === false) {
        return false;
      }
      // 💡 自分以外のゲストユーザーをマップ表示から除外
      const isSelf = nurse.nurse_id === currentUserId;
      const isGuestNurse = Boolean(
        nurse.nurse_id?.includes('guest') ||
        nurse.nurse_id?.startsWith('GUEST-') ||
        (nurse.email && nurse.email.includes('guest')) ||
        (nurse.name && nurse.name.includes('ゲスト')) ||
        (nurse.role && nurse.role.includes('ゲスト'))
      );
      if (!isSelf && isGuestNurse) {
        return false;
      }
      const key = nurse.nurse_id || nurse.name.replace(/[\s　]+/g, '');
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    });
  }, [nurses, currentUser]);

  useEffect(() => {
    const fetchJson = async (filename: string) => {
      const candidatePaths = [
        `/app/data/${filename}`,
        `${import.meta.env.BASE_URL || '/app/'}data/${filename}`.replace(/\/+/g, '/'),
        `/data/${filename}`,
      ];
      for (const path of candidatePaths) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const data = await res.json();
            if (data) return data;
          }
        } catch (e) {}
      }
      return null;
    };

    Promise.all([
      fetchJson('patients.json'),
      fetchJson('rooms.json'),
    ])
      .then(([patientsData, roomsData]) => {
        if (patientsData) setPatients(patientsData);
        if (roomsData) {
          setRooms(roomsData.rooms || []);
          setFacilities(roomsData.facilities || []);
        }
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

    // 🎯 正確なアスペクト比固定キャンバス要素（#ward-map-aspect-container）を取得
    const aspectContainer = document.getElementById('ward-map-aspect-container') || mapContainerRef.current;
    if (aspectContainer) {
      const rect = aspectContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // 💡 画面幅 640px 未満のスマートフォン表示時のみ90度回転しているため、回転ドラッグ座標補正を適用
        const isRotated = typeof window !== 'undefined' && window.innerWidth < 640;

        let deltaX = delta.x;
        let deltaY = delta.y;

        if (isRotated) {
          // 🔄 90度回転時のX/Yドラッグベクトルを正しい座標軸へ変換補正
          deltaX = delta.y;
          deltaY = -delta.x;
        }

        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;

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
          // 🎯 1. オプティミスティックUI（即時ローカル反映）
          updateNursePosition(activeNurseId, newXPercent, newYPercent);
        }

        // 🎯 2. Firestore への即時非同期保存（全端末リアルタイム同期 ＆ スナップバック防止）
        updateNursePositionInFirestore(activeNurseId, newXPercent, newYPercent).catch((err) => {
          console.warn("ピン座標のFirestore更新エラー:", err);
        });
      }
    }
  };

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

  const sosTasks = allTasks.filter(task => task.is_sos === true);
  const sosNurses = displayNurses.filter(nurse => nurse.is_sos === true);
  const totalSosCount = sosTasks.length + sosNurses.length + patientSosList.length;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col w-full h-[calc(100vh-110px)] bg-white overflow-hidden relative">
        
        {/* 📱 タブレット・モバイル幅（lg未満）専用サブタブ切り替えバー */}
        <div className="lg:!hidden !flex !items-center !justify-center !p-2 !bg-slate-100 !border-b !border-slate-200 !gap-2 !shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`!px-4 !py-1.5 !rounded-xl !font-extrabold !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
              activeTab === 'map'
                ? '!bg-sky-600 !text-white !shadow-md !scale-102'
                : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
            }`}
          >
            <span>マップ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`!px-4 !py-1.5 !rounded-xl !font-extrabold !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
              activeTab === 'alerts'
                ? '!bg-rose-600 !text-white !shadow-md !scale-102'
                : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
            }`}
          >
            <span>アラート</span>
            {totalSosCount > 0 && (
              <span className="!bg-red-600 !text-white !text-[10px] !px-1.5 !py-0.2 !rounded-full !font-black !animate-pulse">
                {totalSosCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`!px-4 !py-1.5 !rounded-xl !font-extrabold !transition-all !cursor-pointer !flex !items-center !gap-1.5 ${
              activeTab === 'progress'
                ? '!bg-indigo-600 !text-white !shadow-md !scale-102'
                : '!bg-white !text-slate-700 hover:!bg-slate-200 !border !border-slate-300'
            }`}
          >
            <span>進捗</span>
          </button>
        </div>

        {/* 📱 タブレット・モバイル幅（lg未満）の単一コンポーネント表示領域 */}
        <div className="lg:hidden flex-1 min-h-0 w-full overflow-hidden relative flex justify-center items-center bg-slate-900/5">
          {activeTab === 'map' && (
            <div 
              ref={mapContainerRef} 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: typeof window !== 'undefined' && window.innerWidth < 640 ? 'rotate(90deg) scale(1.35)' : 'rotate(0deg) scale(1.0)',
              }}
            >
              <WardMap 
                rooms={rooms} 
                facilities={facilities} 
                patients={patients} 
                allTasks={allTasks} 
                displayNurses={displayNurses}
                onPatientRightClick={handlePatientRightClick} 
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="w-full h-full overflow-y-auto">
              <LeftPanel sosTasks={sosTasks} sosNurses={sosNurses} patientSosList={patientSosList} isFullWidth={true} />
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="w-full h-full overflow-y-auto">
              <RightPanel nurses={displayNurses} selectedPatients={activeSelectedPatients} compact={true} />
            </div>
          )}
        </div>

        {/* 💻 PC幅（lg以上）従来通りの三分割同時表示レイアウト（マップは0度表示） */}
        <div className="hidden lg:flex w-full h-full overflow-hidden relative">
          {/* ① 左側：緊急アラート */}
          <LeftPanel sosTasks={sosTasks} sosNurses={sosNurses} patientSosList={patientSosList} />
          
          {/* ② 中央：病棟マップ（0度・回転なし表示） */}
          <div id="tour-map-canvas" className="flex-1 h-full flex justify-center items-center overflow-hidden relative">
            <div 
              ref={mapContainerRef} 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
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
          
          {/* ③ 右側：計画進捗 */}
          <RightPanel nurses={displayNurses} selectedPatients={activeSelectedPatients} />
        </div>

      </div>

      <DragOverlay dropAnimation={null}>
        {activeNurse ? <DraggableNursePin nurse={activeNurse} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

