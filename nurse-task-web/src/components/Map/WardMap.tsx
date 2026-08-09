import React from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { DraggableNursePin } from './DraggableNursePin';
import { useUserName } from '../../hooks/useUserName';

export interface Room { room_id: string; name: string; x: number; y: number; cols: number; rows: number; }
export interface Facility { room_id: string; name: string; x: number; y: number; w: number; h: number; }
export interface Patient { patient_id: string; name: string; gender?: string; adl: string; risk_level: string; allergy: string; room_id: string; bed_number: number; team: string; }

interface WardMapProps {
  rooms: Room[];
  facilities: Facility[];
  patients: Patient[];
  allTasks: any[];
  displayNurses?: any[];
  onPatientRightClick?: (taskId: string, patientName: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  patientId: string;
  patientName: string;
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
  displayNurses,
  onPatientRightClick
}: WardMapProps): React.JSX.Element {
  const storeNurses = useTimelineStore((state) => state.nurses);
  const toggleNurseSos = useTimelineStore((state) => state.toggleNurseSos);
  const storeMemos = useTimelineStore((state) => state.memos);
  const nurses = displayNurses || storeNurses;
  const currentUserName = useUserName();

  const [menu, setMenu] = React.useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    patientId: '',
    patientName: '',
    patientTasks: []
  });

  const [nurseMenu, setNurseMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    nurseId: string;
    nurseName: string;
    isSos: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    nurseId: '',
    nurseName: '',
    isSos: false,
  });

  const menuRef = React.useRef<HTMLDivElement>(null);
  const nurseMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(prev => ({ ...prev, visible: false }));
      }
      if (nurseMenuRef.current && !nurseMenuRef.current.contains(e.target as Node)) {
        setNurseMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* 🎯 SVGとHTMLオーバーレイの共通アスペクト比固定ラッパー (1500 : 870) */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '100%', 
          maxHeight: '100%', 
          aspectRatio: '1500 / 870', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        {/* 1. 既存の純粋SVGマップ（背景レイヤー） */}
        <svg viewBox="0 0 1500 870" width="100%" height="100%" style={{ border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9', display: 'block' }}>
        
        {/* 1. 施設（ナースステーション・物品庫など） */}
        {facilities.map((fac) => {
          const facMemos = storeMemos.filter(m => m.target_room_id === fac.room_id && !m.is_completed);
          return (
            <g key={fac.room_id}>
              <rect x={fac.x - fac.w / 2} y={fac.y - fac.h / 2} width={fac.w} height={fac.h} fill="white" stroke="#b2ebf2" strokeWidth={2} />
              <text x={fac.x} y={fac.y - 20} textAnchor="middle" dominantBaseline="central" fontSize={24} fill="#333" fontWeight="bold">{fac.name}</text>
              {facMemos.length > 0 && (
                <g>
                  <rect x={fac.x - 40} y={fac.y + 10} width={80} height={20} rx={10} fill="#f59e0b" />
                  <text x={fac.x} y={fac.y + 20} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#ffffff" fontWeight="bold">
                    📝 メモ {facMemos.length}件
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 2. 病室と患者 */}
        {rooms.map((room) => {
          const roomW = BED_W * room.cols;
          const roomH = (BED_H * room.rows) + HEADER_H;
          
          const isTopRow = room.y < 300;
          const topY = isTopRow ? room.y : room.y - roomH;
          const headerY = isTopRow ? topY : topY + (BED_H * room.rows);
          const roomPatients = patients.filter((p) => p.room_id === room.room_id);
          const roomMemos = storeMemos.filter(m => m.target_room_id === room.room_id && !m.is_completed);

          return (
            <g key={room.room_id}>
              {/* 部屋の外枠 */}
              <rect x={room.x - roomW / 2} y={topY} width={roomW} height={roomH} fill="white" />
              {/* 部屋名の背景（薄い青のバー） */}
              <rect x={room.x - roomW / 2} y={headerY} width={roomW} height={HEADER_H} fill="#b2ebf2" />
              <text x={room.x - roomW / 4} y={headerY + HEADER_H / 2} textAnchor="middle" dominantBaseline="central" fontSize="18" fill="#333" fontWeight="bold">{room.name}</text>

              {/* 📝 部屋内の未完了メモバッジ */}
              {roomMemos.length > 0 && (
                <g>
                  <rect x={room.x + roomW / 8} y={headerY + 6} width={roomW / 3} height={HEADER_H - 12} rx={4} fill="#f59e0b" />
                  <text x={room.x + roomW / 8 + roomW / 6} y={headerY + HEADER_H / 2} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#ffffff" fontWeight="bold">
                    📝 メモ{roomMemos.length}件
                  </text>
                </g>
              )}

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

                const hasSos = allTasks.some(t => t.patient_id === patient.patient_id && t.is_sos === true);

                // 💡 性別・SOSに応じたカード背景・枠線スタイルの定義
                let cardFill = '#ffffff';
                let cardStroke = '#cbd5e1';
                let cardStrokeWidth = 1;

                if (hasSos) {
                  cardFill = '#ffebee';
                  cardStroke = '#d32f2f';
                  cardStrokeWidth = 3;
                } else if (patient.gender === '男') {
                  cardFill = '#ebf8ff';
                  cardStroke = '#90cdf4';
                  cardStrokeWidth = 1.5;
                } else if (patient.gender === '女') {
                  cardFill = '#fff5f5';
                  cardStroke = '#feb2b2';
                  cardStrokeWidth = 1.5;
                }

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
                    {/* 💡 ベッドカード背景（性別・SOS別色分け） */}
                    <rect 
                      x={bedX + 2} 
                      y={bedTopY + 2} 
                      width={BED_W - 4} 
                      height={BED_H - 4} 
                      fill={cardFill} 
                      stroke={cardStroke} 
                      strokeWidth={cardStrokeWidth} 
                      rx={6} 
                    />

                    {/* 🚨 SOS緊急アラート時のバッジ表示 */}
                    {hasSos && (
                      <g>
                        <rect 
                          x={bedX + BED_W - 34} 
                          y={bedTopY + 4} 
                          width={30} 
                          height={16} 
                          rx={3} 
                          fill="#d32f2f" 
                        />
                        <text 
                          x={bedX + BED_W - 19} 
                          y={bedTopY + 12} 
                          textAnchor="middle" 
                          dominantBaseline="central" 
                          fontSize="10" 
                          fill="#ffffff" 
                          fontWeight="bold"
                        >
                          SOS
                        </text>
                      </g>
                    )}

                    {/* 💡 転倒リスク「高」の患者への洗練されたテキスト赤タグ（絵文字なし） */}
                    {(patient.risk_level === '高' || patient.risk_level === 'high') && (
                      <g>
                        <rect
                          x={bedX + 6}
                          y={bedTopY + 4}
                          width={46}
                          height={15}
                          rx={3}
                          fill="#fee2e2"
                          stroke="#f87171"
                          strokeWidth={1}
                        />
                        <text
                          x={bedX + 29}
                          y={bedTopY + 11.5}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="9"
                          fill="#dc2626"
                          fontWeight="bold"
                        >
                          高リスク
                        </text>
                      </g>
                    )}

                    {/* 💡 患者名テキスト（性別表記は背景色で表現するため名前のみ） */}
                    <text 
                      x={textX} 
                      y={textY + 2} 
                      textAnchor="middle" 
                      dominantBaseline="central" 
                      fontSize="18" 
                      fill={hasSos ? "#c62828" : "#333"} 
                      fontWeight={hasSos ? "bold" : "500"}
                    >
                      {patient.name}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* 2. 自由移動・自由配置用キャンバスレイヤー */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          zIndex: 50 
        }}
      >
        {nurses.map((nurse) => {
          const currentUser = useTimelineStore.getState().currentUser;
          const normalizedCurrent = currentUserName ? currentUserName.replace(/[\s　]+/g, '') : '';
          const normalizedNurseName = nurse.name ? nurse.name.replace(/[\s　]+/g, '') : '';
          const isMe = currentUser
            ? (nurse.nurse_id === currentUser.nurse_id ||
               nurse.email === currentUser.email ||
               (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName))
            : (nurse.nurse_id.includes('nurse-me') ||
               nurse.nurse_id.includes('me') ||
               nurse.role === '担当看護師(自分)' ||
               (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName));

          return (
            <div key={nurse.nurse_id} style={{ pointerEvents: 'auto' }}>
              <DraggableNursePin 
                nurse={nurse} 
                isMe={isMe}
                onNurseContextMenu={(e, n) => {
                  // 💡 自分（ログイン中ユーザー）のピンの場合のみSOS操作メニューを開く
                  if (!isMe) return;
                  setNurseMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    nurseId: n.nurse_id,
                    nurseName: n.name,
                    isSos: !!n.is_sos,
                  });
                }}
              />
            </div>
          );
        })}
      </div>

      </div>

      {/* 患者右クリックメニュー本体 */}
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

      {/* 看護師右クリックメニュー本体（SOS発令・解除） */}
      {nurseMenu.visible && (
        <div
          ref={nurseMenuRef}
          style={{
            position: 'fixed',
            left: `${nurseMenu.x}px`,
            top: `${nurseMenu.y}px`,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '6px 0',
            minWidth: '220px'
          }}
        >
          <div style={{ padding: '6px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            👤 {nurseMenu.nurseName} さんの状態設定
          </div>

          <button
            onClick={() => {
              toggleNurseSos(
                nurseMenu.nurseId,
                `緊急応援：${nurseMenu.nurseName}さんからの緊急アシスト要請`
              );
              setNurseMenu(prev => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              padding: '10px 12px',
              fontSize: '13px',
              color: nurseMenu.isSos ? '#333' : '#d32f2f',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>{nurseMenu.isSos ? '✅ SOSを解除する' : '🚨 SOS（緊急応援）を出す'}</span>
          </button>
        </div>
      )}
    </div>
  );
}