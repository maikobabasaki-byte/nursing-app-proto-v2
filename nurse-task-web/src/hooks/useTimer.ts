import { useState, useEffect } from 'react';

/**
 * ヘッダー表示用の時計を一括管理するカスタムフック
 */
export function useTimer() {
  const [time, setTime] = useState('--:--');

  useEffect(() => {
    // 1秒ごとに現在時刻を更新するタイマー
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    // クリーンアップ（画面消滅時にタイマー停止）
    return () => clearInterval(timer);
  }, []);

  return {time};
}