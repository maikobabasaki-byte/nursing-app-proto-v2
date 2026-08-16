import React, { useState, useEffect, useRef } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * オフラインインジケーター（UI）コンポーネント
 * デバイスのオフライン切断およびオンライン復帰状態を検知し、
 * 医療現場のユーザーへ視覚的に安心感のある通知バナーを表示します。
 */
export const OfflineIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);
  const previousOnlineState = useRef<boolean>(isOnline);

  useEffect(() => {
    // オフライン状態からオンライン状態への復帰を検知
    if (!previousOnlineState.current && isOnline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 3500);

      return () => clearTimeout(timer);
    }

    previousOnlineState.current = isOnline;
  }, [isOnline]);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  return (
    <div className="w-full relative z-[9999] transition-all duration-300 select-none shadow-sm shrink-0">
      {!isOnline ? (
        /* ⚠️ オフライン警告インジケーター */
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold animate-fade-in"
        >
          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 animate-pulse">
            wifi_off
          </span>
          <span className="leading-snug text-center">
            現在オフラインです。入力データは端末に保存され、通信回復後に自動で同期されます。
          </span>
        </div>
      ) : showRestoredNotice ? (
        /* 🟢 オンライン復帰お知らせインジケーター */
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-600 border-b border-emerald-700 text-white px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold animate-fade-in"
        >
          <span className="material-symbols-outlined text-white text-lg shrink-0 animate-bounce">
            wifi
          </span>
          <span className="leading-snug text-center">
            通信が回復しました。データを自動同期しています...
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
