"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { supabase } from "@/lib/supabase";
import { isRestaurantOpen } from "@/lib/utils";
import { getEffectiveMealPrice } from "@/lib/pricing";
import { ItemExtra, ExtraGroup, MenuItem, Category, ExtraGroupSheet, SheetMeal } from "@/lib/restaurant/types";
import { toSheetMeal } from "@/lib/restaurant/mappers";
import MealCard from "@/components/shared/restaurant/MealCard";
import { addToCart, clearCart, getCart, updateQty, CartItem } from "@/lib/cart";
import { formatCairoDate, formatCairoTime } from "@/lib/dateTime";
import ConfirmModal from "@/components/customer/ConfirmModal";
import MealBottomSheet from "@/components/customer/MealBottomSheet";
import CartBar from "@/components/customer/CartBar";

/* ── Local (file-specific) types ── */
type Restaurant = { id: string; name: string; description: string | null; cover_image_url: string | null; image_url: string | null; is_active: boolean; opens_at: string | null; closes_at: string | null; status: string | null; rating_avg: number | null; rating_count: number | null };

function formatPrice(p: number) {
  return `${p} ج`;
}

/* ── Quantity counter for items without extras ── */
interface QtyProps {
  itemId: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
}

function QuantityCounter({ itemId, name, price, description, imageUrl, restaurantId, restaurantName }: QtyProps) {
  const router = useRouter();
  const [qty,         setQty]         = useState(() => getCart()?.items.find((i) => i.id === itemId)?.qty ?? 0);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const pendingItem = useRef<CartItem | null>(null);

  async function handleAdd() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      document.cookie = `hala_return_to=${encodeURIComponent(JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY }))}; path=/; max-age=600; SameSite=Lax`;
      router.push("/login");
      return;
    }
    const cartItem: CartItem = { id: itemId, name, price, qty: 1, image_url: imageUrl, description };
    const result = addToCart(restaurantId, restaurantName, cartItem);
    if (result.conflict) {
      pendingItem.current = cartItem;
      setConflictMsg(`سلتك فيها طلب من ${result.conflictName}، هل تريد مسحها والبدء من جديد؟`);
    } else {
      setQty(1);
    }
  }

  function handleIncrease() {
    const newQty = qty + 1;
    updateQty(itemId, newQty);
    setQty(newQty);
  }

  function handleDecrease() {
    const newQty = qty - 1;
    updateQty(itemId, newQty);
    setQty(newQty);
  }

  return (
    <>
      {qty === 0 ? (
        <button
          onClick={handleAdd}
          className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* + — أول عنصر → يمين في RTL */}
          <button
            onClick={handleIncrease}
            className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="text-sm font-bold text-[var(--color-secondary)] w-5 text-center">{qty}</span>
          {/* - — آخر عنصر → يسار في RTL */}
          <button
            onClick={handleDecrease}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      )}
      <ConfirmModal
        isOpen={conflictMsg !== null}
        message={conflictMsg ?? ""}
        onConfirm={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            document.cookie = `hala_return_to=${encodeURIComponent(JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY }))}; path=/; max-age=600; SameSite=Lax`;
            router.push("/login");
            return;
          }
          if (pendingItem.current) {
            clearCart();
            addToCart(restaurantId, restaurantName, pendingItem.current);
            pendingItem.current = null;
            setQty(1);
          }
          setConflictMsg(null);
        }}
        onCancel={() => {
          pendingItem.current = null;
          setConflictMsg(null);
        }}
      />
    </>
  );
}

function RestaurantPageContent() {
  const params        = useParams();
  const id            = params.id as string;
  const searchParams  = useSearchParams();
  const categoryParam = searchParams.get("category");
  const router        = useRouter();

  const [restaurant,  setRestaurant]  = useState<Restaurant | null>(null);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [sheetMeal,   setSheetMeal]   = useState<SheetMeal | null>(null);
  /* ── Section refs for scroll-spy and scroll-to navigation ── */
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const STICKY_BAR_HEIGHT = 56;
  const HEADER_OFFSET = STICKY_BAR_HEIGHT;
  const activeCategory = useScrollSpy(sectionRefs, STICKY_BAR_HEIGHT, [categories]);
  /* ── Back-button handling for MealBottomSheet ── */
  const hasHistoryEntry    = useRef(false);
  const ignoreNextPopstate = useRef(false);
  const isSheetOpen = sheetMeal !== null;

  useEffect(() => {
    if (!isSheetOpen) return;
    function handlePopState() {
      if (ignoreNextPopstate.current) {
        ignoreNextPopstate.current = false;
        return;
      }
      hasHistoryEntry.current = false;
      setSheetMeal(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      hasHistoryEntry.current    = false;
      ignoreNextPopstate.current = false;
    };
  }, [isSheetOpen]);

  function closeSheet() {
    setSheetMeal(null);
    if (hasHistoryEntry.current) {
      ignoreNextPopstate.current = true;
      window.history.back();
      hasHistoryEntry.current = false;
    }
  }

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);
      setError(null);

      const [restResult, catsResult] = await Promise.all([
        supabase.from("restaurants").select("id, name, description, cover_image_url, image_url, is_active, opens_at, closes_at, status, rating_avg, rating_count").eq("id", id).single(),
        supabase.from("categories")
          .select("id, name, restaurant_id, menu_items(id, name, description, price, category_id, image_url, offer_price, offer_starts_at, offer_ends_at, offer_image_url, sort_order, is_active, is_best_seller, extra_groups(id, name, type, required, max_select, item_extras(id, name, price)))")
          .eq("restaurant_id", id)
          .order("sort_order", { ascending: true }),
      ]);

      if (restResult.error || !restResult.data) {
        setError("تعذّر تحميل بيانات المطعم");
        setLoading(false);
        return;
      }

      const rest = restResult.data;

      /* redirect لأي حالة غير "نشط + جوا التوقيت" */
      if (rest.status !== "نشط" || !isRestaurantOpen(rest)) {
        router.replace("/restaurants");
        return;
      }

      setRestaurant(rest);

      if (!catsResult.error && catsResult.data) {
        const cats = (catsResult.data as Category[]).map((cat) => ({
          ...cat,
          menu_items: [...cat.menu_items]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        })).filter((cat) => cat.menu_items.some((m) => m.is_active !== false));

        // قسم وهمي "الأكثر مبيعاً" — يُجمَع من كل الأقسام
        const bestSellers = cats.flatMap((cat) =>
          cat.menu_items.filter((m) => m.is_best_seller === true && m.is_active !== false)
        );
        const displayCats: Category[] = bestSellers.length > 0
          ? [{ id: -1, name: "الأكثر مبيعاً ⭐", restaurant_id: id, menu_items: bestSellers }, ...cats]
          : cats;

        setCategories(displayCats);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  /* ── Deep-link: scroll to the requested category on initial load ── */
  useEffect(() => {
    if (!categoryParam || categories.length === 0) return;
    const target = categories.find((c) => c.name === categoryParam);
    if (!target) return;
    const el = sectionRefs.current.get(String(target.id));
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top: y, behavior: "instant" });
    }
  }, [categoryParam, categories]);

  /* ── Restore scroll position from ?restoreScroll=... after login return ── */
  const restoreScrollParam = searchParams.get("restoreScroll");
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (categories.length === 0) return;
    if (!restoreScrollParam || scrollRestored.current) return;
    const y = parseInt(restoreScrollParam, 10);
    if (!isNaN(y) && y > 0) {
      /* small delay to let layout settle after images start loading */
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "instant" });
      });
    }
    scrollRestored.current = true;
    /* remove restoreScroll from URL without reload */
    const url = new URL(window.location.href);
    url.searchParams.delete("restoreScroll");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [categories.length, restoreScrollParam]);

  const coverSrc = restaurant?.cover_image_url ?? restaurant?.image_url
    ?? "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=300&fit=crop";

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <p className="text-[var(--color-muted)] text-sm">جاري التحميل...</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[var(--color-secondary)] font-bold">{error ?? "المطعم غير موجود"}</p>
        <Link href="/restaurants" className="text-sm text-[var(--color-primary)] underline">العودة للقائمة</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full relative">

        {/* ── Header: صورة الغلاف ── */}
        <div className="relative w-full h-52">
          <Image
            src={coverSrc}
            alt={restaurant.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
          />

          {/* زرار الرجوع */}
          <Link
            href={searchParams.get("returnTo") || "/restaurants"}
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        <main className="pb-32">

          {/* ── معلومات المطعم ── */}
          <section className="bg-white px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
            {/* الصف الأول: الاسم والوصف // رابط معلومات المطعم */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-[#1A1A1A] leading-tight">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="text-sm text-[#9CA3AF] mt-0.5 leading-relaxed">{restaurant.description}</p>
                )}
              </div>
              <Link
                href={`/restaurant/${id}/info`}
                className="flex-shrink-0 text-sm font-bold text-[#FF6000] mt-1"
              >
                معلومات المطعم
              </Link>
            </div>

            {/* الصف الثاني: التقييم // رابط التقييمات */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5">
                {restaurant.rating_avg != null ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-[#1A1A1A]">{Math.round(restaurant.rating_avg * 10) / 10}</span>
                    <span className="text-xs text-[#9CA3AF]">• {restaurant.rating_count ?? 0} تقييم</span>
                  </>
                ) : (
                  <span className="text-xs text-[#9CA3AF]">لسه مافيش تقييمات</span>
                )}
              </div>
              <Link
                href={`/restaurant/${id}/reviews`}
                className="text-sm font-bold text-[#FF6000]"
              >
                التقييمات
              </Link>
            </div>
          </section>

          {/* ── تابات الأقسام (navigation shortcuts) ── */}
          {categories.length > 0 && (
            <div className="bg-white sticky top-0 z-10 border-b border-[var(--color-border)]">
              <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const el = sectionRefs.current.get(String(cat.id));
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
                        window.scrollTo({ top: y, behavior: "smooth" });
                      }
                    }}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === String(cat.id)
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-secondary)]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── قائمة الوجبات (all categories, continuously) ── */}
          <section className="px-4 pt-3 bg-white">
            {categories.map((cat) => (
              <div
                key={cat.id}
                data-category-id={cat.id}
                ref={(el) => { if (el) sectionRefs.current.set(String(cat.id), el); }}
                style={{ scrollMarginTop: HEADER_OFFSET }}
              >
                {/* عنوان القسم */}
                <h2 className="text-base font-bold text-[var(--color-secondary)] pt-2 pb-3">
                  {cat.name}
                </h2>

                <div className="flex flex-col divide-y divide-[var(--color-border)]">
                  {cat.menu_items.map((meal) => {
                    const hasExtras = meal.extra_groups.length > 0;
                    const isActive  = meal.is_active !== false;
                    const hasOfferFields = !!(meal.offer_price && meal.offer_starts_at && meal.offer_ends_at);
                    const effectivePrice = getEffectiveMealPrice(meal);
                    const discount  = hasOfferFields && meal.offer_price
                      ? Math.round((1 - meal.offer_price / meal.price) * 100) : 0;

                    const footer = !hasExtras && isActive ? (
                      <QuantityCounter
                        itemId={String(meal.id)}
                        name={meal.name}
                        price={effectivePrice}
                        description={meal.description}
                        imageUrl={meal.image_url}
                        restaurantId={id}
                        restaurantName={restaurant.name}
                      />
                    ) : undefined;

                    const offerDateRange = hasOfferFields && meal.offer_starts_at && meal.offer_ends_at ? (
                      <div className="flex items-start gap-1">
                        <span className="text-[10px]">📅</span>
                        <div className="text-[10px] text-[#9CA3AF]">
                          <div>من: {formatCairoDate(meal.offer_starts_at, { year: false })} - {formatCairoTime(meal.offer_starts_at)}</div>
                          <div>إلى: {formatCairoDate(meal.offer_ends_at, { year: false })} - {formatCairoTime(meal.offer_ends_at)}</div>
                        </div>
                      </div>
                    ) : undefined;

                    return (
                      <MealCard
                        key={meal.id}
                        name={meal.name}
                        description={meal.description}
                        imageUrl={hasOfferFields && meal.offer_image_url
                          ? meal.offer_image_url
                          : (meal.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop")}
                        effectivePrice={effectivePrice}
                        originalPrice={meal.price}
                        discountPercent={discount}
                        isAvailable={isActive}
                        offerDateRange={offerDateRange}
                        footer={footer}
                        onClick={hasExtras && isActive ? () => {
                          const mealData = toSheetMeal(meal);
                          if (!hasHistoryEntry.current) {
                            window.history.pushState({ type: 'meal-sheet' }, '');
                            hasHistoryEntry.current = true;
                          }
                          setSheetMeal(mealData);
                        } : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </section>


        </main>

        <CartBar />

      </div>

      {/* ── MealBottomSheet ── */}
      {sheetMeal && (
        <MealBottomSheet
          meal={sheetMeal}
          onClose={closeSheet}
          restaurantId={id}
          restaurantName={restaurant.name}
        />
      )}

    </div>
  );
}

export default function RestaurantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <p className="text-[var(--color-muted)] text-sm">جاري التحميل...</p>
      </div>
    }>
      <RestaurantPageContent />
    </Suspense>
  );
}
