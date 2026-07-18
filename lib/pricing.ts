/**
 * Shared pricing logic — single source of truth for meal pricing decisions.
 *
 * Every component / page that needs to display or charge a meal price must
 * call `getEffectiveMealPrice()`.  No inline price calculations are allowed.
 */

import { parseTimestamp } from "@/lib/cairoTime";

/* ── The minimal shape a meal object must provide ── */
export type MealPricingData = {
  price: number;
  offer_price?: number | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
  offerPrice?: number | null;
  offerStartsAt?: string | null;
  offerEndsAt?: string | null;
};

/* ── Helpers ── */

/**
 * Returns `true` when the meal has a non‑null offer_price AND the current
 * Cairo time falls within the offer's start/end window.
 *
 * Both `offer_starts_at` and `offer_ends_at` from Supabase are timestamptz
 * stored in UTC.  We parse them as UTC via `parseTimestamp()` and compare
 * against `Date.now()` (also UTC epoch), so the comparison is correct
 * regardless of the browser's local timezone.
 */
export function isOfferActive(meal: MealPricingData): boolean {
  const offerPrice = meal.offer_price ?? meal.offerPrice;
  const startsAt   = meal.offer_starts_at ?? meal.offerStartsAt;
  const endsAt     = meal.offer_ends_at ?? meal.offerEndsAt;

  if (offerPrice == null || !startsAt || !endsAt) return false;

  const start = parseTimestamp(startsAt);
  const end   = parseTimestamp(endsAt);
  if (!start || !end) return false;

  const nowMs = Date.now();
  return nowMs >= start.getTime() && nowMs <= end.getTime();
}

/**
 * Returns the price that should be **charged / displayed** to the customer.
 *
 * - When an active offer exists → `offer_price`
 * - Otherwise → `price`
 */
export function getEffectiveMealPrice(meal: MealPricingData): number {
  return isOfferActive(meal) ? (meal.offer_price ?? meal.offerPrice ?? meal.price) : meal.price;
}
