"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getCart, updateQty as updateCartQty, Cart, CartItem } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function itemUnitPrice(item: CartItem): number {
  const sizePrice    = item.size?.price ?? 0;
  const extrasPrice  = (item.extras ?? []).reduce((s, e) => s + e.price, 0);
  return item.price + sizePrice + extrasPrice;
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--color-muted)" strokeWidth="2" className="flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

type AppliedCoupon = {
  id:       number;
  code:     string;
  type:     string;
  value:    number;
  applies:  string;
  discount: number;
};

export default function CartPage() {
  const router = useRouter();
  const [cart,          setCart]          = useState<Cart | null>(null);
  const [coupon,        setCoupon]        = useState("");
  const [delivery,      setDelivery]      = useState(0);
  const [service,       setService]       = useState(0);
  const [applying,      setApplying]      = useState(false);
  const [couponData,    setCouponData]    = useState<AppliedCoupon | null>(null);
  const [couponError,   setCouponError]   = useState("");
  const [savingFav,     setSavingFav]     = useState(false);
  const [favSaved,      setFavSaved]      = useState(false);

  useEffect(() => {
    setCart(getCart());

    async function fetchSettings() {
      const { data } = await supabase
        .from("settings")
        .select("delivery_fee, service_fee")
        .single();
      if (data) {
        setDelivery(data.delivery_fee ?? 0);
        setService(data.service_fee  ?? 0);
      }
    }
    fetchSettings();
  }, []);

  function handleQtyChange(itemId: string, newQty: number) {
    updateCartQty(itemId, newQty);
    setCart(getCart());
  }

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    setApplying(true);
    setCouponError("");
    setCouponData(null);

    const cartNow = getCart();
    const subtotalNow = (cartNow?.items ?? []).reduce(
      (sum, item) => sum + (item.price + (item.size?.price ?? 0) + (item.extras ?? []).reduce((s, e) => s + e.price, 0)) * item.qty,
      0,
    );

    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, type, value, applies_to, min_order, expires_at, is_active, restaurant_id")
      .eq("code", code)   /* case-sensitive — no toLowerCase */
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setCouponError("الكوبون غير موجود أو غير صالح");
      setApplying(false);
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("انتهت صلاحية هذا الكوبون");
      setApplying(false);
      return;
    }

    const minOrder = data.min_order ?? 0;
    if (minOrder > 0 && subtotalNow < minOrder) {
      setCouponError(`الحد الأدنى لاستخدام هذا الكوبون هو ${minOrder} ج.م`);
      setApplying(false);
      return;
    }

    if (data.restaurant_id !== null && cartNow && data.restaurant_id !== cartNow.restaurantId) {
      setCouponError("هذا الكوبون غير صالح لهذا المطعم");
      setApplying(false);
      return;
    }

    let discount = 0;
    if (data.type === "نسبة مئوية") {
      const base =
        data.applies_to === "توصيل" ? delivery :
        data.applies_to === "أكل"   ? subtotalNow :
        subtotalNow + delivery;
      discount = Math.min(Math.round(base * data.value / 100), base);
    } else {
      discount = Math.min(data.value, subtotalNow + delivery);
    }

    setCouponData({ id: data.id, code, type: data.type, value: data.value, applies: data.applies_to, discount });
    setApplying(false);
  }

  async function handleSaveFavorite() {
    const cartNow = getCart();
    if (!cartNow) return;
    setSavingFav(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); setSavingFav(false); return; }
    const subtotal = cartNow.items.reduce((s, i) => {
      const extras = (i.extras ?? []).reduce((a, e) => a + e.price, 0);
      return s + (i.price + (i.size?.price ?? 0) + extras) * i.qty;
    }, 0);
    await supabase.from("favorite_orders").insert({
      user_id:         user.id,
      restaurant_id:   cartNow.restaurantId,
      restaurant_name: cartNow.restaurantName,
      name:            cartNow.restaurantName,
      items:           cartNow.items,
      total:           subtotal,
    });
    setSavingFav(false);
    setFavSaved(true);
    setTimeout(() => setFavSaved(false), 2500);
  }

  function removeCoupon() {
    setCouponData(null);
    setCouponError("");
    setCoupon("");
  }

  if (!cart) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-secondary)] font-bold">سلتك فارغة</p>
        <Link href="/restaurants" className="text-sm text-[var(--color-primary)] underline">
          تصفّح المطاعم
        </Link>
      </div>
    );
  }

  const items    = cart.items;
  const subtotal = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
  const discount = couponData?.discount ?? 0;
  const total    = Math.max(0, subtotal + delivery + service - discount);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── 1. Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            {/* زرار الرجوع — يسار */}
            <Link href="/restaurants"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>

            {/* العنوان — وسط */}
            <div className="text-center">
              <h1 className="text-base font-black text-[var(--color-secondary)]">سلة المشتريات</h1>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">{cart.restaurantName}</p>
            </div>

            {/* فراغ للتوازن */}
            <div className="w-9" />
          </div>
        </header>

        <main className="pb-28 px-4 flex flex-col gap-4 pt-4">

          {/* ── 2. قائمة الوجبات ── */}
          <section className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)]">
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {/* صورة — يمين */}
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={item.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* المعلومات */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{item.name}</p>
                      {item.size && (
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {item.size.name} — {item.size.price} ج.م
                        </p>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-1">
                          {item.extras.map((e) => e.name).join("، ")}
                        </p>
                      )}
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-1">
                        {itemUnitPrice(item) * item.qty} ج.م
                      </p>
                    </div>
                  </div>

                  {/* عداد الكمية */}
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button
                      onClick={() => handleQtyChange(item.id, item.qty - 1)}
                      className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="var(--color-secondary)" strokeWidth="2.5">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="text-sm font-bold text-[var(--color-secondary)] w-5 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => handleQtyChange(item.id, item.qty + 1)}
                      className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3. رمز القسيمة ── */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4">
            <h2 className="text-sm font-bold text-[var(--color-secondary)] mb-3">وفر على طلبك</h2>
            {couponData ? (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-success)" }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--color-success)" }}>
                    ✓ كوبون مطبّق: {couponData.code}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                    خصم {couponData.discount} ج.م
                  </p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ color: "var(--color-error, #ef4444)", background: "rgba(239,68,68,0.1)" }}
                >
                  إزالة
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="قم بإدخال رمز القسيمة هنا"
                    className="flex-1 text-sm px-3 py-2.5 bg-transparent outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={applying || !coupon.trim()}
                    className="bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
                  >
                    {applying ? "..." : "إرسال"}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "var(--color-error, #ef4444)" }}>
                    ⚠ {couponError}
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── 4. ملاحظات إضافية ── */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-sm font-bold text-[var(--color-secondary)]">دون ملاحظة</span>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
              هل تود أن تخبرنا أي شيء آخر؟
            </p>
          </section>

          {/* ── 5. ملخص الدفع ── */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4">
            <h2 className="text-sm font-bold text-[var(--color-secondary)] mb-3">ملخص الدفع</h2>

            <div className="flex flex-col gap-2.5">
              {/* المجموع */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted)]">المجموع</span>
                <span className="text-sm text-[var(--color-secondary)]">{subtotal} ج.م</span>
              </div>

              {/* رسوم التوصيل */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[var(--color-muted)]">رسوم التوصيل</span>
                  <InfoIcon />
                </div>
                <span className="text-sm text-[var(--color-secondary)]">{delivery} ج.م</span>
              </div>

              {/* خصم الكوبون */}
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--color-success)" }}>خصم الكوبون</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                    -{discount} ج.م
                  </span>
                </div>
              )}

              {/* فاصل */}
              <div className="border-t border-[var(--color-border)] my-1" />

              {/* قيمة الطلب */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[var(--color-secondary)]">قيمة الطلب</span>
                <span className="text-sm font-black text-[var(--color-secondary)]">{total} ج.م</span>
              </div>
            </div>

          </section>

        </main>

        {/* ── 6. Bottom Bar ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-2 bg-white border-t border-[var(--color-border)]">
            {/* Save favorite feedback */}
            {favSaved && (
              <p className="text-xs text-center font-semibold mb-2" style={{ color: "#059669" }}>
                ✓ تم حفظ الطلب في المفضلة
              </p>
            )}
            <div className="flex gap-3">
              {/* تنفيذ الطلب */}
              <Link
                href="/checkout"
                className="flex-1 bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-transform text-center"
              >
                تنفيذ الطلب
              </Link>

              {/* حفظ في المفضلة */}
              <button
                onClick={handleSaveFavorite}
                disabled={savingFav || favSaved}
                className="px-4 py-3.5 rounded-2xl border-2 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center"
                style={{ borderColor: "#EF4444", color: "#EF4444" }}
                title="حفظ في المفضلة"
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={favSaved ? "#EF4444" : "none"}
                  stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
