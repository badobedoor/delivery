"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section is currently visible in the viewport.
 *
 * Uses IntersectionObserver to detect which category section occupies
 * the top of the visible area (after accounting for a sticky header).
 *
 * Each observed element MUST have a `data-category-id` attribute whose
 * value matches its key in the `sectionRefs` Map.
 *
 * @param sectionRefs – A mutable ref containing a Map of id → DOM element
 *                      for each category section. Populated via callback refs.
 * @param headerOffset – Height of the sticky category bar in pixels.
 * @param deps         – Extra dependencies to re-initialize the observer
 *                       (e.g. `[categories]` so it starts observing after data loads).
 * @returns The id of the currently active (most visible) section, or null.
 */
export function useScrollSpy(
  sectionRefs: React.MutableRefObject<Map<string, HTMLElement>>,
  headerOffset: number,
  deps: React.DependencyList = [],
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const map = sectionRefs.current;
    if (map.size === 0) return;

    const visibility = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const catId = entry.target.getAttribute("data-category-id");
          if (!catId) return;
          const prev = visibility.get(catId) ?? false;
          if (prev !== entry.isIntersecting) {
            visibility.set(catId, entry.isIntersecting);
            changed = true;
          }
        });

        if (!changed) return;

        // Walk sections in registration order (same as DOM/category order);
        // pick the first one that is currently intersecting.
        for (const key of map.keys()) {
          if (visibility.get(key)) {
            setActiveId(key);
            return;
          }
        }
      },
      {
        rootMargin: `-${headerOffset}px 0px -50% 0px`,
        threshold: 0,
      },
    );

    map.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRefs, headerOffset, ...deps]);

  return activeId;
}
