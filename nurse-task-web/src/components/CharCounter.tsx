import React from 'react';

interface CharCounterProps {
  current: number;
  max: number;
  className?: string;
}

/**
 * 🎨 テキスト入力フィールド用の視覚的文字数カウンター
 */
export const CharCounter: React.FC<CharCounterProps> = ({ current, max, className = '' }) => {
  const remaining = max - current;
  const isNearLimit = remaining <= 5 && remaining > 0;
  const isAtLimit = current >= max;

  return (
    <div className={`text-[11px] text-right font-mono select-none mt-1 transition-colors ${
      isAtLimit 
        ? 'text-red-600 font-extrabold animate-pulse' 
        : isNearLimit 
        ? 'text-amber-600 font-bold' 
        : 'text-gray-400'
    } ${className}`}>
      <span>{current} / {max} 文字</span>
      {isAtLimit && <span className="ml-1 text-[10px] text-red-600 font-bold">（上限）</span>}
    </div>
  );
};
