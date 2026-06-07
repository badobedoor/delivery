"use client";

import { useEffect, useRef } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      dir="rtl"
      className="flex flex-col items-center justify-center"
      style={{ position: "fixed", inset: 0, background: "#ffffff", zIndex: 9999 }}
    >
      <style>{`
        @keyframes splash-ring {
          0%   { transform: scale(0.8); opacity: 0.35; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes splash-dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1.15); }
        }

        .splash-ring-1 { animation: splash-ring 3s ease-out infinite; }
        .splash-ring-2 { animation: splash-ring 3s ease-out infinite 1.5s; }

        .splash-dot-1 { animation: splash-dot-pulse 1.4s ease-in-out infinite; }
        .splash-dot-2 { animation: splash-dot-pulse 1.4s ease-in-out infinite 0.2s; }
        .splash-dot-3 { animation: splash-dot-pulse 1.4s ease-in-out infinite 0.4s; }
      `}</style>

      {/* صندوق الصورة */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 320, height: 220 }}
      >
        {/* الدوائر الخفيفة - ring effect */}
        <span
          className="splash-ring-1 absolute rounded-full"
          style={{ width: 160, height: 160, border: "2px solid rgba(255,96,0,0.25)" }}
        />
        <span
          className="splash-ring-2 absolute rounded-full"
          style={{ width: 160, height: 160, border: "2px solid rgba(255,96,0,0.25)" }}
        />

        {/* الموتسكل بالخلفية البيضا */}
        <img
          src="/splash-logo-1.png"
          alt="حالاً دلفري"
          className="absolute"
          style={{ width: 320, height: 220, objectFit: "contain" }}
        />
      </div>

      {/* النصوص */}
      <h1
        className="font-[var(--font-cairo)]"
        style={{ color: "#FF6000", fontSize: 28, fontWeight: 900, marginTop: 8 }}
      >
        حالاً دلفري
      </h1>
      <p style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
        توصيل سريع لباب بيتك
      </p>

      {/* النقاط النابضة */}
      <div className="flex items-center gap-2" style={{ marginTop: 16 }}>
        <span
          className="splash-dot-1 rounded-full"
          style={{ width: 8, height: 8, background: "#FF6000" }}
        />
        <span
          className="splash-dot-2 rounded-full"
          style={{ width: 8, height: 8, background: "#FF6000" }}
        />
        <span
          className="splash-dot-3 rounded-full"
          style={{ width: 8, height: 8, background: "#FF6000" }}
        />
      </div>
    </div>
  );
}
