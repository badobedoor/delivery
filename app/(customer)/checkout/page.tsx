"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCart, clearCart, Cart, CartItem } from "@/lib/cart";

type Address = { id: string; label: string; full_address: string };

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

  useEffect(() => {
    const localCart = getCart();
    if (!localCart) {
      router.push("/restaurants");
      return;
    }
    setCart(localCart);

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: addrData }, { data: settingsData }, { data: allAddrData }] = await Promise.all([
        supabase
          .from("addresses")
          .select("id, label, full_address")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .single(),
        supabase
          .from("settings")
          .select("delivery_fee")
          .single(),
        supabase
          .from("addresses")
          .select("id, label, full_address")
          .eq("user_id", user.id),
      ]);

      if (addrData) setAddress(addrData);
      else          setNoAddress(true);

      setAllAddresses(allAddrData ?? []);

      setDeliveryFee(settingsData?.delivery_fee ?? 0);
      setLoading(false);
    }

    loadData();
  }, []);

  async function handleConfirm() {
    if (!cart || !address || !userId) return;
    setSubmitting(true);

    const subtotal = cart.items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id:       userId,
        address_id:    address.id,
        restaurant_id: cart.restaurantId,
        status:        "new",
        subtotal,
        delivery_fee: deliveryFee,
        total:        subtotal + deliveryFee,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.log("Order Error:", orderError);
      console.log("Order Data:", order);
      setSubmitting(false);
      return;
    }

    const orderItems = cart.items.map((item) => ({
      order_id:       order.id,
      menu_item_id:   item.id,
      quantity:       item.qty,
      price_at_order: itemUnitPrice(item),
      extras:         item.extras ?? null,
    }));

    await supabase.from("order_items").insert(orderItems);
    clearCart();
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
        <Link
          href="/address/new"
          className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl"
        >
          أضف عنوان
        </Link>
      </div>
    );
  }

  const items    = cart!.items;
  const subtotal = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0);
  const total    = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/cart"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">تأكيد الطلب</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-36 flex flex-col gap-4">

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
                <div>
                  <p className="text-sm font-bold text-[var(--color-secondary)]">{address!.label}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{address!.full_address}</p>
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

          {/* ── 3. ملخص الدفع ── */}
          <SectionCard title="ملخص الدفع">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">المجموع</span>
                <span className="text-sm text-[var(--color-secondary)]">{subtotal} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">رسوم التوصيل</span>
                <span className="text-sm text-[var(--color-secondary)]">{deliveryFee} ج.م</span>
              </div>
              <div className="border-t border-[var(--color-border)] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-black text-[var(--color-secondary)]">قيمة الطلب</span>
                <span className="text-sm font-black text-[var(--color-secondary)]">{total} ج.م</span>
              </div>
            </div>
          </SectionCard>

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
              <p className="text-sm font-semibold text-[var(--color-secondary)]">الدفع عند الاستلام (كاش)</p>
            </div>
          </SectionCard>

        </main>

        {/* ── Bottom: تأكيد ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-[var(--color-border)]">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-[var(--color-primary)] text-white text-base font-bold py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
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
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={() => setShowAddressPicker(false)}
        >
          <div
            className="fixed bottom-0 right-0 left-0 bg-white rounded-t-3xl p-4 z-50 max-w-[430px] mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* العنوان */}
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

            {/* قائمة العناوين */}
            <div className="flex flex-col max-h-64 overflow-y-auto mb-3">
              {allAddresses.map((addr) => {
                const isSelected = addr.id === address?.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => { setAddress(addr); setShowAddressPicker(false); }}
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

            {/* إضافة عنوان جديد */}
            <Link
              href="/address/new"
              className="flex items-center justify-center gap-2 w-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-bold py-3 rounded-2xl"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2.5">
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
