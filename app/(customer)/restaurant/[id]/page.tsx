"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addToCart, clearCart, getCart, updateQty, CartItem } from "@/lib/cart";
import ConfirmModal from "@/components/customer/ConfirmModal";
import MealBottomSheet from "@/components/customer/MealBottomSheet";
import CartBar from "@/components/customer/CartBar";

/* ── DB types ── */
type ItemExtra  = { id: number; name: string; price: number };
type ExtraGroup = { id: number; name: string; type: string; required: boolean; max_select: number; item_extras: ItemExtra[] };
type MenuItem   = { id: number; name: string; description: string | null; price: number; category_id: number; image_url: string | null; extra_groups: ExtraGroup[] };
type Category   = { id: number; name: string; restaurant_id: string; menu_items: MenuItem[] };
type Restaurant = { id: string; name: string; description: string | null; cover_image_url: string | null; image_url: string | null };

/* ── MealBottomSheet meal shape ── */
type SheetMeal = { id: number; name: string; basePrice: number; img: string; extras?: { id: number; name: string; price: number }[]; sizes?: { id: number; name: string }[] };

function toSheetMeal(item: MenuItem): SheetMeal {
  const extras = item.extra_groups
    .filter((g) => g.type !== "variant")
    .flatMap((g) => g.item_extras.map((e) => ({ id: e.id, name: e.name, price: e.price })));
  const variantGroup = item.extra_groups.find((g) => g.type === "variant");
  const sizes = variantGroup?.item_extras.map((e) => ({ id: e.id, name: e.name, price: e.price }));
  return {
    id: item.id,
    name: item.name,
    basePrice: item.price,
    img: item.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
    extras: extras.length > 0 ? extras : undefined,
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
    <div className="flex items-center gap-2 mt-2">
      {qty === 0 ? (
        <button
          onClick={handleAdd}
          className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrease}
            className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="text-sm font-bold text-[var(--color-secondary)] w-4 text-center">{qty}</span>
          <button
            onClick={handleIncrease}
            className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      )}
      {qty > 0 && (
        <span className="text-xs text-[var(--color-muted)]">{formatPrice(price * qty)}</span>
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
    </div>
  );
}

export default function RestaurantPage() {
  const params     = useParams();
  const id         = params.id as string;

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
        supabase.from("restaurants").select("id, name, description, cover_image_url, image_url").eq("id", id).single(),
        supabase.from("categories")
          .select("id, name, restaurant_id, menu_items(id, name, description, price, category_id, image_url, extra_groups(id, name, type, required, max_select, item_extras(id, name, price)))")
          .eq("restaurant_id", id)
          .order("id"),
      ]);

      if (restResult.error || !restResult.data) {
        setError("تعذّر تحميل بيانات المطعم");
        setLoading(false);
        return;
      }

      setRestaurant(restResult.data);

      if (!catsResult.error && catsResult.data) {
        const cats = catsResult.data as Category[];
        setCategories(cats);
        if (cats.length > 0) setActiveTab(cats[0].name);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  const coverSrc = restaurant?.cover_image_url ?? restaurant?.image_url
    ?? "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=300&fit=crop";

  const activeMeals = categories.find((c) => c.name === activeTab)?.menu_items ?? [];

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
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header: صورة الغلاف ── */}
        <div className="relative w-full h-52">
          <Image
            src={coverSrc}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* زرار الرجوع */}
          <Link
            href="/restaurants"
            className="absolute top-10 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          {/* اسم المطعم */}
          <div className="absolute bottom-3 right-4 left-4">
            <h1 className="text-xl font-black text-white drop-shadow">{restaurant.name}</h1>
          </div>
        </div>

        <main className="pb-32">

          {/* ── معلومات المطعم ── */}
          <section className="bg-white px-4 pt-4 pb-0 border-b border-[var(--color-border)]">
            {restaurant.description && (
              <p className="text-sm text-[var(--color-muted)]">{restaurant.description}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-semibold text-[var(--color-secondary)]">4.5</span>
              <span className="text-xs text-[var(--color-muted)]">(تقييمات)</span>
            </div>

            <div className="flex mt-3">
              <button className="flex-1 text-sm font-medium text-[var(--color-secondary)] py-2.5 border-b-2 border-[var(--color-border)] text-center">
                معلومات المطعم
              </button>
              <button className="flex-1 text-sm font-medium text-[var(--color-secondary)] py-2.5 border-b-2 border-[var(--color-border)] text-center">
                تقييمات
              </button>
            </div>
          </section>

          {/* ── تابات الأقسام ── */}
          {categories.length > 0 && (
            <div className="bg-white sticky top-0 z-10 border-b border-[var(--color-border)]">
              <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
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
                return hasExtras ? (
                  <button
                    key={meal.id}
                    onClick={() => setSheetMeal(toSheetMeal(meal))}
                    className="flex items-start gap-3 py-3 w-full text-right"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={meal.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        alt={meal.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{meal.name}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2 leading-relaxed">{meal.description}</p>
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-1.5">{formatPrice(meal.price)}</p>
                    </div>
                  </button>
                ) : (
                  <div key={meal.id} className="flex items-start gap-3 py-3">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={meal.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        alt={meal.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{meal.name}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2 leading-relaxed">{meal.description}</p>
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-1.5">{formatPrice(meal.price)}</p>
                      <QuantityCounter
                        itemId={String(meal.id)}
                        name={meal.name}
                        price={meal.price}
                        description={meal.description}
                        imageUrl={meal.image_url}
                        restaurantId={id}
                        restaurantName={restaurant.name}
                      />
                    </div>
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
