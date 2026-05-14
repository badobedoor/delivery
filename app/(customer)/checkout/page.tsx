"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCart, clearCart, Cart, CartItem } from "@/lib/cart";

type Address = { id: string; label: string; full_address: string; area_id: string };

function itemUnitPrice(item: CartItem): number {
  const sizePrice   = item.size?.price ?? 0;
  const extrasPrice = (item.extras ?? []).reduce((s, e) => s + e.price, 0);
  return item.price + sizePrice + extrasPrice;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-black text-[var(--color-secondary)]">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart,              setCart]              = useState<Cart | null>(null);
  const [address,           setAddress]           = useState<Address | null>(null);
  const [allAddresses,      setAllAddresses]      = useState<Address[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [deliveryFee,       setDeliveryFee]       = useState(0);
  const [userId,            setUserId]            = useState<string | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [noAddress,         setNoAddress]         = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [orderNote]         = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("hala_order_note") ?? "") : ""
  );
  const [couponCode,     setCouponCode]     = useState("");
  const [couponError,    setCouponError]    = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applying,       setApplying]       = useState(false);
  const [appliedCoupon,  setAppliedCoupon]  = useState<{ id: number; used_count: number } | null>(null);
  const [areaName,       setAreaName]       = useState("");

  async function fetchDeliveryFee(areaId: string) {
    const { data } = await supabase
      .from("areas")
      .select("delivery_fee, name")
      .eq("id", areaId)
      .single();
    setDeliveryFee(data?.delivery_fee ?? 0);
    setAreaName(data?.name ?? "");
  }

  useEffect(() => {
    const localCart = getCart();
    if (!localCart) { router.push("/restaurants"); return; }
    setCart(localCart);

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: addrData }, { data: allAddrData }] = await Promise.all([
        supabase
          .from("addresses")
          .select("id, label, full_address, area_id")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .single(),
        supabase
          .from("addresses")
          .select("id, label, full_address, area_id")
          .eq("user_id", user.id),
      ]);

      if (addrData) {
        setAddress(addrData);
        await fetchDeliveryFee(addrData.area_id);
      } else {
        setNoAddress(true);
      }

      setAllAddresses(allAddrData ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setApplying(true);
    setCouponError("");
    setCouponDiscount(0);
    setAppliedCoupon(null);

    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (!data) { setCouponError("كود غير صحيح أو منتهي"); setApplying(false); return; }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("هذا الكود منتهي الصلاحية"); setApplying(false); return;
    }

    const cartNow = getCart();
    const sub = (cartNow?.items ?? []).reduce(
      (sum, item) => sum + itemUnitPrice(item) * item.qty, 0
    );

    if (data.min_order && sub < data.min_order) {
      setCouponError(`الحد الأدنى للطلب ${data.min_order} ج.م`); setApplying(false); return;
    }

    if (data.type === "قيمة ثابتة" || data.type === "fixed") {
      setCouponDiscount(data.value);
    } else if (data.type === "نسبة" || data.type === "percentage" || data.type === "نسبة مئوية") {
      setCouponDiscount(Math.round(deliveryFee * data.value / 100));
    }

    setAppliedCoupon({ id: data.id, used_count: data.used_count ?? 0 });
    setApplying(false);
  }

  async function handleConfirm() {
    if (!cart || !address || !userId) return;
    setSubmitting(true);

    const subtotal = cart.items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
    const total    = Math.max(0, subtotal + deliveryFee - couponDiscount);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id:       userId,
        address_id:    address.id,
        restaurant_id: cart.restaurantId,
        status:        "new",
        subtotal,
        delivery_fee:    deliveryFee,
        discount_amount: couponDiscount || null,
        total,
        notes:           orderNote.trim() || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.log("Order Error:", orderError);
      setSubmitting(false);
      return;
    }

    const orderItems = cart.items.map((item) => ({
      order_id:       order.id,
      menu_item_id:   item.id,
      quantity:       item.qty,
      price_at_order: itemUnitPrice(item),
      extras:         item.extras ?? null,
      notes:          item.notes  ?? null,
    }));

    await supabase.from("order_items").insert(orderItems);

    /* ── تسجيل استخدام الكوبون ── */
    if (appliedCoupon) {
      const { data: existingUsage } = await supabase
        .from("coupon_usages")
        .select("id, used_count")
        .eq("coupon_id", appliedCoupon.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingUsage) {
        await supabase
          .from("coupon_usages")
          .update({ used_count: existingUsage.used_count + 1 })
          .eq("id", existingUsage.id);
      } else {
        await supabase
          .from("coupon_usages")
          .insert({ coupon_id: appliedCoupon.id, user_id: userId, used_count: 1 });
      }

      await supabase
        .from("coupons")
        .update({ used_count: appliedCoupon.used_count + 1 })
        .eq("id", appliedCoupon.id);
    }

    clearCart();
    localStorage.removeItem("hala_order_note");
    router.push(`/orders/${order.id}`);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── No default address ── */
  if (noAddress) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl">📍</span>
        <p className="text-base font-bold text-[var(--color-secondary)]">أضف عنوان توصيل أولاً</p>
        <p className="text-sm text-[var(--color-muted)]">لم يتم تحديد عنوان افتراضي للتوصيل</p>
        <Link href="/address/new" className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl">
          أضف عنوان
        </Link>
      </div>
    );
  }

  const items    = cart!.items;
  const subtotal = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
  const total    = Math.max(0, subtotal + deliveryFee - couponDiscount);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/cart" className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">تأكيد الطلب</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-[280px] flex flex-col gap-4">

          {/* ── 1. عنوان التوصيل ── */}
          <SectionCard title="عنوان التوصيل">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-[var(--color-secondary)]">{address!.label}</p>
                  {areaName && (
                    <p className="text-xs font-semibold text-[#FF6000]">📍 {areaName}</p>
                  )}
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{address!.full_address}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddressPicker(true)}
                className="text-sm font-bold text-[var(--color-primary)] flex-shrink-0"
              >
                تغيير
              </button>
            </div>
          </SectionCard>

          {/* ── 2. تفاصيل الطلب ── */}
          <SectionCard title="تفاصيل الطلب">
            <p className="text-sm font-bold text-[var(--color-secondary)] mb-3">{cart!.restaurantName}</p>
            <div className="flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white bg-[var(--color-primary)] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {item.qty}
                    </span>
                    <span className="text-sm text-[var(--color-secondary)]">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-secondary)]">
                    {itemUnitPrice(item) * item.qty} ج.م
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── 3. الكوبون ── */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4">
            <p className="text-sm font-bold text-[var(--color-secondary)] mb-3">وفّر على طلبك</p>
            <div className="flex gap-2">
              <button
                onClick={applyCoupon}
                disabled={applying || !couponCode.trim()}
                className="bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-2.5 rounded-xl flex-shrink-0 disabled:opacity-50"
              >
                {applying ? "..." : "إرسال"}
              </button>
              <input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                placeholder="أدخل رمز القسيمة هنا"
                className="flex-1 text-sm text-right outline-none bg-[var(--color-surface)] rounded-xl px-3 py-2.5 text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
                dir="rtl"
              />
            </div>
            {couponError && (
              <p className="text-xs text-red-500 mt-2 text-right">{couponError}</p>
            )}
            {couponDiscount > 0 && !couponError && (
              <p className="text-xs font-bold text-green-600 mt-2 text-right">
                ✅ تم تطبيق الكود — وفرت {couponDiscount} ج.م
              </p>
            )}
          </section>

          {/* ── 4. طريقة الدفع ── */}
          <SectionCard title="طريقة الدفع">
            <div className="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 14h2" />
                  <path d="M10 14h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-secondary)]">الدفع عند الاستلام</p>
            </div>
          </SectionCard>

        </main>

        {/* ── ملخص الدفع + تأكيد — ثابت في الأسفل ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-20">

          {/* ملخص الدفع */}
          <div className="px-4 pt-3 pb-1" dir="ltr">
            <div className="flex justify-between items-center mb-1">
              <span dir="rtl" className="text-sm text-[#1A1A1A]">{subtotal} ج.م</span>
              <span className="text-sm text-[#6B7280]">قيمة الطلب</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span dir="rtl"  className="text-sm text-[#1A1A1A]">{deliveryFee} ج.م</span>
              <span className="text-sm text-[#6B7280]">رسوم التوصيل</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-green-600 flex items-center gap-0.5" dir="ltr">
                  <span>ج.م</span>
                  <span>{couponDiscount}</span>
                  <span>-</span>
                </span>
                <span className="text-sm font-bold text-green-600">خصم الكوبون</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span dir="rtl" className="text-base font-black text-[#FF6000]">{total} ج.م</span>
              <span className="text-base font-black text-[#1A1A1A]">المجموع</span>
            </div>
          </div>

          {/* زرار التأكيد */}
          <div className="px-4 pb-6 pt-2">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-[var(--color-primary)] text-white text-base font-bold py-4 rounded-2xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
            </button>
            <p className="text-center text-xs text-[var(--color-muted)] mt-2">
              سيتم إرسال طلبك فور التأكيد
            </p>
          </div>
        </div>

      </div>

      {/* ── Address Picker Sheet ── */}
      {showAddressPicker && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAddressPicker(false)}>
          <div
            className="fixed bottom-0 right-0 left-0 bg-white rounded-t-3xl p-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-[var(--color-secondary)]">اختر عنوان التوصيل</h3>
              <button
                onClick={() => setShowAddressPicker(false)}
                className="w-7 h-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col max-h-64 overflow-y-auto mb-3">
              {allAddresses.map((addr) => {
                const isSelected = addr.id === address?.id;
                return (
                  <button
                    key={addr.id}
                    onClick={async () => {
                      setAddress(addr);
                      setShowAddressPicker(false);
                      setCouponDiscount(0);
                      setCouponCode("");
                      setCouponError("");
                      await fetchDeliveryFee(addr.area_id);
                    }}
                    className={`bg-[var(--color-surface)] rounded-2xl p-3 mb-2 text-right w-full transition-colors ${
                      isSelected ? "border-2 border-[var(--color-primary)]" : "border-2 border-transparent"
                    }`}
                  >
                    <p className="text-sm font-bold text-[var(--color-secondary)]">{addr.label}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{addr.full_address}</p>
                  </button>
                );
              })}
            </div>

            <Link
              href="/address/new"
              className="flex items-center justify-center gap-2 w-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-bold py-3 rounded-2xl"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              إضافة عنوان جديد
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
