import { useState, useEffect } from 'react';
import type { ExtendedTaskStatus } from '../types/types';

export const useTimelineToast = () => {
  const [toast, setToast] = useState<{ message: string; visible: boolean; status: ExtendedTaskStatus | null }>({
    message: '', visible: false, status: null,
  });

  const showToast = (message: string, status: ExtendedTaskStatus | null) => {
    setToast({ message, visible: true, status });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 1000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  return { toast, showToast };
};