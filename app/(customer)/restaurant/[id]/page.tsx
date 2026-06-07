"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isRestaurantOpen } from "@/lib/utils";
import { addToCart, clearCart, getCart, updateQty, CartItem } from "@/lib/cart";
import ConfirmModal from "@/components/customer/ConfirmModal";
import MealBottomSheet from "@/components/customer/MealBottomSheet";
import CartBar from "@/components/customer/CartBar";

/* ── DB types ── */
type ItemExtra  = { id: number; name: string; price: number };
type ExtraGroup = { id: number; name: string; type: string; required: boolean; max_select: number; item_extras: ItemExtra[] };
type MenuItem   = { id: number; name: string; description: string | null; price: number; category_id: number; image_url: string | null; extra_groups: ExtraGroup[]; offer_price?: number | null; offer_starts_at?: string | null; offer_ends_at?: string | null; offer_image_url?: string | null; sort_order?: number; is_active?: boolean; is_best_seller?: boolean };
type Category   = { id: number; name: string; restaurant_id: string; sort_order?: number; menu_items: MenuItem[] };
type Restaurant = { id: string; name: string; description: string | null; cover_image_url: string | null; image_url: string | null; is_active: boolean; opens_at: string | null; closes_at: string | null; status: string | null; rating_avg: number | null; rating_count: number | null };

/* ── MealBottomSheet meal shape ── */
type ExtraGroupSheet = { id: number; name: string; maxSelect: number; extras: { id: number; name: string; price: number }[] };
type SheetMeal = { id: number; name: string; description?: string | null; basePrice: number; img: string; extras?: { id: number; name: string; price: number }[]; extraGroups?: ExtraGroupSheet[]; sizes?: { id: string; name: string; price?: number }[] };

function toSheetMeal(item: MenuItem): SheetMeal {
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
    extras: extras.length > 0 ? extras : undefined,
    extraGroups: extraGroups.length > 0 ? extraGroups : undefined,
    sizes: sizes && sizes.length > 0 ? sizes : undefined,
  };
}

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
  const [qty,         setQty]         = useState(() => getCart()?.items.find((i) => i.id === itemId)?.qty ?? 0);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const pendingItem = useRef<CartItem | null>(null);

  function handleAdd() {
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
        onConfirm={() => {
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
  const [activeTab,   setActiveTab]   = useState<string>("");
  const [sheetMeal,   setSheetMeal]   = useState<SheetMeal | null>(null);

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
        if (displayCats.length > 0) {
          const target = categoryParam
            ? displayCats.find((c) => c.name === categoryParam)
            : null;
          setActiveTab(target ? target.name : displayCats[0].name);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  /* scroll التاب المطلوب إلى المنتصف عند الوصول من البحث */
  useEffect(() => {
    if (!categoryParam || !activeTab) return;
    const btn = document.getElementById(`cat-tab-${activeTab}`);
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab, categoryParam]);

  const coverSrc = restaurant?.cover_image_url ?? restaurant?.image_url
    ?? "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=300&fit=crop";

  const activeMeals = categories.find((c) => c.name === activeTab)?.menu_items ?? [];

  /* Debug — تأكد إن بيانات العروض واصلة */
  if (activeMeals.length > 0) {
    console.log("Active meals:", activeMeals.length, "tab:", activeTab);
    console.log("First item offer data:", activeMeals[0]?.offer_price, activeMeals[0]?.offer_starts_at, activeMeals[0]?.offer_ends_at);
  }

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
            className="object-cover"
            priority
            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
          />

          {/* زرار الرجوع */}
          <Link
            href="/restaurants"
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

          {/* ── تابات الأقسام ── */}
          {categories.length > 0 && (
            <div className="bg-white sticky top-0 z-10 border-b border-[var(--color-border)]">
              <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    id={`cat-tab-${cat.name}`}
                    onClick={() => setActiveTab(cat.name)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeTab === cat.name
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

          {/* ── قائمة الوجبات ── */}
          <section className="px-4 pt-3 bg-white">
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {activeMeals.map((meal) => {
                const hasExtras = meal.extra_groups.length > 0;
                const isActive  = meal.is_active !== false;
                const FALLBACK  = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";
                const isOffer = !!(meal.offer_price && meal.offer_starts_at && meal.offer_ends_at);
                const offerImg = (isOffer && meal.offer_image_url) ? meal.offer_image_url : (meal.image_url ?? FALLBACK);
                const discount  = isOffer && meal.offer_price
                  ? Math.round((1 - meal.offer_price / meal.price) * 100) : 0;

                const cardInner = (
                  <>
                    {/* القسم 1 — الصورة (يمين في RTL) */}
                    <div className="relative flex-shrink-0 w-24 h-24 ml-3 rounded-xl overflow-hidden">
                      <Image src={offerImg} alt={meal.name} fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }} />
                      {isOffer && discount > 0 && (
                        <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                          -{discount}%
                        </div>
                      )}
                      {!isActive && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">غير متوفر</span>
                        </div>
                      )}
                    </div>

                    {/* القسم 2 — الاسم والوصف والسعر والزرار */}
                    <div className="flex flex-col flex-1 min-w-0 px-1">
                      {/* السطر 1 — الاسم */}
                      <p className="truncate font-bold text-base text-[#1A1A1A] leading-snug">{meal.name}</p>

                      {/* المنتصف — الوصف + السعر */}
                      <div className="flex items-center gap-2 flex-1 mt-0.5">
                        {meal.description && (
                          <p className="line-clamp-2 text-sm text-[#6B7280] flex-1">{meal.description}</p>
                        )}
                        {isOffer && meal.offer_price ? (
                          <div className="flex flex-col items-end flex-shrink-0">
                            <p className="text-base font-black text-[#FF6000]">{meal.offer_price} ج</p>
                            <p className="text-xs text-gray-400 line-through">{meal.price} ج</p>
                          </div>
                        ) : (
                          <p className="text-base font-black text-[#FF6000] flex-shrink-0">{meal.price} ج</p>
                        )}
                      </div>

                      {/* تواريخ العرض */}
                      {isOffer && meal.offer_starts_at && meal.offer_ends_at && (
                        <div className="mt-1 pt-1 border-t border-[#F3F4F6]">
                          <div className="flex items-start gap-1">
                            <span className="text-[10px]">📅</span>
                            <div className="text-[10px] text-[#9CA3AF]">
                              <div>من: {new Date(meal.offer_starts_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })} - {new Date(meal.offer_starts_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</div>
                              <div>إلى: {new Date(meal.offer_ends_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })} - {new Date(meal.offer_ends_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* الأخير — الزرار */}
                      {!hasExtras && isActive && (
                        <div className="mt-auto pt-1">
                          <QuantityCounter
                            itemId={String(meal.id)}
                            name={meal.name}
                            price={isOffer && meal.offer_price ? meal.offer_price : meal.price}
                            description={meal.description}
                            imageUrl={meal.image_url}
                            restaurantId={id}
                            restaurantName={restaurant.name}
                          />
                        </div>
                      )}
                    </div>
                  </>
                );

                if (hasExtras) {
                  return (
                    <div
                      key={meal.id}
                      className={`flex items-center py-3 relative ${isActive ? "cursor-pointer active:opacity-75 transition-opacity" : ""}`}
                      onClick={isActive ? () => setSheetMeal(toSheetMeal(meal)) : undefined}
                    >
                      {cardInner}
                    </div>
                  );
                }

                return (
                  <div key={meal.id} className="flex items-center py-3 relative">
                    {cardInner}
                  </div>
                );
              })}

              {activeMeals.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--color-muted)]">لا توجد وجبات في هذا القسم</p>
              )}
            </div>
          </section>


        </main>

        <CartBar />

      </div>

      {/* ── MealBottomSheet ── */}
      {sheetMeal && (
        <MealBottomSheet
          meal={sheetMeal}
          onClose={() => setSheetMeal(null)}
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
