import { supabase } from "./supabase";
import { isRestaurantOpen } from "./utils";

/* ── Shared return type ── */
export type SearchMeal = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  restaurant_id: string;
  offer_price: number | null;
  offer_image_url: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  restaurants: {
    name: string;
    is_active: boolean;
    status: string | null;
    opens_at: string | null;
    closes_at: string | null;
  } | null;
  categories: { name: string } | null;
};

/* ── Named constants ── */
const SEARCH_A_LIMIT = 80;      // Max meals returned by name/description search
const FINAL_RESULTS_LIMIT = 60; // Hard cap on the merged + filtered result set

/**
 * Search meals by matching ANY of:
 *   - meal name
 *   - meal description
 *   - category name
 *
 * Two independent queries are executed in parallel:
 *   Search A — meals whose name or description contains the query
 *   Search B — meals whose category name contains the query
 *
 * Results are merged, deduplicated by id, and filtered to only
 * include meals from active & open restaurants.
 *
 * @param query  The search text
 */
export async function searchMeals(query: string): Promise<SearchMeal[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  /* ── Search A: meal name / description ── */
  const searchAPromise = supabase
    .from("menu_items")
    .select(
      "id, name, price, image_url, restaurant_id, offer_price, offer_image_url, offer_starts_at, offer_ends_at, restaurants(name, is_active, status, opens_at, closes_at), categories(name)",
    )
    .or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
    .eq("is_active", true)
    .limit(SEARCH_A_LIMIT);

  /* ── Search B step 1: find matching categories ── */
  const categoryPromise = supabase
    .from("categories")
    .select("id")
    .ilike("name", `%${trimmed}%`);

  const [searchAResult, categoryResult] = await Promise.all([searchAPromise, categoryPromise]);

  /* Merge into a Map keyed by id to deduplicate */
  const mealMap = new Map<number, SearchMeal>();

  for (const meal of (searchAResult.data ?? []) as unknown as SearchMeal[]) {
    mealMap.set(meal.id, meal);
  }

  /* ── Search B step 2: meals in matching categories ── */
  const categoryIds = ((categoryResult.data ?? []) as { id: number }[]).map((c) => c.id);

  if (categoryIds.length > 0) {
    const searchBResult = await supabase
      .from("menu_items")
      .select(
        "id, name, price, image_url, restaurant_id, offer_price, offer_image_url, offer_starts_at, offer_ends_at, restaurants(name, is_active, status, opens_at, closes_at), categories(name)",
      )
      .in("category_id", categoryIds)
      .eq("is_active", true);

    for (const meal of (searchBResult.data ?? []) as unknown as SearchMeal[]) {
      if (!mealMap.has(meal.id)) {
        mealMap.set(meal.id, meal);
      }
    }
  }

  /* Apply restaurant filters (active + open + status) */
  const filtered = Array.from(mealMap.values()).filter((item) => {
    const r = item.restaurants;
    if (!r || !r.is_active || r.status !== "نشط") return false;
    return isRestaurantOpen({
      is_active: r.is_active,
      opens_at: r.opens_at,
      closes_at: r.closes_at,
    });
  });

  /* Cap final output so the UI never renders more than 60 meals */
  return filtered.slice(0, FINAL_RESULTS_LIMIT);
}
