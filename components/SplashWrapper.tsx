"use client";

import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "showing" | "done">("checking");

  useEffect(() => {
    if (sessionStorage.getItem("splashShown")) {
      setStatus("done");
    } else {
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
