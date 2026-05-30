"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { getCart, updateQty as updateCartQty, CartItem } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { isRestaurantOpen } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import InfoModal from "@/components/customer/InfoModal";

function itemUnitPrice(item: CartItem): number {
  const sizePrice   = item.size?.price ?? 0;
  const extrasPrice = (item.extras ?? []).reduce((s, e) => s + e.price, 0);
  return item.price + sizePrice + extrasPrice;
}

function CartPageContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const fromFavorites = searchParams.get("from") === "favorites";
  const [cart,         setCart]         = useState(getCart);
  const [orderNote,    setOrderNote]    = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("hala_order_note") ?? "") : ""
  );
  const [savingFav, setSavingFav] = useState(false);
  const [favSaved,  setFavSaved]  = useState(false);
  const [favModal,  setFavModal]  = useState<"success" | "duplicate" | null>(null);

  /* ── فحص توفر المطعم والوجبات ── */
  const [restaurantIssue, setRestaurantIssue] = useState<"closed" | "busy" | null>(null);
  const [unavailableIds,  setUnavailableIds]  = useState<Set<string>>(new Set());

  useEffect(() => { setCart(getCart()); }, []);

  useEffect(() => {
    const cartNow = getCart();
    if (!cartNow) return;
    async function checkAvailability() {
      const [{ data: rest }, { data: menuItems }] = await Promise.all([
        supabase
          .from("restaurants")
          .select("is_active, status, opens_at, closes_at")
          .eq("id", cartNow!.restaurantId)
          .single(),
        supabase
          .from("menu_items")
          .select("id, is_active")
          .in("id", cartNow!.items.map((i) => i.id)),
      ]);
      if (rest) {
        if (rest.status === "مشغول")                              setRestaurantIssue("busy");
        else if (rest.status !== "نشط" || !isRestaurantOpen(rest)) setRestaurantIssue("closed");
        else                                                       setRestaurantIssue(null);
      }
      const unavailable = new Set(
        (menuItems ?? []).filter((m) => !m.is_active).map((m) => String(m.id))
      );
      setUnavailableIds(unavailable);
    }
    checkAvailability();
  }, []);

  useEffect(() => {
    localStorage.setItem("hala_order_note", orderNote);
  }, [orderNote]);

  function handleQtyChange(itemId: string, newQty: number) {
    updateCartQty(itemId, newQty);
    setCart(getCart());
  }

  async function handleSaveFavorite() {
    if (savingFav) return;
    const cartNow = getCart();
    if (!cartNow) return;
    setSavingFav(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); setSavingFav(false); return; }

    /* تحقق لو نفس الوجبات محفوظة بالفعل (نفس المنتجات من نفس المطعم) */
    const { data: existingFavs } = await supabase
      .from("favorite_orders")
      .select("id, items")
      .eq("user_id", user.id)
      .eq("restaurant_id", cartNow.restaurantId);

    const cartItemIds = cartNow.items.map((i) => i.id).sort().join(",");
    const isDuplicate = (existingFavs ?? []).some((fav) => {
      const favItemIds = (fav.items as { id: string }[]).map((i) => i.id).sort().join(",");
      return favItemIds === cartItemIds;
    });

    if (isDuplicate) {
      setSavingFav(false);
      setFavModal("duplicate");
      return;
    }

    const subtotalNow = cartNow.items.reduce((s, i) => {
      const ex = (i.extras ?? []).reduce((a, e) => a + e.price, 0);
      return s + (i.price + (i.size?.price ?? 0) + ex) * i.qty;
    }, 0);
    await supabase.from("favorite_orders").insert({
      user_id:         user.id,
      restaurant_id:   cartNow.restaurantId,
      restaurant_name: cartNow.restaurantName,
      name:            cartNow.restaurantName,
      items:           cartNow.items,
      total:           subtotalNow,
    });

    setSavingFav(false);
    setFavSaved(true);
    setFavModal("success");
  }

  if (!cart) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-secondary)] font-bold">سلتك فارغة</p>
        <Link href="/restaurants" className="text-sm text-[var(--color-primary)] underline">
          تصفّح المطاعم
        </Link>
      </div>
    );
  }

  const items       = cart.items;
  const subtotal    = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
  const FALLBACK    = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";
  const canCheckout = restaurantIssue === null && unavailableIds.size === 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-base font-black text-[var(--color-secondary)]">سلة المشتريات</h1>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">{cart.restaurantName}</p>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="pb-[240px] px-4 flex flex-col gap-4 pt-4">

          {/* ── بانر المطعم مغلق / مشغول ── */}
          {restaurantIssue && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm font-bold text-red-600">
                {restaurantIssue === "busy" ? "المطعم مشغول حالياً، لا يمكن إتمام الطلب" : "المطعم مغلق حالياً، لا يمكن إتمام الطلب"}
              </p>
            </div>
          )}

          {/* ── بانر وجبات غير متوفرة ── */}
          {unavailableIds.size > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm font-bold text-red-600">
                بعض الوجبات غير متوفرة حالياً، يرجى إزالتها لإتمام الطلب
              </p>
            </div>
          )}

          {/* ── قائمة الوجبات ── */}
          <section className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)]">
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => {
                const lineTotal = itemUnitPrice(item) * item.qty;
                const subtitle  = [
                  item.size && `${item.size.name}`,
                  item.extras?.length && item.extras.map(e => e.name).join("، "),
                  item.notes,
                ].filter(Boolean).join(" · ");

                return (
                  <div key={item.id} className="flex items-center py-3 px-3">

                    {/* القسم 1 — الصورة (يمين في RTL) */}
                    <div className="relative flex-shrink-0 w-20 h-20 ml-3 rounded-xl overflow-hidden">
                      <Image src={item.image_url ?? FALLBACK} alt={item.name} fill className="object-cover" />
                      {unavailableIds.has(item.id) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-[9px] font-black bg-red-500 px-1.5 py-0.5 rounded-full leading-none">غير متوفر</span>
                        </div>
                      )}
                    </div>

                    {/* القسم 2 — الاسم والتفاصيل والعداد */}
                    <div className="flex-1 flex flex-col justify-between h-20 min-w-0 px-1">
                      <div>
                        <p className="text-base font-bold text-[#1A1A1A] leading-snug truncate">{item.name}</p>
                        {subtitle && (
                          <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{subtitle}</p>
                        )}
                      </div>
                      {/* العداد: + يمين، - يسار */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQtyChange(item.id, item.qty + 1)}
                          className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                        <span className="text-sm font-bold text-[#1A1A1A] w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => handleQtyChange(item.id, item.qty - 1)}
                          className="w-9 h-9 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center flex-shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5">
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* القسم 3 — السعر الكلي (يسار في RTL) */}
                    <div className="flex-shrink-0 w-20 text-left pl-2">
                      <p className="text-xl font-black text-[#FF6000]">{lineTotal}</p>
                      <p className="text-xs text-[#6B7280]">ج.م</p>
                    </div>

                  </div>
                );
              })}
            </div>
          </section>

          {/* ── ملاحظة على الطلب ── */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm font-bold text-[var(--color-secondary)]">ملاحظة على الطلب</span>
              </div>
              <span className="text-xs text-[#9CA3AF]">اختياري</span>
            </div>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="مثال: اطرق الباب بدل الجرس، الدور الثالث..."
              rows={2}
              className="w-full text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 resize-none outline-none focus:border-[var(--color-primary)] text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
            />
          </section>

        </main>

        {/* ── Bottom Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 shadow-lg px-4 py-3">

          {/* بانر المفضلة — مخفي لو جاي من المفضلة */}
          {!fromFavorites && <div
            onClick={handleSaveFavorite}
            className={`flex items-center gap-3 bg-[#FFF5F0] border border-[#FFD5C0] rounded-2xl px-4 py-3 mb-3 cursor-pointer active:scale-[0.98] transition-transform ${favSaved ? "opacity-60 pointer-events-none" : ""}`}
          >
            <span className="text-2xl">{favSaved ? "💛" : "🤍"}</span>
            <div className="flex-1 text-right">
              <p className="text-sm font-black text-[#1A1A1A]">
                {favSaved ? "تم الحفظ في المفضلة" : "احفظ السلة في المفضلة"}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                هتقدر تطلب نفس الوجبات دي تاني بضغطة واحدة من "طلباتي المفضلة"
              </p>
            </div>
            {!favSaved && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#FF6000" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            )}
          </div>}

          {/* سطر الإجمالي */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#6B7280]">إجمالي طلبك</span>
            <span className="text-2xl font-black text-[#1A1A1A]">{subtotal} ج.م</span>
          </div>

          {/* الأزرار */}
          <div className="flex gap-3">
            {/* تنفيذ الطلب — أول عنصر → يمين في RTL */}
            <button
              onClick={() => canCheckout && router.push("/checkout")}
              disabled={!canCheckout}
              className="flex-1 bg-[#FF6000] text-white font-black text-base py-3.5 rounded-2xl active:scale-[0.98] transition-transform shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تنفيذ الطلب
            </button>
            {/* أضف المزيد — آخر عنصر → يسار في RTL */}
            <button
              onClick={() => router.push(`/restaurant/${cart.restaurantId}`)}
              className="flex-1 border-2 border-[#FF6000] text-[#FF6000] font-bold text-sm py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
            >
              + أضف المزيد
            </button>
          </div>

        </div>

      </div>

      <InfoModal
        isOpen={favModal !== null}
        icon={favModal === "success" ? "✅" : "⚠️"}
        message={favModal === "success" ? "تم الحفظ في المفضلة" : "هذا الطلب محفوظ بالفعل في مفضلتك"}
        onClose={() => setFavModal(null)}
      />

    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense>
      <CartPageContent />
    </Suspense>
  );
}
