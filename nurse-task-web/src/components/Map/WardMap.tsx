import React from 'react';

export interface Room { room_id: string; name: string; x: number; y: number; cols: number; rows: number; }
export interface Facility { room_id: string; name: string; x: number; y: number; w: number; h: number; }
export interface Patient { patient_id: string; name: string; adl: string; risk_level: string; allergy: string; room_id: string; bed_number: number; team: string; }

interface WardMapProps {
  rooms: Room[];
  facilities: Facility[];
  patients: Patient[];
}

const BED_W = 135;
const BED_H = 90;
const HEADER_H = 35;

export default function WardMap({ rooms, facilities, patients }: WardMapProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 1500 870" width="100%" height="100%" style={{ border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      
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
                <g key={patient.patient_id}>
                  {/* 患者名 */}
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
  );
}