import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to the target value using requestAnimationFrame.
 * Returns the current animated value.
 */
export function useAnimatedNumber(
  target: number,
  duration: number = 1000,
  enabled: boolean = true
): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    const startValue = prevTargetRef.current;
    const diff = target - startValue;

    if (diff === 0) return;

    startTimeRef.current = null;

    const easeOut = (t: number): number => {
      return 1 - Math.pow(1 - t, 3); // cubic ease-out
    };

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      const value = startValue + diff * easedProgress;
      setCurrent(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevTargetRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration, enabled]);

  return current;
}
