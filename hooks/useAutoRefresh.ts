import { useEffect, useRef } from "react";

/**
 * Triggers a soft data refresh when the browser tab becomes visible again
 * or the window regains focus. Throttled to avoid excessive API calls.
 *
 * Usage:
 *   useAutoRefresh(fetchData);          // defaults to 5 s throttle
 *   useAutoRefresh(fetchData, 10_000);  // 10 s throttle
 */
export function useAutoRefresh(refresh: () => void, throttleMs = 5000): void {
  const refreshRef     = useRef(refresh);
  const lastRefreshRef = useRef(0);

  // Always call the latest version of refresh (no stale closure)
  useEffect(() => { refreshRef.current = refresh; });

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < throttleMs) return;
      lastRefreshRef.current = now;
      refreshRef.current();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [throttleMs]);
}
