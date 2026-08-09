import React from 'react';
import type { NotificationToastItem } from '../../hooks/useRoomProximityNotification';
import { useTimelineStore } from '../../stores/useTimelineStore';

interface Props {
  toasts: NotificationToastItem[];
  onDismiss: (id: string) => void;
}

export const RoomProximityToast: React.FC<Props> = ({ toasts, onDismiss }) => {
  const handleSaveMemo = useTimelineStore((state) => state.handleSaveMemo);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '360px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            color: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.5)',
            border: '1px solid rgba(254, 243, 199, 0.5)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
            paddingBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <h4 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
                {toast.roomName}の近くです
              </h4>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="閉じる"
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#fef3c7', margin: '0 0 8px 0' }}>
            未完了のメモが {toast.memoCount} 件あります：
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
            {toast.memos.map((memo) => (
              <div
                key={memo.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#1f2937',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#b45309', fontWeight: 'bold', marginRight: '4px' }}>📝 [{memo.time}]</span>
                  <span>{memo.text}</span>
                </div>
                <button
                  onClick={() => {
                    handleSaveMemo({ ...memo, is_completed: true });
                  }}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="完了にする"
                >
                  ✓ 完了
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
