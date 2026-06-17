import React from 'react';
import type { Memo } from '../../types/types';
import { MemoPopup } from './MemoPopup';

interface MemoManagerProps {
  activeMemoTime: string | null;
  editingMemo: Memo | null;
  newMemoText: string;
  setNewMemoText: (text: string) => void;
  onClose: () => void;
  onSave: (data: Memo) => void;
  onDelete: (id: string) => void;
}

export const MemoManager: React.FC<MemoManagerProps> = ({
  activeMemoTime, editingMemo, newMemoText, setNewMemoText, onClose, onSave, onDelete
}) => {
  if (!activeMemoTime && !editingMemo) return null;

  return (
    <MemoPopup
      editingMemo={editingMemo}
      activeMemoTime={activeMemoTime}
      newMemoText={newMemoText}
      setNewMemoText={setNewMemoText}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
};