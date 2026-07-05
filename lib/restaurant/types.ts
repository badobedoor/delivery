/**
 * Shared restaurant domain types.
 *
 * This module is the single source of truth for all restaurant-related
 * domain models used across customer-facing pages, admin panels, and
 * any future shared components.
 *
 * ── Naming convention ──
 * DB-level types (matching Supabase column names) use snake_case fields.
 * UI/presentation types use camelCase fields.
 *
 * ── Type aliases ──
 * Some consuming files use different local names for the same concept
 * (e.g. `Extra` vs `ItemExtra`, `Meal` vs `SheetMeal`).  Those files
 * should import with renaming (`import { ItemExtra as Extra }`)
 * to avoid churn inside their implementation.  The canonical name is
 * the more precise / domain-aligned one.
 */

/* ──────────────────────────────────────────────
   DB-level types (match Supabase row shapes)
   ────────────────────────────────────────────── */

export interface ItemExtra {
  id: number;
  name: string;
  price: number;
}

export interface ExtraGroup {
  id: number;
  name: string;
  type: string;
  required: boolean;
  max_select: number;
  item_extras: ItemExtra[];
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number;
  image_url: string | null;
  extra_groups: ExtraGroup[];
  offer_price?: number | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
  offer_image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_best_seller?: boolean;
}

export interface Category {
  id: number;
  name: string;
  restaurant_id: string;
  sort_order?: number;
  menu_items: MenuItem[];
}

/* ──────────────────────────────────────────────
   UI / presentation types (camelCase)
   ────────────────────────────────────────────── */

export interface Size {
  id: string;
  name: string;
  price?: number;
}

export interface ExtraGroupSheet {
  id: number;
  name: string;
  maxSelect: number;
  extras: ItemExtra[];
}

export interface SheetMeal {
  id: number;
  name: string;
  description?: string | null;
  basePrice: number;
  img: string;
  offerPrice?: number;
  offerStartsAt?: string;
  offerEndsAt?: string;
  offerImageUrl?: string;
  extras?: ItemExtra[];
  extraGroups?: ExtraGroupSheet[];
  sizes?: Size[];
}
