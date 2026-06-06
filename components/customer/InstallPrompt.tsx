"use client";

import { useEffect, useState } from "react";

const INSTALL_KEY   = "app_installed";
const SHOWN_KEY     = "install_prompt_last_shown";
const TWO_DAYS_MS   = 2 * 24 * 60 * 60 * 1000;

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  if (localStorage.getItem(INSTALL_KEY)) return false;
  const last = localStorage.getItem(SHOWN_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last) >= TWO_DAYS_MS;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible,        setVisible]        = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
      localStorage.setItem(SHOWN_KEY, Date.now().toString());
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(INSTALL_KEY, "true");
    }
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(SHOWN_KEY, Date.now().toString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl p-4 shadow-xl"
      style={{ background: "#FF6000", maxWidth: 400, margin: "0 auto" }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 32 }}>📲</span>
        <div className="flex-1">
          <p className="text-white font-black text-sm">ثبّت تطبيق حالا</p>
          <p className="text-white/80 text-xs mt-0.5">وصول أسرع وتجربة أفضل</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-[#FF6000] font-black text-sm py-2 rounded-xl"
        >
          ثبّت الآن
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 bg-white/20 text-white font-bold text-sm py-2 rounded-xl"
        >
          لا شكراً
        </button>
      </div>
    </div>
  );
}
