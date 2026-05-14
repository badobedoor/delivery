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
  restaurants: { name: string } | null;
  order_items: { id: string }[];
};

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
  id, status, total, created_at, user_order_number,
  restaurants (name),
  order_items (id)
`;

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrders,    setActiveOrders]    = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [ratedIds,        setRatedIds]        = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [activeRes, deliveredRes] = await Promise.all([
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
      ]);

      setActiveOrders((activeRes.data ?? []) as unknown as Order[]);
      setDeliveredOrders((deliveredRes.data ?? []) as unknown as Order[]);
      setLoading(false);
    }
    load();
  }, []);

  function markRated(id: string) {
    setRatedIds((prev) => new Set([...prev, id]));
  }

  const isEmpty = activeOrders.length === 0 && deliveredOrders.length === 0;

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
                onClick={() => markRated(order.id)}
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
    </div>
  );
}
