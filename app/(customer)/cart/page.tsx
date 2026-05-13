"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getCart, updateQty as updateCartQty, CartItem } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function itemUnitPrice(item: CartItem): number {
  const sizePrice   = item.size?.price ?? 0;
  const extrasPrice = (item.extras ?? []).reduce((s, e) => s + e.price, 0);
  return item.price + sizePrice + extrasPrice;
}

export default function CartPage() {
  const router = useRouter();
  const [cart,         setCart]         = useState(getCart);
  const [orderNote,    setOrderNote]    = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("hala_order_note") ?? "") : ""
  );
  const [savingFav,            setSavingFav]            = useState(false);
  const [favSaved,             setFavSaved]             = useState(false);
  const [showSaveFavModal,     setShowSaveFavModal]     = useState(false);
  const [favoriteName,         setFavoriteName]         = useState("");

  useEffect(() => { setCart(getCart()); }, []);

  useEffect(() => {
    localStorage.setItem("hala_order_note", orderNote);
  }, [orderNote]);

  function handleQtyChange(itemId: string, newQty: number) {
    updateCartQty(itemId, newQty);
    setCart(getCart());
  }

  async function handleSaveFavorite() {
    const cartNow = getCart();
    if (!cartNow) return;
    setSavingFav(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); setSavingFav(false); return; }
    const subtotalNow = cartNow.items.reduce((s, i) => {
      const ex = (i.extras ?? []).reduce((a, e) => a + e.price, 0);
      return s + (i.price + (i.size?.price ?? 0) + ex) * i.qty;
    }, 0);
    await supabase.from("favorite_orders").insert({
      user_id:         user.id,
      restaurant_id:   cartNow.restaurantId,
      restaurant_name: cartNow.restaurantName,
      name:            favoriteName.trim() || cartNow.restaurantName,
      items:           cartNow.items,
      total:           subtotalNow,
    });
    setSavingFav(false);
    setFavSaved(true);
    setShowSaveFavModal(false);
    setFavoriteName("");
    setTimeout(() => setFavSaved(false), 3000);
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

  const items    = cart.items;
  const subtotal = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
  const FALLBACK = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/restaurants"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="text-center">
              <h1 className="text-base font-black text-[var(--color-secondary)]">سلة المشتريات</h1>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">{cart.restaurantName}</p>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="pb-[240px] px-4 flex flex-col gap-4 pt-4">

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

          {/* بانر المفضلة */}
          <div
            onClick={() => !favSaved && setShowSaveFavModal(true)}
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
          </div>

          {/* سطر الإجمالي */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#6B7280]">إجمالي طلبك</span>
            <span className="text-2xl font-black text-[#1A1A1A]">{subtotal} ج.م</span>
          </div>

          {/* الأزرار */}
          <div className="flex gap-3">
            {/* تنفيذ الطلب — أول عنصر → يمين في RTL */}
            <button
              onClick={() => router.push("/checkout")}
              className="flex-1 bg-[#FF6000] text-white font-black text-base py-3.5 rounded-2xl active:scale-[0.98] transition-transform shadow-md"
            >
              تنفيذ الطلب
            </button>
            {/* أضف المزيد — آخر عنصر → يسار في RTL */}
            <button
              onClick={() => router.back()}
              className="flex-1 border-2 border-[#FF6000] text-[#FF6000] font-bold text-sm py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
            >
              + أضف المزيد
            </button>
          </div>

        </div>

      </div>

      {/* ── Modal: احفظ في المفضلة ── */}
      {showSaveFavModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowSaveFavModal(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-black text-[#1A1A1A] text-right mb-1">
              احفظ في المفضلة 🤍
            </p>
            <p className="text-xs text-[#6B7280] text-right mb-4">
              اديله اسم عشان تلاقيه بسهولة — زي "وجبتي المعتادة" أو "طلب الشغل"
            </p>
            <input
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
              placeholder="اسم الطلب المفضل..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right outline-none mb-3 focus:border-[#FF6000]"
              dir="rtl"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveFavorite}
                disabled={savingFav}
                className="flex-1 bg-[#FF6000] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {savingFav ? "جاري الحفظ..." : "احفظ"}
              </button>
              <button
                onClick={() => { setShowSaveFavModal(false); setFavoriteName(""); }}
                className="flex-1 border border-gray-200 text-[#6B7280] py-3 rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
