import { useState, useEffect, useCallback } from "react";
import {
  isInstalled,
  isIos,
  isMobile,
  isInstallSupported,
  markInstalled,
} from "@/lib/pwa";

/**
 * Single Source of Truth for PWA install state in React components.
 *
 * Returns:
 *  - canInstall      – whether the Install Card should be visible
 *  - installed       – whether the app has been installed
 *  - isIOS           – whether the device is iOS (for bottom-sheet vs. native)
 *  - promptAvailable – whether the deferred beforeinstallprompt has fired (Android)
 *  - install         – triggers the native install prompt (Android only)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(() => {
    if (typeof window !== "undefined") console.log("[TIMELINE]", performance.now().toFixed(1), "ms - deferredPrompt init null");
    return null;
  });
  const [installed, setInstalled] = useState<boolean>(() => {
    const v = isInstalled();
    if (typeof window !== "undefined") console.log("[TIMELINE]", performance.now().toFixed(1), "ms - installed init", v);
    return v;
  });

  if (typeof window !== "undefined") console.log("[TIMELINE]", performance.now().toFixed(1), "ms - usePWAInstall render start");

  /* Listen for the beforeinstallprompt event (Chrome Android) */
  useEffect(() => {
    console.log("[TIMELINE]", performance.now().toFixed(1), "ms - usePWAInstall useEffect runs, installed=", installed);
    if (installed) {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - installed=true, skipping listener");
      return;
    }

    function onBeforeInstall(e: Event) {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - beforeinstallprompt FIRED! preventDefault called");
      e.preventDefault();
      setDeferredPrompt(e);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    console.log("[TIMELINE]", performance.now().toFixed(1), "ms - beforeinstallprompt LISTENER ADDED");
    return () => {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - beforeinstallprompt LISTENER REMOVED");
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [installed]);

  /* Listen for the appinstalled event */
  useEffect(() => {
    function onAppInstalled() {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - appinstalled FIRED");
    }
    window.addEventListener("appinstalled", onAppInstalled);
    console.log("[TIMELINE]", performance.now().toFixed(1), "ms - appinstalled LISTENER ADDED");
    return () => {
      console.log("[TIMELINE]", performance.now().toFixed(1), "ms - appinstalled LISTENER REMOVED");
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canInstall = !installed && isMobile() && isInstallSupported();
  const promptAvailable = deferredPrompt !== null;

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      markInstalled();
      setInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return { canInstall, installed, isIOS: isIos(), promptAvailable, install };
}
