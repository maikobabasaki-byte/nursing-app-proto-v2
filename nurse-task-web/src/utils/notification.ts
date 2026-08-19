/**
 * 📲 ブラウザ標準のネイティブ Web Push 通知 & 緊急アラーム音・バイブレーション ユーティリティ
 */

/**
 * 🚨 SOS発生時の緊急アラーム音（Web Audio APIによる合成ビープ音）を再生
 */
export function playEmergencyAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // トーン1 (高音アラート 880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // トーン2 (緊急警告音 1174Hz - D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1174, now + 0.15);
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('アラーム音再生失敗:', err);
  }
}

/**
 * 📲 ブラウザ標準のネイティブ Push Notification をデバイス本体（PC/スマホ OS）へ発行
 */
export function sendNativePushNotification(
  title: string,
  options?: NotificationOptions & { playSound?: boolean }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const { playSound = false, ...notificationOptions } = options || {};

  const defaultOptions: any = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: false,
    ...notificationOptions,
  };

  // モバイル端末等のバイブレーション発動
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && Array.isArray(defaultOptions.vibrate)) {
    try {
      navigator.vibrate(defaultOptions.vibrate);
    } catch (_) {}
  }

  // SOS用のアラーム音再生
  if (playSound) {
    playEmergencyAlertSound();
  }

  const fire = () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, defaultOptions).catch(() => {
              new Notification(title, defaultOptions);
            });
          })
          .catch(() => {
            new Notification(title, defaultOptions);
          });
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (err) {
      console.warn('Push Notification 発行エラー:', err);
    }
  };

  if (Notification.permission === 'granted') {
    fire();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        fire();
      }
    });
  }
}

/**
 * 🔔 ブラウザの通知許可状態を確認し、未許可の場合リクエストを促す
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
