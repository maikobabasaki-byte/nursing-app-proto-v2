import React, { useState, useEffect } from 'react';
import WardMap from '../components/Map/WardMap';

const LeftPanel: React.FC = () => (
  <div style={{ width: '200px', flexShrink: 0, backgroundColor: '#ffebee', padding: '20px', borderRight: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
    <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>緊急アラート</h3>
    <p style={{ color: '#666', fontSize: '13px' }}>（リアルタイム連動）</p>
  </div>
);

const RightPanel: React.FC = () => (
  <div style={{ width: '200px', flexShrink: 0, backgroundColor: '#ffebee', padding: '20px', borderLeft: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
    <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>チーム負荷</h3>
    <p style={{ color: '#666', fontSize: '13px' }}>（リアルタイム連動）</p>
  </div>
);

export default function MapContainer(): React.JSX.Element {
  const [patients, setPatients] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]); // 💡 施設もStateで管理
  const [loading, setLoading] = useState<boolean>(true);

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
        // 💡 rooms.json の中にある「rooms」と「facilities」を別々に引っこ抜いてStateに入れる！
        setRooms(roomsData.rooms || []);
        setFacilities(roomsData.facilities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ データ反映エラー:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '18px', color: '#666' }}>
        病棟データを読み込み中...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)', backgroundColor: '#fff', boxSizing: 'border-box' }}>
      <LeftPanel />
      <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', boxSizing: 'border-box', overflowX: 'auto' }}>
        {/* 💡 すべてJSONから取ってきたリアルなデータを渡します */}
        <WardMap rooms={rooms} facilities={facilities} patients={patients} />
      </div>
      <RightPanel />
    </div>
  );
}