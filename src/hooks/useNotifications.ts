import { useState, useEffect, useCallback, useRef } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const playSound = useCallback(() => {
    // Generate notification sound dynamically via browser Web Audio API (safe from static asset missing errors)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880; // A5 pitch
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);

      // Beep 2 (slightly higher, staggered slightly after)
      setTimeout(() => {
        try {
          if (ctx.state === 'closed') return;
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1100; // C#6 pitch
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.25, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          
          osc2.start();
          osc2.stop(ctx.currentTime + 0.3);
        } catch (e) {
          console.warn('Second beep playback failed:', e);
        }
      }, 150);
    } catch (e) {
      console.warn('Native AudioContext beep playback failed:', e);
    }
  }, []);

  const notify = useCallback((title: string, body: string) => {
    playSound();
    if (permission === 'granted' && typeof Notification !== 'undefined') {
      try {
        new Notification(title, {
          body,
          tag: 'chrono-reminder',
          requireInteraction: true
        });
      } catch (err) {
        console.warn('Browser push notification failed:', err);
      }
    }
  }, [permission, playSound]);

  return { permission, requestPermission, notify, playSound };
}
