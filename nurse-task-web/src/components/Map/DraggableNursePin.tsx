import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTimelineStore, type NursePin } from '../../stores/useTimelineStore';

interface Props {
  nurse: NursePin;
  isOverlay?: boolean;
  isMe?: boolean;
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

export const DraggableNursePin: React.FC<Props> = ({ nurse, isOverlay = false, isMe = false }) => {
  const allNurses = useTimelineStore((state) => state.nurses);
  const shortName = getShortNurseName(nurse.name, nurse.nurse_id, allNurses);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `nurse-${nurse.nurse_id}`,
    data: { type: 'nurse', nurse },
  });

  const style: React.CSSProperties = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : `${nurse.x_percent}%`,
    top: isOverlay ? undefined : `${nurse.y_percent}%`,
    backgroundColor: isMe ? '#7c3aed' : (nurse.color || '#4f46e5'),
    color: '#ffffff',
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
      className={`group inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md transition-transform hover:scale-105 select-none ${
        isMe ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-yellow-200 shadow-lg' : ''
      } ${isOverlay ? 'scale-110 shadow-2xl ring-2 ring-white ring-offset-2' : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${isMe ? 'bg-yellow-300 animate-ping' : 'bg-white opacity-80'}`} />
      <span>{isMe ? '⭐' : '👩‍⚕️'} {shortName} {isMe ? '(自分)' : ''}</span>

      {/* 💡 マウスホバー時にふわりと浮き上がるフルネームツールチップ（ドラッグ中は非表示） */}
      {!isDragging && !isOverlay && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out transform translate-y-1 group-hover:translate-y-0 z-50 whitespace-nowrap bg-gray-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl flex items-center gap-1 border border-white/20">
          <span>{isMe ? '⭐' : '👩‍⚕️'}</span>
          <span>{nurse.name} {isMe ? '(ログイン中)' : `(${nurse.role || '看護師'})`}</span>
          {/* 吹き出しの三角矢印 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
        </div>
      )}
    </div>
  );
};
