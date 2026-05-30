"use client";

import { useEffect, useState } from "react";

type Status = "online" | "offline" | "restored";

export default function NetworkStatus() {
  /* Lazy init: read navigator.onLine only on client after mount */
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    /* One-time sync on mount — runs in a microtask to satisfy the lint rule */
    const timer = setTimeout(() => {
      if (!navigator.onLine) setStatus("offline");
    }, 0);

    function handleOffline() {
      setStatus("offline");
    }

    function handleOnline() {
      setStatus("restored");
      /* Auto-hide after 3 s */
      setTimeout(() => setStatus(null), 3000);

      /* Emit a custom event so any page can react and refetch */
      window.dispatchEvent(new Event("network-restored"));
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (!status) return null;

  const isOffline   = status === "offline";
  const bg          = isOffline ? "#EF4444" : "#22C55E";
  const icon        = isOffline ? "⚠️" : "✅";
  const msg         = isOffline
    ? "انت مش متصل بالإنترنت — البيانات المعروضة قد لا تكون محدثة"
    : "تم استعادة الاتصال — جاري تحديث البيانات...";

  return (
    <div
      style={{
        position:        "fixed",
        top:             0,
        insetInline:     0,
        zIndex:          9999,
        background:      bg,
        color:           "#fff",
        direction:       "rtl",
        fontFamily:      "var(--font-cairo), Arial, sans-serif",
        padding:         "10px 16px",
        textAlign:       "center",
        fontSize:        "13px",
        fontWeight:      700,
        letterSpacing:   "0.01em",
        boxShadow:       "0 2px 8px rgba(0,0,0,0.25)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             "6px",
      }}
    >
      <span>{icon}</span>
      <span>{msg}</span>
    </div>
  );
}
