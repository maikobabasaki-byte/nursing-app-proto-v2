import React from 'react';
import { useTimelineStore } from '../../stores/useTimelineStore'; // ★追加
import { MemoPopup } from './MemoPopup';

export const MemoManager: React.FC = () => {
  // ★ストアから開くかどうかの判定用データだけを一本釣りする
  const activeMemoTime = useTimelineStore((state) => state.activeMemoTime);
  const editingMemo = useTimelineStore((state) => state.editingMemo);

  // どちらの状態も空なら、何も表示しない（門番の役割）
  if (!activeMemoTime && !editingMemo) return null;

  // 💡 下の MemoPopup も自力でストアを見るようになったので、Propsのバケツリレーはゼロ！
  return <MemoPopup />;
};