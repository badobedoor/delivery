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
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isInstalled());

  /* Listen for the beforeinstallprompt event (Chrome Android) */
  useEffect(() => {
    if (installed) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [installed]);

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
