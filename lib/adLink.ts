/**
 * Advertisement link normalizer.
 *
 * Admins may save links in any of these forms:
 *   - Internal path:            /favorites
 *   - Full current-origin URL:  http://localhost:3000/favorites
 *   - Full production domain:   https://www.halan.delivery/favorites
 *   - Domain without www:       https://halan.delivery/offers
 *
 * This function normalises the link at navigation time (without touching
 * database values) so that:
 *   - Internal routes stay inside the SPA via Next.js router.push()
 *   - External URLs open via window.location.href
 *
 * Origins recognised as internal:
 *   1. The current window.location.origin (dev, staging, production)
 *   2. https://halan.delivery
 *   3. https://www.halan.delivery
 */

const INTERNAL_ORIGINS: readonly string[] = [
  "https://halan.delivery",
  "https://www.halan.delivery",
];

export type NormalizedLink = {
  /** The URL or path to navigate to */
  href: string;
  /** True if this should open as an external URL */
  isExternal: boolean;
};

/**
 * @param link           The raw link from the database
 * @param currentOrigin  Optional – defaults to window.location.origin on
 *                       the client. Pass explicitly when window is unavailable.
 */
export function normalizeAdLink(
  link: string,
  currentOrigin?: string,
): NormalizedLink {
  const trimmed = link.trim();

  // ── Already an internal path ──
  if (trimmed.startsWith("/")) {
    return { href: trimmed, isExternal: false };
  }

  // ── Try to parse as a full URL ──
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Not a valid URL → treat as an internal path
    return { href: trimmed.startsWith("/") ? trimmed : `/${trimmed}`, isExternal: false };
  }

  // Determine the "current" origin so development/staging also works
  const origin =
    currentOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");

  // If the link's origin matches the current origin or a known Hala
  // domain, keep navigation inside the SPA.
  if (
    (origin && url.origin === origin) ||
    INTERNAL_ORIGINS.includes(url.origin)
  ) {
    return {
      href: url.pathname + url.search + url.hash,
      isExternal: false,
    };
  }

  // ── Different origin → external URL ──
  return { href: trimmed, isExternal: true };
}
