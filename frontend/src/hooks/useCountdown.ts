import { useState, useEffect, useRef } from 'react';

/**
 * Hook for a countdown timer from a Unix timestamp.
 * Updates every second. Returns remaining seconds and formatted display string.
 */
export function useCountdown(expiresAt: number): {
  remaining: number;
  display: string;
  isExpired: boolean;
  isWarning: boolean;
} {
  const [remaining, setRemaining] = useState(calcRemaining(expiresAt));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function calcRemaining(expires: number): number {
    return Math.max(0, expires - Math.floor(Date.now() / 1000));
  }

  useEffect(() => {
    setRemaining(calcRemaining(expiresAt));

    timerRef.current = setInterval(() => {
      const r = calcRemaining(expiresAt);
      setRemaining(r);
      if (r <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [expiresAt]);

  const isExpired = remaining <= 0;
  const isWarning = remaining > 0 && remaining < 60;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return { remaining, display, isExpired, isWarning };
}
