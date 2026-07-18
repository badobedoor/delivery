/**
 * Cairo timezone utilities — single source of truth for all date/time
 * operations in the project.
 *
 * ── Principles ──
 * - All database  timestamptz columns are UTC.
 * - All business logic ("today", "this shift") runs in Africa/Cairo.
 * - All date-range queries sent to the database use UTC-bound ISO strings
 *   so that Supabase comparisons are correct.
 * - All display strings use Arabic locale and Africa/Cairo timezone.
 *
 * ── Re-exports from lib/dateTime.ts ──
 *   formatCairoDate, formatCairoTime, formatCairoDateTime, CairoDateOptions
 *   Every existing import of "./dateTime" continues to work unchanged.
 *   New code should import from "./cairoTime" instead.
 */

/* ══════════════════════════════════════════════════════════════
   Re-export existing Cairo formatters (keeps a single API)
   ══════════════════════════════════════════════════════════════ */

export {
  formatCairoDate,
  formatCairoTime,
  formatCairoDateTime,
} from "./dateTime";

export type { CairoDateOptions } from "./dateTime";

/* ══════════════════════════════════════════════════════════════
   Timestamp parsing
   ══════════════════════════════════════════════════════════════ */

/**
 * Parse a Supabase timestamptz string safely.
 *
 * Supabase serialises timestamptz columns as ISO-8601 strings WITHOUT a
 * timezone suffix (e.g. `"2026-07-02T01:49:00.535214"`).  When JavaScript
 * parses that string with `new Date(…)` and there is no timezone marker,
 * ECMA-262 §20.3.1.15 says it MUST be treated as **local time** (the
 * browser's timezone), which causes a 2-3 hour offset in Egypt.
 *
 * This function appends "Z" (denoting UTC) to any timestamp that lacks a
 * timezone suffix, so the Date object is always constructed from the
 * correct UTC value.
 *
 * @param iso  Raw timestamp from Supabase (or null/undefined).
 * @returns    Date object (UTC-correct), or null on failure.
 */
export function parseTimestamp(
  iso: string | null | undefined,
): Date | null {
  if (iso == null) return null;
  if (typeof iso !== "string") return null;

  const trimmed = iso.trim();
  if (!trimmed) return null;

  // Append "Z" only when there is no timezone suffix at the end.
  const hasSuffix = /(Z|[+-]\d{2}:\d{2})$/.test(trimmed);
  const normalized = hasSuffix ? trimmed : trimmed + "Z";

  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

/* ══════════════════════════════════════════════════════════════
   Current Cairo time
   ══════════════════════════════════════════════════════════════ */

/**
 * Returns a Date representing the current instant in Africa/Cairo.
 *
 * The returned Date's wall-clock components (`.getHours()`, `.getDate()`,
 * etc.) correspond to Cairo local time.  Under the hood the Date still
 * stores epoch milliseconds, so arithmetic with other UTC dates is safe.
 */
export function nowCairo(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
}

/* ══════════════════════════════════════════════════════════════
   Cairo date strings  (YYYY-MM-DD)
   ══════════════════════════════════════════════════════════════ */

/**
 * Today's date in Cairo, formatted as `YYYY-MM-DD`.
 *
 * @example
 *   todayCairoDate()  // "2026-07-18" (when run in Cairo on July 18)
 */
export function todayCairoDate(): string {
  const c = nowCairo();
  const y = c.getFullYear();
  const m = String(c.getMonth() + 1).padStart(2, "0");
  const d = String(c.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Convert a Cairo-date string to a Cairo-local Date.
 *
 * @example
 *   toCairoDate("2026-07-18")  // Date for 2026-07-18 00:00:00 Cairo
 */
export function toCairoDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/* ══════════════════════════════════════════════════════════════
   UTC-bounded ISO strings  (for Supabase queries)
   ══════════════════════════════════════════════════════════════ */

/**
 * ISO-8601 UTC string for the start of today in Cairo.
 *
 * Use this in Supabase `.gte("created_at", …)` filters to get all
 * records from "today Cairo-time onwards".
 *
 * **Timezone-independent:** uses `Date.now()` (UTC epoch) combined with
 * Cairo wall-clock components from `nowCairo()`.  Pure integer arithmetic —
 * no date-string parsing, no local-timezone interpretation.
 *
 * @example
 *   startOfTodayCairo()  // "2026-07-17T21:00:00.000Z" (Cairo July 18 00:00 UTC)
 */
export function startOfTodayCairo(): string {
  const c = nowCairo();
  const msSinceMidnight = c.getHours() * 3_600_000
                        + c.getMinutes() * 60_000
                        + c.getSeconds() * 1_000
                        + c.getMilliseconds();
  // Date.now() is the correct UTC epoch regardless of runtime timezone.
  // Subtracting Cairo wall-clock duration-since-midnight gives us the
  // UTC epoch for Cairo midnight — pure integer arithmetic, no timezone
  // interpretation involved.
  return new Date(Date.now() - msSinceMidnight).toISOString();
}

/**
 * ISO-8601 UTC string for the end of today in Cairo.
 *
 * Use this in Supabase `.lte("created_at", …)` filters to get all
 * records up to the end of "today Cairo-time".
 *
 * **Timezone-independent:** uses `Date.now()` (UTC epoch) combined with
 * Cairo wall-clock components from `nowCairo()`.  Pure integer arithmetic —
 * no date-string parsing, no local-timezone interpretation.
 *
 * @example
 *   endOfTodayCairo()  // "2026-07-18T20:59:59.000Z" (Cairo July 18 23:59 UTC)
 */
export function endOfTodayCairo(): string {
  const c = nowCairo();
  const msSinceMidnight = c.getHours() * 3_600_000
                        + c.getMinutes() * 60_000
                        + c.getSeconds() * 1_000
                        + c.getMilliseconds();
  // Start from Date.now() (UTC epoch), subtract Cairo wall-clock
  // ms-since-midnight to reach Cairo midnight, then add 23h 59m 59s
  // (86_399_000 ms) to reach end of Cairo day.
  return new Date(Date.now() - msSinceMidnight + 86_399_000).toISOString();
}

/* ══════════════════════════════════════════════════════════════
   Cairo-date → UTC ISO  (for arbitrary date strings)
   ══════════════════════════════════════════════════════════════ */

/**
 * Compute the Africa/Cairo UTC offset (in minutes) for a given date.
 *
 * Timezone-independent: the diff between Cairo-formatted and UTC-formatted
 * epoch values cancels out the runtime timezone, leaving only the true
 * Cairo offset.
 */
function getCairoOffsetMinutes(dateStr: string): number {
  const utcDate = new Date(`${dateStr}T00:00:00Z`);
  const cairoStr = utcDate.toLocaleString("en", { timeZone: "Africa/Cairo" });
  const utcStr   = utcDate.toLocaleString("en", { timeZone: "UTC" });
  return (new Date(cairoStr).getTime() - new Date(utcStr).getTime()) / 60_000;
}

/**
 * Return the UTC ISO-8601 string for Cairo **midnight** on a given date.
 *
 * Use this in Supabase `.gte("created_at", …)` filters when you have a
 * user-entered YYYY-MM-DD date that should be interpreted as Cairo-local.
 *
 * **Timezone-independent:** uses `Date.UTC()` (pure UTC epoch) and the
 * Cairo UTC offset obtained via `Intl` formatting.  No local timezone
 * interpretation of the input string.
 *
 * @example
 *   startOfCairoDate("2026-07-18")  // "2026-07-17T21:00:00.000Z" (Cairo July 18 00:00 UTC)
 */
export function startOfCairoDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offsetMs = getCairoOffsetMinutes(dateStr) * 60_000;
  return new Date(utcMidnight - offsetMs).toISOString();
}

/**
 * Return the UTC ISO-8601 string for Cairo **end-of-day** (23:59:59) on a
 * given date.
 *
 * Use this in Supabase `.lte("created_at", …)` filters when you have a
 * user-entered YYYY-MM-DD date that should be interpreted as Cairo-local.
 *
 * **Timezone-independent:** same mechanism as `startOfCairoDate`.
 *
 * @example
 *   endOfCairoDate("2026-07-18")  // "2026-07-18T20:59:59.000Z" (Cairo July 18 23:59 UTC)
 */
export function endOfCairoDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offsetMs = getCairoOffsetMinutes(dateStr) * 60_000;
  return new Date(utcMidnight - offsetMs + 86_399_000).toISOString();
}
