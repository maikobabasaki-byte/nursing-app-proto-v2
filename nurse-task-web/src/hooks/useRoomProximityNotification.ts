import { useEffect, useRef, useState } from 'react';
import { useTimelineStore } from '../stores/useTimelineStore';
import type { Memo } from '../types/types';

export interface RoomLocation {
  room_id: string;
  name: string;
  x: number;
  y: number;
}

export interface NotificationToastItem {
  id: string;
  roomId: string;
  roomName: string;
  memoCount: number;
  memos: Memo[];
  timestamp: number;
}

const SVG_WIDTH = 1500;
const SVG_HEIGHT = 870;
const PROXIMITY_THRESHOLD_PX = 140; // 接近検知閾値 (px)
const RESET_THRESHOLD_PX = 180;     // リセット閾値 (px)

export function useRoomProximityNotification(rooms: RoomLocation[]) {
  const memos = useTimelineStore((state) => state.memos);
  const nurses = useTimelineStore((state) => state.nurses);
  const currentUser = useTimelineStore((state) => state.currentUser);

  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  // 重複通知防止用のセット（通知済みの部屋IDを記憶）
  const notifiedRoomsRef = useRef<Set<string>>(new Set());

  // 自分のピンを検出
  const myNurse = nurses.find((nurse) => {
    if (currentUser) {
      return (
        nurse.nurse_id === currentUser.nurse_id ||
        nurse.email === currentUser.email
      );
    }
    return (
      nurse.nurse_id.includes('nurse-me') ||
      nurse.nurse_id.includes('me') ||
      nurse.role === '担当看護師(自分)'
    );
  });

  useEffect(() => {
    if (!myNurse || rooms.length === 0) return;

    // 看護師ピンの相対位置(%)をSVG絶対座標(px)に換算
    const nursePxX = ((myNurse.x_percent ?? 50) / 100) * SVG_WIDTH;
    const nursePxY = ((myNurse.y_percent ?? 45) / 100) * SVG_HEIGHT;

    rooms.forEach((room) => {
      // ピンと部屋の中心点間の直線距離を計算
      const dist = Math.sqrt(
        Math.pow(nursePxX - room.x, 2) + Math.pow(nursePxY - room.y, 2)
      );

      const isAlreadyNotified = notifiedRoomsRef.current.has(room.room_id);
      const targetMemos = memos.filter(
        (m) => m.target_room_id === room.room_id && !m.is_completed
      );

      if (dist <= PROXIMITY_THRESHOLD_PX) {
        if (!isAlreadyNotified && targetMemos.length > 0) {
          // フラグセット＆トースト通知発行
          notifiedRoomsRef.current.add(room.room_id);

          const newToast: NotificationToastItem = {
            id: `${room.room_id}-${Date.now()}`,
            roomId: room.room_id,
            roomName: room.name,
            memoCount: targetMemos.length,
            memos: targetMemos,
            timestamp: Date.now(),
          };

          setToasts((prev) => [newToast, ...prev.filter((t) => t.roomId !== room.room_id).slice(0, 2)]);
        } else if (isAlreadyNotified && targetMemos.length === 0) {
          // メモがすべて完了した場合は即座に通知トーストを削除
          notifiedRoomsRef.current.delete(room.room_id);
          setToasts((prev) => prev.filter((t) => t.roomId !== room.room_id));
        }
      } else if (dist > RESET_THRESHOLD_PX) {
        // 💡 部屋から十分離れた（遠ざかった）ら通知トーストを自動消去＆通知フラグをクリア
        if (isAlreadyNotified) {
          notifiedRoomsRef.current.delete(room.room_id);
          setToasts((prev) => prev.filter((t) => t.roomId !== room.room_id));
        }
      }
    });
  }, [myNurse?.x_percent, myNurse?.y_percent, rooms, memos]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, dismissToast };
}
