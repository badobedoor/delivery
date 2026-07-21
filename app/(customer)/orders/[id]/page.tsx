"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addToCart, clearCart } from "@/lib/cart";
import { formatCairoDateTime } from "@/lib/dateTime";
import InfoModal from "@/components/customer/InfoModal";


/* ── Types ── */
type OrderItem = {
  id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  extras: { name: string; price: number }[] | null;
  notes: string | null;
  menu_items: { name: string; image_url: string | null } | null;
};

type Order = {
  id: string;
  status: string;
  restaurant_id: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  notes: string | null;
  restaurants: { name: string } | null;
  addresses: { label: string; full_address: string } | null;
  order_items: OrderItem[];
};

/* ── Customer-facing status ── */
function getCustomerStatus(status: string): { label: string; color: string; gif: string } {
  switch (status) {
    case "new":
      return { label: "قيد المراجعة", color: "#F97316", gif: "/animations/pending.gif" };
    case "pending":
    case "accepted":
      return { label: "قيد التنفيذ",  color: "#3B82F6", gif: "/animations/Food_in_progress.gif" };
    case "on_the_way":
      return { label: "في الطريق",    color: "#A855F7", gif: "/animations/on_the_way.gif" };
    case "delivered":
      return { label: "تم الاستلام",   color: "#22C55E", gif: "/animations/food_delivered.gif" };
    case "cancelled":
      return { label: "ملغي",         color: "#EF4444", gif: "" };
    default:
      return { label: "قيد المراجعة", color: "#F97316", gif: "/animations/pending.gif" };
  }
}

function formatDate(iso: string) {
  return formatCairoDateTime(iso);
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

export default function OrderDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [order,      setOrder]      = useState<Order | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [rated,            setRated]            = useState(false);
  const [reordering,       setReordering]       = useState(false);
  const [favSaving,        setFavSaving]        = useState(false);
  const [favSaved,         setFavSaved]         = useState(false);
  const [favModal,         setFavModal]         = useState<"success" | "duplicate" | null>(null);
  const [showRatingModal,  setShowRatingModal]  = useState(false);
  const [ratings,          setRatings]          = useState({ food_quality: 0, value_for_money: 0, packaging: 0 });
  const [comment,          setComment]          = useState("");
  const [ratingError,      setRatingError]      = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, restaurant_id, subtotal, delivery_fee, total, created_at, notes,
          restaurants (name),
          addresses (label, full_address),
          order_items (
            id, menu_item_id, quantity, price_at_order, extras, notes,
            menu_items (name, image_url)
          )
        `)
        .eq("id", id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const orderData = data as unknown as Order;
      setOrder(orderData);

      const { data: { user } } = await supabase.auth.getUser();

      /* تحقق لو الأوردر اتقيّم قبل كده */
      const { data: ratingData } = await supabase
        .from("restaurant_ratings")
        .select("id")
        .eq("order_id", id)
        .maybeSingle();
      setRated(!!ratingData);

      /* تحقق لو نفس الوجبات محفوظة في المفضلة */
      if (user && orderData.restaurant_id) {
        const { data: existingFavs } = await supabase
          .from("favorite_orders")
          .select("id, items")
          .eq("user_id", user.id)
          .eq("restaurant_id", orderData.restaurant_id);
        const orderItemIds = orderData.order_items.map((i: OrderItem) => i.menu_item_id).sort().join(",");
        const alreadySaved = (existingFavs ?? []).some((fav) => {
          const favItemIds = (fav.items as { id: string }[]).map((i) => i.id).sort().join(",");
          return favItemIds === orderItemIds;
        });
        setFavSaved(alreadySaved);
      }

      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "orders",
        filter: `id=eq.${id}`,
      }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function handleReorder() {
    if (!order) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      document.cookie = `hala_return_to=${encodeURIComponent(JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY }))}; path=/; max-age=600; SameSite=Lax`;
      router.push("/login");
      return;
    }
    setReordering(true);

    const itemIds = order.order_items.map((i) => i.menu_item_id);

    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, is_active")
      .in("id", itemIds);

    const unavailable = (menuItems ?? []).filter((i: { is_active: boolean }) => !i.is_active) as { id: string; name: string; is_active: boolean }[];

    if (unavailable.length > 0) {
      alert(`الوجبات دي مش متاحة دلوقتي:\n${unavailable.map((i) => i.name).join("\n")}`);
      setReordering(false);
      return;
    }

    clearCart();
    order.order_items.forEach((item) => {
      addToCart(order.restaurant_id, order.restaurants?.name ?? "", {
        id:          item.menu_item_id,
        name:        item.menu_items?.name ?? "",
        price:       item.price_at_order,
        qty:         item.quantity,
        image_url:   item.menu_items?.image_url ?? null,
        description: null,
        extras:      item.extras ?? undefined,
        notes:       item.notes ?? undefined,
      });
    });

    router.push("/cart");
  }

  async function handleSaveFav() {
    if (!order || favSaving) return;
    setFavSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); setFavSaving(false); return; }

    /* تحقق لو نفس الوجبات محفوظة بالفعل */
    const { data: existingFavs } = await supabase
      .from("favorite_orders")
      .select("id, items")
      .eq("user_id", user.id)
      .eq("restaurant_id", order.restaurant_id);

    const orderItemIds = order.order_items.map((i) => i.menu_item_id).sort().join(",");
    const isDuplicate = (existingFavs ?? []).some((fav) => {
      const favItemIds = (fav.items as { id: string }[]).map((i) => i.id).sort().join(",");
      return favItemIds === orderItemIds;
    });

    if (isDuplicate) {
      setFavSaving(false);
      setFavModal("duplicate");
      return;
    }

    await supabase.from("favorite_orders").insert({
      user_id:         user.id,
      restaurant_id:   order.restaurant_id,
      restaurant_name: order.restaurants?.name ?? "",
      name:            order.restaurants?.name ?? "",
      items:           order.order_items.map((i) => ({
        id:          i.menu_item_id,
        name:        i.menu_items?.name ?? "",
        price:       i.price_at_order,
        qty:         i.quantity,
        image_url:   i.menu_items?.image_url ?? null,
        description: null,
        extras:      i.extras ?? [],
      })),
      total: order.total,
    });

    setFavSaving(false);
    setFavSaved(true);
    setFavModal("success");
  }

  async function submitRating() {
    if (!order) return;
    if (!ratings.food_quality || !ratings.value_for_money || !ratings.packaging) {
      setRatingError("من فضلك قيّم كل المحاور");
      return;
    }
    setRatingError("");
    setSubmittingRating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmittingRating(false); return; }

    await supabase.from("restaurant_ratings").insert({
      restaurant_id:   order.restaurant_id,
      user_id:         user.id,
      order_id:        order.id,
      food_quality:    ratings.food_quality,
      value_for_money: ratings.value_for_money,
      packaging:       ratings.packaging,
      comment:         comment.trim() || null,
    });

    /* حدّث متوسط المطعم */
    const { data: allRatings } = await supabase
      .from("restaurant_ratings")
      .select("food_quality, value_for_money, packaging")
      .eq("restaurant_id", order.restaurant_id);

    if (allRatings?.length) {
      const avg = (
        allRatings.reduce(
          (s: number, r: { food_quality: number; value_for_money: number; packaging: number }) =>
            s + (r.food_quality + r.value_for_money + r.packaging) / 3,
          0
        ) / allRatings.length
      ).toFixed(1);
      await supabase
        .from("restaurants")
        .update({ rating_avg: avg, rating_count: allRatings.length })
        .eq("id", order.restaurant_id);
    }

    setRated(true);
    setShowRatingModal(false);
    setRatings({ food_quality: 0, value_for_money: 0, packaging: 0 });
    setComment("");
    setSubmittingRating(false);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-base font-bold text-[var(--color-secondary)]">الطلب غير موجود</p>
        <Link href="/orders" className="text-sm text-[var(--color-primary)] underline">
          العودة للطلبات
        </Link>
      </div>
    );
  }

  const statusInfo  = getCustomerStatus(order.status);
  const isDelivered = order.status === "delivered";

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── 1. Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/orders"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <div className="text-center">
              <h1 className="text-base font-black text-[var(--color-secondary)]">تفاصيل الطلب</h1>
              <p className="text-[10px] text-[var(--color-muted)] mt-0.5 font-mono">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-36">

          {/* ── 2. حالة الأوردر ── */}
          <section className="bg-white rounded-2xl p-4 mb-3 flex flex-col items-center gap-2">
            {statusInfo.gif && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={statusInfo.gif}
                alt={statusInfo.label}
                className="w-full h-64 object-contain"
              />
            )}
            <span
              className="text-sm font-black px-5 py-2 rounded-full"
              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
            <p className="text-xs text-[var(--color-muted)]">{formatDate(order.created_at)}</p>
          </section>

          {/* ── 3. عنوان التوصيل ── */}
          {order.addresses && (
            <section className="bg-white rounded-2xl p-4 mb-3">
              <p className="text-[10px] font-bold text-[var(--color-muted)] mb-2 uppercase tracking-wide">
                عنوان التوصيل
              </p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-secondary)]">{order.addresses.label}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{order.addresses.full_address}</p>
                </div>
              </div>
            </section>
          )}

          {/* ── 4. تفاصيل الطلب ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              تفاصيل الطلب
            </p>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={item.menu_items?.image_url ?? FALLBACK_IMG}
                      alt={item.menu_items?.name ?? ""}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)] truncate">
                      {item.menu_items?.name ?? "—"}
                    </p>
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                        {item.extras.map((e) => e.name).join("، ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">📝 {item.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-white bg-[var(--color-primary)] w-5 h-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-secondary)]">
                      {item.price_at_order * item.quantity} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. ملخص الدفع ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              ملخص الدفع
            </p>
            <div className="flex flex-col gap-2.5" dir="rtl">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">قيمة الطلب</span>
                <span className="text-sm text-[var(--color-secondary)]">{order.subtotal} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">رسوم التوصيل</span>
                <span className="text-sm text-[var(--color-secondary)]">{order.delivery_fee} ج.م</span>
              </div>
              <div className="border-t border-[var(--color-border)] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-black text-[var(--color-secondary)]">المجموع</span>
                <span className="text-sm font-black text-[var(--color-secondary)]">{order.total} ج.م</span>
              </div>
            </div>
          </section>

          {/* ── 6. طريقة الدفع ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              طريقة الدفع
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 14h2" />
                  <path d="M10 14h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-secondary)]">الدفع عند الاستلام </p>
            </div>
          </section>

        </main>

        {/* ── Bottom Bar ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="w-full px-4 pb-6 pt-3 bg-white border-t border-[var(--color-border)]">

            {isDelivered ? (
              <div className="flex flex-col gap-2">
                {/* تقييم + مفضلة */}
                <div className="flex gap-2">
                  <button
                    disabled={rated}
                    onClick={() => {
                      if (rated) return;
                      setRatings({ food_quality: 0, value_for_money: 0, packaging: 0 });
                      setComment("");
                      setRatingError("");
                      setShowRatingModal(true);
                    }}
                    className="flex-1 border-2 text-sm font-bold py-3 rounded-2xl transition-all disabled:opacity-60"
                    style={{
                      borderColor: rated ? "var(--color-border)" : "var(--color-primary)",
                      color:       rated ? "var(--color-muted)" : "var(--color-primary)",
                    }}
                  >
                    {rated ? "تم التقييم ✓" : "تقييم المطعم"}
                  </button>
                  <button
                    disabled={favSaving || favSaved}
                    onClick={handleSaveFav}
                    className="flex-1 border-2 border-[#EF4444] text-sm font-bold py-3 rounded-2xl transition-all disabled:opacity-60"
                    style={{ color: "#EF4444" }}
                  >
                    {favSaved ? "تم الحفظ ✓" : favSaving ? "..." : "إضافة للمفضلة ♡"}
                  </button>
                </div>
                {/* إعادة الطلب */}
                <button
                  disabled={reordering}
                  onClick={handleReorder}
                  className="w-full bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {reordering ? "جاري التحقق..." : "إعادة الطلب "}
                </button>
              </div>
            ) : (
              <Link
                href="/"
                className="w-full bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center"
              >
                العودة للرئيسية
              </Link>
            )}

          </div>
        </div>

      </div>

      <InfoModal
        isOpen={favModal !== null}
        icon={favModal === "success" ? "✅" : "⚠️"}
        message={favModal === "success" ? "تم الحفظ في المفضلة" : "هذا الطلب محفوظ بالفعل في مفضلتك"}
        onClose={() => setFavModal(null)}
      />

      {/* ── Rating Modal ── */}
      {showRatingModal && order && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRatingModal(false); }}
        >
          <div className="w-full bg-white rounded-t-3xl p-5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#1A1A1A]">
                قيّم تجربتك مع {order.restaurants?.name ?? "المطعم"}
              </h3>
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#6B7280]"
              >
                ✕
              </button>
            </div>

            {/* النجوم */}
            {([
              { label: "جودة الطعام",        key: "food_quality"    },
              { label: "القيمة مقابل السعر", key: "value_for_money" },
              { label: "تغليف الطلب",        key: "packaging"       },
            ] as const).map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1A1A1A]">{label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRatings((r) => ({ ...r, [key]: star }))}>
                      <span style={{ color: ratings[key] >= star ? "#FBBF24" : "#D1D5DB", fontSize: 28 }}>★</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* تعليق */}
            <textarea
              placeholder="أضف تعليقك (اختياري)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-xl p-3 text-sm resize-none outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
              style={{ border: "1px solid #E5E7EB", background: "#F9FAFB" }}
            />

            {ratingError && (
              <p className="text-xs text-red-500 text-center">{ratingError}</p>
            )}

            <button
              onClick={submitRating}
              disabled={submittingRating}
              className="w-full py-3 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform disabled:opacity-60"
              style={{ background: "#FF6000" }}
            >
              {submittingRating ? "جاري الإرسال..." : "إرسال التقييم ⭐"}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
