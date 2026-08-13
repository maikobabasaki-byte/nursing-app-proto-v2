import React from 'react';

interface ThemeIconProps {
  src: string;
  alt: string;
  className?: string;
  color: string;
}

/**
 * 🎨 CSS Mask (Method B) を利用したダイナミックカラー型抜きアイコンコンポーネント
 * 任意の画像パス (PNG / SVG) を、選択中テーマのアクセントカラー (color) で鮮明に着色します。
 */
export const ThemeIcon: React.FC<ThemeIconProps> = ({ src, alt, className = "w-6 h-6", color }) => {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`${className} inline-block shrink-0 transition-colors duration-300`}
      style={{
        backgroundColor: color,
        maskImage: `url('${src}')`,
        WebkitMaskImage: `url('${src}')`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
};
