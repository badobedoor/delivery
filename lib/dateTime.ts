/**
 * Single source of truth for all date/time formatting in the project.
 *
 * ── Context ──
 * Supabase/PostgREST serialises 	imestamptz columns as ISO-8601 strings
 * WITHOUT a timezone suffix. The raw value from the database (which is UTC)
 * arrives looking like:   "2026-07-02T01:49:00.535214"
 *
 * When JavaScript parses that string with 
ew Date(…) and there is no
 * timezone marker, ECMA-262 §20.3.1.15 says it MUST be treated as **local
 * time** (the browser's timezone).  This causes a 2-3 hour offset in Egypt
 * because the actual value is UTC, not Africa/Cairo.
 *
 * The fix: append "Z" to tell JS the value is UTC, then format with
 * timeZone: "Africa/Cairo".  This is the pattern already used by admin
 * pages (admin/orders, admin/archive, admin/delivery-requests); this
 * module makes it the single shared implementation for the whole project.
 */

/* ── Internal helpers ── */

/** Attempt to parse a Supabase timestamp safely.  Returns null on failure. */
function parseSafe(iso: string | null | undefined): Date | null {
  if (iso == null) return null;
  if (typeof iso !== "string") return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;

  // Append "Z" if the string has no timezone suffix at the end.
  // Must check only the end — the string itself contains "-" in the date part
  // (e.g. "2026-07-02") which should not prevent "Z" from being appended.
  const hasTimezoneSuffix = /(Z|[+-]\d{2}:\d{2})$/.test(trimmed);
  const normalized = hasTimezoneSuffix ? trimmed : trimmed + "Z";
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

/* ── Public API ── */

/**
 * Options accepted by ormatCairoDate.
 *
 * All fields are optional — when omitted the helper chooses a sensible
 * default that matches the most common project usage (long month, numeric
 * year, numeric day).
 */
export type CairoDateOptions = {
  /** Show year (default true).  Set false to hide. */
  year?: "numeric" | "2-digit" | false;
  /** Month style (default "long").  Set false to hide. */
  month?: "long" | "short" | "numeric" | "2-digit" | false;
  /** Day style (default "numeric").  Set false to hide. */
  day?: "numeric" | "2-digit" | false;
  /** Weekday style (default omitted — not shown). */
  weekday?: "long" | "short" | "narrow";
};

/**
 * Format a Supabase timestamp as a date **only** (no time) in
 * Africa/Cairo timezone using Arabic locale.
 *
 * @param iso     The raw timestamp string from Supabase (or null/undefined).
 * @param options Control which fields appear.
 * @returns       Localised date string, or "—" on failure.
 *
 * @example
 *   formatCairoDate("2026-07-02T01:49:00.535214")
 *   // => "٢ يوليو ٢٠٢٦"
 *
 *   formatCairoDate("2026-07-02T01:49:00.535214", { year: false })
 *   // => "٢ يوليو"
 *
 *   formatCairoDate("2026-07-02T01:49:00.535214", { month: "short" })
 *   // => "٢ يول ٢٠٢٦"
 *
 *   formatCairoDate("2026-07-02T01:49:00.535214", { weekday: "short" })
 *   // => "الخميس ٢ يوليو ٢٠٢٦"
 */
export function formatCairoDate(
  iso: string | null | undefined,
  options?: CairoDateOptions,
): string {
  const d = parseSafe(iso);
  if (!d) return "—";

  const fmt: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Cairo",
  };

  // Day — default to "numeric" unless explicitly set to false
  if (options?.day !== false) {
    fmt.day = options?.day ?? "numeric";
  }

  // Month — default to "long" unless explicitly set to false
  if (options?.month !== false) {
    fmt.month = options?.month ?? "long";
  }

  // Year — default to "numeric" unless explicitly set to false
  if (options?.year !== false) {
    fmt.year = options?.year ?? "numeric";
  }

  // Weekday — only shown when explicitly requested
  if (options?.weekday) {
    fmt.weekday = options.weekday;
  }

  return d.toLocaleDateString("ar-EG", fmt);
}

/**
 * Format a Supabase timestamp as **time only** (HH:MM) in
 * Africa/Cairo timezone using Arabic locale.
 *
 * @param iso  The raw timestamp string from Supabase (or null/undefined).
 * @returns    Localised time string (e.g. "٠٤:٤٩"), or "—" on failure.
 *
 * @example
 *   formatCairoTime("2026-07-02T01:49:00.535214")
 *   // => "٠٤:٤٩"
 */
export function formatCairoTime(iso: string | null | undefined): string {
  const d = parseSafe(iso);
  if (!d) return "—";
  return d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

/**
 * Format a Supabase timestamp as **date + time** in Africa/Cairo
 * timezone using Arabic locale.
 *
 * Equivalent to calling ormatCairoDate and ormatCairoTime together.
 *
 * @param iso  The raw timestamp string from Supabase (or null/undefined).
 * @returns    Localised date+time string, or "—" on failure.
 *
 * @example
 *   formatCairoDateTime("2026-07-02T01:49:00.535214")
 *   // => "٢ يوليو ٢٠٢٦ ٠٤:٤٩"
 */
export function formatCairoDateTime(iso: string | null | undefined): string {
  const d = parseSafe(iso);
  if (!d) return "—";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}
