import { useState, useEffect } from 'react';

// 💡 タイマーによる再レンダリングをこの中だけに閉じ込める
export function LiveCurrentTimeLine({ timelineMode, containerRef, rowRefs }: { 
  timelineMode: number; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  rowRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const [time, setTime] = useState(new Date());
  const [top, setTop] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current || !rowRefs.current) return;
      const now = new Date();
      const currentKey = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / timelineMode) * timelineMode).padStart(2, '0')}`;
      const targetRow = rowRefs.current[currentKey];
      if (!targetRow) return;

      const offset = ((now.getMinutes() % timelineMode) * 60 + now.getSeconds()) / (timelineMode * 60) * targetRow.offsetHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      setTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
    };

    updatePosition();
    const timerId = setInterval(updatePosition, 1000);
    return () => clearInterval(timerId);
  }, [timelineMode, containerRef, rowRefs, time]); // 1秒ごとにここだけが静かに動く

  return (
    <div className="absolute left-0 right-0 !border-t-2 !border-red-500 z-10 pointer-events-none" style={{ top: `${top}px`, transition: 'top 0.5s ease' }}>
      <span className="absolute left-0 -top-2.5 !bg-red-500 text-white text-[10px] px-1 rounded shadow">
        {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
      </span>
    </div>
  );
}