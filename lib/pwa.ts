/**
 * Pure PWA detection helpers — Single Source of Truth.
 * No React, no UI, no side effects beyond localStorage writes.
 */

const INSTALLED_KEY    = "hala_installed";
const OLD_INSTALLED_KEY = "app_installed";

/** True when the app is already running as a standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/** True when the app has been installed (standalone OR previously marked). */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return true;
  /* Check the new key AND the old key for backward compatibility */
  return (
    localStorage.getItem(INSTALLED_KEY) === "true" ||
    localStorage.getItem(OLD_INSTALLED_KEY) === "true"
  );
}

/** True on iPhone / iPad / iPod regardless of browser. */
export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** True on any mobile device (phone or tablet). */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0)
  );
}

/** True when the current browser supports PWA installation.
 *  Android Chrome has the beforeinstallprompt API.
 *  iOS Safari supports manual Add to Home Screen. */
export function isInstallSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isIos()) return true;
  return /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
}

/** Mark the app as permanently installed. */
export function markInstalled(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTALLED_KEY, "true");
}
