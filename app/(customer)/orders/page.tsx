"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  user_order_number: number | null;
  restaurant_id: string | null;
  restaurants: { id: string; name: string } | null;
  order_items: { id: string }[];
};

type RatingValues = { food_quality: number; value_for_money: number; packaging: number };

/* ── Helpers ── */
function getCustomerStatus(status: string): { label: string; color: string } {
  switch (status) {
    case "new":        return { label: "قيد المراجعة", color: "#F97316" };
    case "pending":
    case "accepted":   return { label: "قيد التنفيذ",  color: "#3B82F6" };
    case "on_the_way": return { label: "في الطريق",    color: "#A855F7" };
    case "delivered":  return { label: "تم الاستلام",   color: "#22C55E" };
    case "cancelled":  return { label: "ملغي",         color: "#EF4444" };
    default:           return { label: "قيد المراجعة", color: "#F97316" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });
}

const ORDER_SELECT = `
  id, status, total, created_at, user_order_number, restaurant_id,
  restaurants (id, name),
  order_items (id)
`;

const RATING_AXES = [
  { label: "جودة الطعام",        key: "food_quality"    },
  { label: "القيمة مقابل السعر", key: "value_for_money" },
  { label: "تغليف الطلب",        key: "packaging"       },
] as const;

export default function OrdersPage() {
  const router = useRouter();

  /* ── Data state ── */
  const [activeOrders,    setActiveOrders]    = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [ratedIds,        setRatedIds]        = useState<Set<string>>(new Set());
  const [userId,          setUserId]          = useState<string | null>(null);

  /* ── Rating modal state ── */
  const [showRatingModal,  setShowRatingModal]  = useState(false);
  const [selectedOrder,    setSelectedOrder]    = useState<Order | null>(null);
  const [ratings,          setRatings]          = useState<RatingValues>({ food_quality: 0, value_for_money: 0, packaging: 0 });
  const [comment,          setComment]          = useState("");
  const [ratingError,      setRatingError]      = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [activeRes, deliveredRes, ratedRes] = await Promise.all([
        supabase
          .from("orders")
          .select(ORDER_SELECT)
          .eq("user_id", user.id)
          .in("status", ["new", "pending", "accepted", "on_the_way"])
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(ORDER_SELECT)
          .eq("user_id", user.id)
          .eq("status", "delivered")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("restaurant_ratings")
          .select("order_id")
          .eq("user_id", user.id),
      ]);

      setActiveOrders((activeRes.data ?? []) as unknown as Order[]);
      setDeliveredOrders((deliveredRes.data ?? []) as unknown as Order[]);
      setRatedIds(new Set((ratedRes.data ?? []).map((r: { order_id: string }) => r.order_id)));
      setLoading(false);
    }
    load();
  }, []);

  /* ── Submit rating ── */
  async function submitRating() {
    if (!selectedOrder || !userId) return;
    if (!ratings.food_quality || !ratings.value_for_money || !ratings.packaging) {
      setRatingError("من فضلك قيّم كل المحاور");
      return;
    }
    setRatingError("");
    setSubmittingRating(true);

    const restaurantId = selectedOrder.restaurant_id ?? selectedOrder.restaurants?.id ?? null;

    await supabase.from("restaurant_ratings").insert({
      restaurant_id:   restaurantId,
      user_id:         userId,
      order_id:        selectedOrder.id,
      food_quality:    ratings.food_quality,
      value_for_money: ratings.value_for_money,
      packaging:       ratings.packaging,
      comment:         comment.trim() || null,
    });

    /* حدّث متوسط المطعم */
    const { data: allRatings } = await supabase
      .from("restaurant_ratings")
      .select("food_quality, value_for_money, packaging")
      .eq("restaurant_id", restaurantId);

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
        .eq("id", restaurantId);
    }

    setRatedIds((prev) => new Set([...prev, selectedOrder.id]));
    setShowRatingModal(false);
    setSelectedOrder(null);
    setRatings({ food_quality: 0, value_for_money: 0, packaging: 0 });
    setComment("");
    setSubmittingRating(false);
  }

  const isEmpty = activeOrders.length === 0 && deliveredOrders.length === 0;

  function openRatingModal(order: Order) {
    setSelectedOrder(order);
    setRatings({ food_quality: 0, value_for_money: 0, packaging: 0 });
    setComment("");
    setRatingError("");
    setShowRatingModal(true);
  }

  function renderCard(order: Order, showRating: boolean) {
    const statusInfo = getCustomerStatus(order.status);
    const itemCount  = order.order_items.length;
    const isRated    = ratedIds.has(order.id);

    return (
      <div
        key={order.id}
        onClick={() => router.push(`/orders/${order.id}`)}
        className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-[var(--color-secondary)]">
              {order.restaurants?.name ?? "—"}
            </p>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs text-[var(--color-muted)]">
              {itemCount} {itemCount === 1 ? "وجبة" : "وجبات"}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
            <span className="text-xs font-semibold text-[var(--color-secondary)]">
              {order.total} ج.م
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
            <span className="text-xs text-[var(--color-muted)]">{formatDate(order.created_at)}</span>
          </div>
        </div>

        {showRating && (
          <>
            <div className="border-t border-[var(--color-border)]" />
            <div className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <button
                disabled={isRated}
                onClick={() => { if (!isRated) openRatingModal(order); }}
                className="w-full border-2 text-sm font-bold py-2 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{
                  borderColor: isRated ? "var(--color-border)" : "var(--color-primary)",
                  color:       isRated ? "var(--color-muted)" : "var(--color-primary)",
                }}
              >
                {isRated ? "تم التقييم ✓" : "تقييم"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/account"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">طلباتي</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-10">

          {loading && (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && isEmpty && (
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
              <span className="text-7xl">🧾</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد طلبات بعد</p>
              <Link href="/restaurants"
                className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl">
                تصفّح المطاعم
              </Link>
            </div>
          )}

          {!loading && !isEmpty && (
            <div className="flex flex-col gap-6">

              {/* قيد التنفيذ */}
              {activeOrders.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-[var(--color-muted)] mb-2 px-1">قيد التنفيذ</p>
                  <div className="flex flex-col gap-3">
                    {activeOrders.map((o) => renderCard(o, false))}
                  </div>
                </section>
              )}

              {/* الطلبات السابقة */}
              {deliveredOrders.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-[var(--color-muted)] mb-2 px-1">الطلبات السابقة</p>
                  <div className="flex flex-col gap-3">
                    {deliveredOrders.map((o) => renderCard(o, true))}
                  </div>
                </section>
              )}

            </div>
          )}

        </main>
      </div>

      {/* ── Rating Modal ── */}
      {showRatingModal && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRatingModal(false); }}
        >
          <div className="w-full bg-white rounded-t-3xl p-5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#1A1A1A]">
                قيّم تجربتك مع {selectedOrder.restaurants?.name ?? "المطعم"}
              </h3>
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#6B7280]"
              >
                ✕
              </button>
            </div>

            {/* النجوم */}
            {RATING_AXES.map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1A1A1A]">{label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatings((r) => ({ ...r, [key]: star }))}
                    >
                      <span style={{
                        color:    ratings[key] >= star ? "#FBBF24" : "#D1D5DB",
                        fontSize: 28,
                      }}>★</span>
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
              className="w-full rounded-xl p-3 text-sm resize-none outline-none"
              style={{ border: "1px solid #E5E7EB", background: "#F9FAFB" }}
            />

            {ratingError && (
              <p className="text-xs text-red-500 text-center">{ratingError}</p>
            )}

            {/* زرار الإرسال */}
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
