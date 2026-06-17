import { useState, useEffect, useRef } from 'react';

export const useTimelineClock = (timelineMode: 15 | 30 | 60, containerRef: React.RefObject<HTMLDivElement>, rowRefs: React.RefObject<Record<string, HTMLDivElement | null>>) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lineTop, setLineTop] = useState<number>(0);

  // 現在の時刻を更新
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // 赤線の位置を計算
  useEffect(() => {
    const updateLinePosition = () => {
      if (!containerRef.current || !rowRefs.current) return;
      const now = new Date();
      const currentKey = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / timelineMode) * timelineMode)}`;
      const targetRow = rowRefs.current[currentKey];
      if (!targetRow) return;

      const offset = ((now.getMinutes() % timelineMode) * 60 + now.getSeconds()) / (timelineMode * 60) * targetRow.offsetHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      setLineTop(rowRect.top - containerRect.top + offset + containerRef.current.scrollTop);
    };

    updateLinePosition();
    const timerId = setInterval(updateLinePosition, 1000);
    return () => clearInterval(timerId);
  }, [timelineMode, containerRef, rowRefs]);

  // 過去判定関数
  const isPastTime = (targetTime: string): boolean => {
    if (!targetTime || !targetTime.includes(':')) return false;
    const now = new Date();
    const [h, m] = targetTime.split(':').map(Number);
    return (now.getHours() * 60 + now.getMinutes()) > (h * 60 + m);
  };

  return { currentTime, lineTop, isPastTime };
};