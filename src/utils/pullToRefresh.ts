import { useEffect, useRef, useState } from 'react';

// Sent on window when the user pulls down to refresh; components that hold their own data
// (such as the device location on the time clock) listen for it and re-check
export const PULL_REFRESH_EVENT = 'cpr:pull-refresh';

const TRIGGER_DISTANCE = 70; // px of (damped) pull needed to refresh
const MAX_PULL = 100;

// Pull-to-refresh for touch screens. Ignores pulls that start inside pop-ups or fixed bars.
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let startY: number | null = null;
    let distance = 0;
    let busy = false;

    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (busy || window.scrollY > 0 || e.touches.length !== 1 || target?.closest('.fixed')) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      distance = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) {
        distance = 0;
        setPull(0);
        return;
      }
      distance = Math.min(dy * 0.5, MAX_PULL);
      setPull(distance);
    };

    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (distance < TRIGGER_DISTANCE) {
        setPull(0);
        return;
      }
      busy = true;
      setRefreshing(true);
      setPull(TRIGGER_DISTANCE);
      window.dispatchEvent(new Event(PULL_REFRESH_EVENT));
      try {
        // Keep the spinner up briefly so the refresh is noticeable even when it is instant
        await Promise.all([onRefreshRef.current(), new Promise((r) => setTimeout(r, 600))]);
      } finally {
        busy = false;
        setRefreshing(false);
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return { pull, refreshing, ready: pull >= TRIGGER_DISTANCE };
}
