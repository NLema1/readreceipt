import { useEffect, useRef, useState } from "react";

export function usePolling(fn, intervalMs, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const result = await fn();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function schedule() {
      clearTimeout(timerRef.current);
      if (document.hidden) return;
      timerRef.current = setTimeout(async () => {
        await tick();
        schedule();
      }, intervalMs);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerRef.current);
      } else {
        tick().then(schedule);
      }
    }

    tick().then(schedule);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}
