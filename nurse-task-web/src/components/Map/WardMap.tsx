import React from 'react';

export interface Room { room_id: string; name: string; x: number; y: number; cols: number; rows: number; }
export interface Facility { room_id: string; name: string; x: number; y: number; w: number; h: number; }
export interface Patient { patient_id: string; name: string; adl: string; risk_level: string; allergy: string; room_id: string; bed_number: number; team: string; }

interface WardMapProps {
  rooms: Room[];
  facilities: Facility[];
  patients: Patient[];
  allTasks: any[]; // 💡 追加：ストアの全タスクを受け取る
  onPatientRightClick?: (taskId: string, patientName: string) => void; // 💡 引数を「taskId」に変更！
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  patientId: string;
  patientName: string;
  // 💡 その患者に関連するタスクを保持する配列を追加！
  patientTasks: any[]; 
}

const BED_W = 135;
const BED_H = 90;
const HEADER_H = 35;

export default function WardMap({ 
  rooms, 
  facilities, 
  patients, 
  allTasks,
  onPatientRightClick
}: WardMapProps): React.JSX.Element {

  const [menu, setMenu] = React.useState<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  patientId: '',
  patientName: '',
  patientTasks: [] // 初期値は空
});

  // 2. メニュー要素を直接参照するためのRef（外側クリック検知用）
  const menuRef = React.useRef<HTMLDivElement>(null);

  // 3. メニュー以外の場所をクリックしたときに自動で閉じる処理
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* 1. 既存のSVGマップ（レイアウトは一切変えずにそのままです） */}
      <svg viewBox="0 0 1500 870" width="100%" height="100%" style={{ border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        
        {/* 1. 施設（ナースステーション・物品庫など） */}
        {facilities.map((fac) => (
          <g key={fac.room_id}>
            <rect x={fac.x - fac.w / 2} y={fac.y - fac.h / 2} width={fac.w} height={fac.h} fill="white" stroke="#b2ebf2" strokeWidth={2} />
            <text x={fac.x} y={fac.y} textAnchor="middle" dominantBaseline="central" fontSize={24} fill="#333" fontWeight="bold">{fac.name}</text>
          </g>
        ))}

        {/* 2. 病室と患者 */}
        {rooms.map((room) => {
          // 部屋全体の幅と高さをマスの数（cols, rows）から正しく計算
          const roomW = BED_W * room.cols;
          const roomH = (BED_H * room.rows) + HEADER_H;
          
          // 画面の上側にある部屋（y < 300）か、下側にある部屋かで、ヘッダーの位置を上下に分ける
          const isTopRow = room.y < 300;
          const topY = isTopRow ? room.y : room.y - roomH;
          const headerY = isTopRow ? topY : topY + (BED_H * room.rows);

          const roomPatients = patients.filter((p) => p.room_id === room.room_id);

          return (
            <g key={room.room_id}>
              {/* 部屋の外枠 */}
              <rect x={room.x - roomW / 2} y={topY} width={roomW} height={roomH} fill="white" />
              {/* 部屋名の背景（薄い青のバー） */}
              <rect x={room.x - roomW / 2} y={headerY} width={roomW} height={HEADER_H} fill="#b2ebf2" />
              <text x={room.x} y={headerY + HEADER_H / 2} textAnchor="middle" dominantBaseline="central" fontSize="20" fill="#333" fontWeight="bold">{room.name}</text>

              {/* 💡 部屋のベッド枠（グリッド線）の描画 */}
              {Array.from({ length: room.cols * room.rows }).map((_, i) => {
                const gridCol = i % room.cols;
                const gridRow = Math.floor(i / room.cols);
                
                const bedX = (room.x - roomW / 2) + (gridCol * BED_W);
                const bedTopY = isTopRow ? topY + HEADER_H + (gridRow * BED_H) : topY + (gridRow * BED_H);

                return (
                  <rect key={`grid-${room.room_id}-${i}`} x={bedX} y={bedTopY} width={BED_W} height={BED_H} fill="none" stroke="#e0f7fa" strokeWidth={1} strokeDasharray="4" />
                );
              })}

              {/* 患者の配置 */}
              {roomPatients.map((patient) => {
                // 💡 1を引いたインデックス（0〜3）をベースに、横(col)と縦(row)の並び順を割り算で計算！
                const bIdx = patient.bed_number - 1;
                const bedCol = room.cols === 1 ? 0 : bIdx % room.cols;
                const bedRow = room.rows === 1 ? 0 : Math.floor(bIdx / room.cols);

                // 割り算を基に、正確なSVG座標を割り出す
                const bedX = (room.x - roomW / 2) + (bedCol * BED_W);
                const bedTopY = isTopRow ? topY + HEADER_H + (bedRow * BED_H) : topY + (bedRow * BED_H);
                
                const textX = bedX + BED_W / 2;
                const textY = bedTopY + BED_H / 2;

                return (
                  <g 
                    key={patient.patient_id}
                    cursor="context-menu"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      
                      // 💡 この患者に紐づく全タスクをフィルタリングして集める！
                      const relatedTasks = allTasks.filter(t => t.patient_id === patient.patient_id);

                      setMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        patientId: patient.patient_id,
                        patientName: patient.name,
                        patientTasks: relatedTasks // 💡 集めたタスクをメニューに引き渡す
                      });
                    }}
                  >
                    <text x={textX} y={textY} textAnchor="middle" dominantBaseline="central" fontSize="20" fill="#333" fontWeight="500">
                      {patient.name}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* 右クリックメニュー本体 */}
      {menu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${menu.x}px`,
            top: `${menu.y}px`,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '6px 0',
            minWidth: '200px'
          }}
        >
          <div style={{ padding: '6px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            👤 {menu.patientName} さんのタスク一覧
          </div>

          {menu.patientTasks.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
              予定タスクがありません
            </div>
          ) : (
            // 💡 該当するタスクをループして、1つずつボタンとして並べる！
            menu.patientTasks.map((task) => (
              <button
                key={task.task_id}
                onClick={() => {
                  if (onPatientRightClick) {
                    // 💡 選ばれた「特定のタスクID」を親に伝える！
                    onPatientRightClick(task.task_id, menu.patientName);
                  }
                  setMenu(prev => ({ ...prev, visible: false }));
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: task.is_sos ? '#333' : '#d32f2f', // すでにSOS中なら普通の文字色、未SOSなら赤文字に
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  borderBottom: '1px solid #f5f5f5'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span>📋 {task.title}</span>
                {task.is_sos ? (
                  <span style={{ fontSize: '11px', backgroundColor: '#ffebee', color: '#c62828', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>SOSを取り消す</span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#999' }}>SOSを出す</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}