import { useState } from 'react';
import type { Memo } from '../types/types';

export const useTimelineMemos = () => {
  const [timeMemos, setTimeMemos] = useState<Memo[]>([]);
  const [activeMemoTime, setActiveMemoTime] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [newMemoText, setNewMemoText] = useState("");

  const saveMemo = (data: Memo) => {
    if (editingMemo) {
      setTimeMemos(prev => prev.map(m => m.id === data.id ? data : m));
    } else {
      setTimeMemos(prev => [...prev, data]);
    }
    setActiveMemoTime(null);
    setEditingMemo(null);
  };

  const deleteMemo = (id: string) => {
    setTimeMemos(prev => prev.filter(m => m.id !== id));
    setEditingMemo(null);
  };

  const closeMemo = () => {
    setActiveMemoTime(null);
    setEditingMemo(null);
  };

  return {
    timeMemos, activeMemoTime, editingMemo, newMemoText,
    setNewMemoText, setActiveMemoTime, setEditingMemo,
    saveMemo, deleteMemo, closeMemo
  };
};