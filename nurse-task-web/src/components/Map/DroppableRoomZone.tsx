import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableNursePin } from './DraggableNursePin';
import type { NursePin } from '../../stores/useTimelineStore';
import { useUserName } from '../../hooks/useUserName';

interface Props {
  locationId: string;
  nurses: NursePin[];
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export const DroppableRoomZone: React.FC<Props> = ({
  locationId,
  nurses,
  style,
  className = '',
  children,
}) => {
  const currentUserName = useUserName();
  const { setNodeRef, isOver } = useDroppable({
    id: `zone-${locationId}`,
    data: { locationId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.15)' : undefined,
      }}
      className={`transition-colors rounded-md p-1 border-2 border-dashed ${
        isOver ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-400' : 'border-transparent'
      } ${className}`}
    >
      {children}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
        {nurses.map((nurse) => (
          <DraggableNursePin
            key={nurse.nurse_id}
            nurse={nurse}
            isMe={nurse.name === currentUserName || nurse.nurse_id === currentUserName || nurse.nurse_id === 'me'}
          />
        ))}
      </div>
    </div>
  );
};
