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
      return { label: "تم التسليم",   color: "#22C55E", gif: "/animations/food_delivered.gif" };
    case "cancelled":
      return { label: "ملغي",         color: "#EF4444", gif: "" };
    default:
      return { label: "قيد المراجعة", color: "#F97316", gif: "/animations/pending.gif" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("orders")
        .select(`
          id, status, total, created_at, user_order_number,
          restaurants (name),
          order_items (id)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOrders((data ?? []) as unknown as Order[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/"
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

          {/* ── Loading ── */}
          {loading && (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
              <span className="text-7xl">🧾</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد طلبات بعد</p>
              <Link
                href="/restaurants"
                className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl"
              >
                تصفّح المطاعم
              </Link>
            </div>
          )}

          {/* ── Orders list ── */}
          {!loading && orders.length > 0 && (
            <div className="flex flex-col gap-3">
              {orders.map((order) => {
                const statusInfo = getCustomerStatus(order.status);
                const itemCount  = order.order_items.length;
                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    {/* معلومات الأوردر */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-[var(--color-secondary)]">
                          {order.restaurants?.name ?? "—"}
                        </p>
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          {statusInfo.gif && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={statusInfo.gif}
                              alt={statusInfo.label}
                              className="w-16 h-16 object-contain"
                            />
                          )}
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
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
                        <span className="text-xs text-[var(--color-muted)]">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* أزرار */}
                    <div className="border-t border-[var(--color-border)]" />
                    <div className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button className="w-full border-2 border-[var(--color-border)] text-[var(--color-muted)] text-sm font-bold py-2 rounded-xl active:scale-[0.98] transition-transform">
                        تقييم
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
