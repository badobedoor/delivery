"use client";

import { useEffect, useRef, useState } from "react";

type Phase = 1 | 3;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>(1);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    console.log('SplashScreen mounted');
    const t1 = setTimeout(() => setPhase(3), 1500);
    const t2 = setTimeout(() => onDoneRef.current(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const fullScreen: React.CSSProperties = {
    position:  "fixed",
    inset:     0,
    width:     "100vw",
    height:    "100vh",
    zIndex:    9999,
    overflow:  "hidden",
  };

  const coverImg: React.CSSProperties = {
    width:          "100%",
    height:         "100%",
    objectFit:      "cover",
    objectPosition: "center",
    display:        "block",
  };

  return (
    <>
      <style>{`
        @keyframes moto-zoom {
          from { transform: scale(0.3); opacity: 0.7; }
          to   { transform: scale(3);   opacity: 1;   }
        }
        @keyframes hala-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* المرحلة 1 — موتوسيكل يكبر */}
      {phase === 1 && (
        <div style={{ ...fullScreen, background: "#000", animation: "moto-zoom 1.5s ease-in forwards" }}>
          <img src="/images/splash-moto.png" alt="" style={coverImg} />
        </div>
      )}

      {/* المرحلة 3 — لوجو حالا يظهر */}
      {phase === 3 && (
        <div style={{ ...fullScreen, background: "#000", animation: "hala-fadein 1.5s ease-out forwards" }}>
          <img src="/images/splash-hala.png" alt="حالا" style={coverImg} />
        </div>
      )}
    </>
  );
}
