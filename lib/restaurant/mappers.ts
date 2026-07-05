/**
 * Pure restaurant domain mapping functions.
 *
 * Every function in this module is:
 *  - Pure (no side effects)
 *  - Stateless
 *  - Free of React, browser, UI, cart, and order-editing dependencies
 *
 * These are the canonical transformations between DB-level restaurant
 * models (lib/restaurant/types.ts) and UI/presentation models.
 */

import { MenuItem, SheetMeal } from "./types";

/**
 * Transform a DB MenuItem (with nested extra_groups, offers, etc.)
 * into the SheetMeal shape consumed by the meal configuration UI
 * (MealBottomSheet and future shared components).
 *
 * Handles:
 *  - Splitting extra groups into "variant" (→ sizes) and regular extras
 *  - Normalising null → undefined for optional offer fields
 *  - Providing a fallback image URL when none is set
 *  - Omitting empty arrays (extras, extraGroups, sizes) so the consumer
 *    can simply check for `undefined`.
 */
export function toSheetMeal(item: MenuItem): SheetMeal {
  const nonVariantGroups = item.extra_groups.filter((g) => g.type !== "variant");
  const extras = nonVariantGroups.flatMap((g) => g.item_extras.map((e) => ({ id: e.id, name: e.name, price: e.price })));
  const extraGroups = nonVariantGroups.map((g) => ({
    id: g.id,
    name: g.name,
    maxSelect: g.max_select,
    extras: g.item_extras.map((e) => ({ id: e.id, name: e.name, price: e.price })),
  }));
  const variantGroup = item.extra_groups.find((g) => g.type === "variant");
  const sizes = variantGroup?.item_extras.map((e) => ({ id: String(e.id), name: e.name, price: e.price }));
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    basePrice: item.price,
    img: item.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
    offerPrice: item.offer_price ?? undefined,
    offerStartsAt: item.offer_starts_at ?? undefined,
    offerEndsAt: item.offer_ends_at ?? undefined,
    offerImageUrl: item.offer_image_url ?? undefined,
    extras: extras.length > 0 ? extras : undefined,
    extraGroups: extraGroups.length > 0 ? extraGroups : undefined,
    sizes: sizes && sizes.length > 0 ? sizes : undefined,
  };
}
