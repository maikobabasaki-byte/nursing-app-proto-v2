import React from 'react';
import type { ExtendedTaskStatus } from '../../types/types';

interface TimelineToastProps {
  toast: {
    message: string;
    visible: boolean;
    status: ExtendedTaskStatus | null;
  };
}

export const TimelineToast: React.FC<TimelineToastProps> = ({ toast }) => {
  if (!toast.visible || !toast.status) return null;

  const overlayColors: Record<ExtendedTaskStatus, { overlayBg: string; cardBg: string; border: string }> = {
    progressing: { overlayBg: 'bg-cyan-950/70', cardBg: 'bg-cyan-900', border: 'border-cyan-500' },
    pending: { overlayBg: 'bg-orange-950/70', cardBg: 'bg-orange-900', border: 'border-orange-500' },
    completed: { overlayBg: 'bg-emerald-950/70', cardBg: 'bg-emerald-900', border: 'border-emerald-500' },
    record_start: { overlayBg: 'bg-blue-950/70', cardBg: 'bg-blue-900', border: 'border-blue-500' },
    record_pending: { overlayBg: 'bg-amber-950/70', cardBg: 'bg-amber-900', border: 'border-amber-500' },
    record_complete: { overlayBg: 'bg-purple-950/70', cardBg: 'bg-purple-900', border: 'border-purple-500' },
    unexecuted: { overlayBg: 'bg-red-950/70', cardBg: 'bg-red-900', border: 'border-red-500' },
    initial: { overlayBg: 'bg-slate-950/70', cardBg: 'bg-slate-900', border: 'border-slate-500' },
    untouched: { overlayBg: 'bg-slate-950/70', cardBg: 'bg-slate-900', border: 'border-slate-500' },
  };

  const theme = overlayColors[toast.status] || overlayColors.initial;

  return (
    <div className={`fixed inset-0 ${theme.overlayBg} flex items-center justify-center z-[60] pointer-events-auto backdrop-blur-[2px] animate-fade-in`}>
      <div className={`${theme.cardBg} ${theme.border} border-2 text-white text-2xl font-black px-10 py-6 rounded-2xl shadow-2xl flex items-center gap-4`}>
        <div>{toast.message}</div>
      </div>
    </div>
  );
};