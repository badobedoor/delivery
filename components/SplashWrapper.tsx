"use client";

import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "showing" | "done">("checking");

  console.log("[TIMELINE]", typeof window !== "undefined" ? performance.now().toFixed(1) : "SSR", "ms - SplashWrapper render, status=", status);

  useEffect(() => {
    console.log("[TIMELINE]", performance.now().toFixed(1), "ms - SplashWrapper useEffect runs (mount)");
    if (sessionStorage.getItem("splashShown")) {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - splashShown found in sessionStorage, status→done");
      setStatus("done");
    } else {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - no splashShown, status→showing");
      setStatus("showing");
    }
  }, []);

  if (status === "checking") {
    return <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999 }} />;
  }

  if (status === "showing") {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "#000", zIndex: 9998 }}>
        <SplashScreen
          onDone={() => {
            sessionStorage.setItem("splashShown", "1");
            setStatus("done");
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
