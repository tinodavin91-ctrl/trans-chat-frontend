// hooks/useNotificationSound.ts
//
// Plays a short "ding" whenever a new message arrives, using the
// Web Audio API directly — no mp3 file needed.
//
// Usage:
//   const playNotificationSound = useNotificationSound();
//   playNotificationSound(); // call this inside your Echo "new message" listener

import { useCallback, useRef } from "react";

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Reuse one AudioContext (browsers limit how many can exist)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      // Some browsers suspend the context until a user gesture happens;
      // resume it just in case.
      if (ctx.state === "suspended") {
        ctx.resume().catch((e) => console.warn("Failed to resume audio context:", e));
      }

      const now = ctx.currentTime;

      // Two quick tones for a pleasant "ding-dong" style notification
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        // Quick fade in/out to avoid clicking sounds
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.15, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      };

      playTone(880, 0, 0.15); // A5
      playTone(1108.73, 0.12, 0.2); // C#6
    } catch (err) {
      console.error("Failed to play notification sound:", err);
    }
  }, []);

  return playNotificationSound;
}