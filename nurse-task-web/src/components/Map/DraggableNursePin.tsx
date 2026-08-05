import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTimelineStore, type NursePin } from '../../stores/useTimelineStore';
import { useUserName } from '../../hooks/useUserName';

interface Props {
  nurse: NursePin;
  isOverlay?: boolean;
  isMe?: boolean;
  onNurseContextMenu?: (e: React.MouseEvent, nurse: NursePin) => void;
}

// 🧠 姓一文字（同姓の場合は姓一文字＋名一文字）をスペース区切り対応で100%正確に計算
const getShortNurseName = (nurseName: string, targetNurseId: string, allNurses: NursePin[]): string => {
  if (!nurseName) return '';
  
  const trimmed = nurseName.trim();
  const parts = trimmed.split(/[\s　]+/);
  
  // 1. スペース区切りがある場合
  if (parts.length >= 2) {
    const familyChar = parts[0][0];
    const givenChar = parts[1][0] || '';

    // 他のメンバーと同姓（姓の一文字目が同じ）かチェック
    const hasSameFamilyChar = allNurses.some((other) => {
      if (other.nurse_id === targetNurseId) return false;
      const otherFamily = other.name.trim().split(/[\s　]+/)[0];
      return otherFamily && otherFamily[0] === familyChar;
    });

    if (hasSameFamilyChar && givenChar) {
      return `${familyChar}${givenChar}`;
    }
    return familyChar;
  }

  // 2. スペース区切りがないフォールバック
  const familyChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];

  const hasSameFamilyChar = allNurses.some(
    (other) => other.nurse_id !== targetNurseId && other.name.trim()[0] === familyChar
  );

  if (hasSameFamilyChar && trimmed.length > 1) {
    return `${familyChar}${lastChar}`;
  }

  return familyChar;
};

export const DraggableNursePin: React.FC<Props> = ({ nurse, isOverlay = false, isMe: propIsMe, onNurseContextMenu }) => {
  const currentUserName = useUserName();
  const allNurses = useTimelineStore((state) => state.nurses);
  const currentUser = useTimelineStore((state) => state.currentUser);

  const normalizedCurrent = currentUserName ? currentUserName.replace(/[\s　]+/g, '') : '';
  const normalizedNurseName = nurse.name ? nurse.name.replace(/[\s　]+/g, '') : '';

  // 💡 自他判定（currentUserのnurse_id, email, 名前による高精度判定）
  const isMe = propIsMe ?? (
    currentUser
      ? (nurse.nurse_id === currentUser.nurse_id ||
         nurse.email === currentUser.email ||
         (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName))
      : (nurse.nurse_id.includes('nurse-me') ||
         nurse.nurse_id.includes('me') ||
         nurse.role === '担当看護師(自分)' ||
         (normalizedCurrent !== '' && normalizedCurrent === normalizedNurseName))
  );

  const shortName = getShortNurseName(nurse.name, nurse.nurse_id, allNurses);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `nurse-${nurse.nurse_id}`,
    data: { type: 'nurse', nurse },
  });

  // 💡 優先順位1位: SOS発令中 / 優先順位2位: ログインユーザー(自分) / 優先順位3位: 他スタッフ
  let bgColor = nurse.color || '#4f46e5';
  let textColor = '#ffffff';
  let borderClassName = 'border border-white/50 shadow-md';

  if (nurse.is_sos) {
    bgColor = '#dc2626'; // SOS赤
    textColor = '#ffffff';
    borderClassName = 'border-2 border-red-800 ring-2 ring-red-400 shadow-xl shadow-red-500/50 animate-pulse';
  } else if (isMe) {
    bgColor = '#f59e0b'; // 自分用ゴールドイエロー
    textColor = '#451a03';
    borderClassName = 'border-2 border-amber-600 ring-2 ring-yellow-300 ring-offset-1 shadow-lg shadow-amber-300/60';
  }

  const style: React.CSSProperties = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : `${nurse.x_percent}%`,
    top: isOverlay ? undefined : `${nurse.y_percent}%`,
    backgroundColor: bgColor,
    color: textColor,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
    cursor: isOverlay ? 'grabbing' : 'grab',
    zIndex: isDragging || isOverlay ? 9999 : 50,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onContextMenu={(e) => {
        if (onNurseContextMenu) {
          e.preventDefault();
          onNurseContextMenu(e, nurse);
        }
      }}
      className={`group inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black transition-all hover:scale-105 select-none ${borderClassName} ${
        isOverlay ? 'scale-110 shadow-2xl ring-2 ring-white ring-offset-2' : ''
      }`}
    >
      <span>{shortName}</span>

      {/* 💡 マウスホバー時に表示されるツールチップ（SOS中なら警告表記、通常なら名前＋役割） */}
      {!isDragging && !isOverlay && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out transform translate-y-1 group-hover:translate-y-0 z-50 whitespace-nowrap bg-gray-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl flex items-center gap-1 border border-white/20">
          {nurse.is_sos ? (
            <span className="text-red-300 font-bold">🚨 {nurse.name} (SOS発令中!)</span>
          ) : (
            <span>{nurse.name} {nurse.role ? `(${nurse.role})` : ''}</span>
          )}
          {/* 吹き出しの三角矢印 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
        </div>
      )}
    </div>
  );
};
