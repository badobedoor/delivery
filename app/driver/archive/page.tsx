"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
};

type DBOrder = {
  id: string;
  total: number;
  user_order_number: number | null;
  created_at: string;
  restaurants: { name: string } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function DriverArchivePage() {
  const [orders,  setOrders]  = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const driver = JSON.parse(localStorage.getItem("driver_user") || "{}");
      if (!driver.id) { setLoading(false); return; }

      const { data } = await supabase
        .from("orders")
        .select(`
          id, total, user_order_number, created_at,
          restaurants!restaurant_id (name)
        `)
        .eq("delivery_id", driver.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      setOrders((data as DBOrder[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalEarnings = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}
      >
        <Link
          href="/driver/orders"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: C.bg, color: C.muted }}
        >
          <BackIcon />
        </Link>
        <p className="flex-1 text-lg font-black text-center" style={{ color: C.text }}>الأرشيف</p>
        <div className="w-8" />
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Summary card ── */}
          <div className="p-4">
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div>
                <p className="text-xs" style={{ color: C.muted }}>إجمالي الطلبات المنجزة</p>
                <p className="text-2xl font-black" style={{ color: C.teal }}>{orders.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: C.muted }}>إجمالي المكاسب</p>
                <p className="text-2xl font-black" style={{ color: C.green }}>{totalEarnings} ج.م</p>
              </div>
            </div>
          </div>

          {/* ── Empty state ── */}
          {orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
              <span className="text-5xl">📦</span>
              <p className="text-sm" style={{ color: C.muted }}>لا توجد طلبات في الأرشيف</p>
            </div>
          ) : (
            /* ── Orders list ── */
            <div className="flex flex-col gap-3 px-4 pb-24">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${C.green}18` }}
                  >
                    ✅
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black" style={{ color: C.teal }}>
                        #{o.user_order_number ?? "—"}
                      </span>
                      <span className="text-sm font-semibold truncate" style={{ color: C.text }}>
                        {o.restaurants?.name ?? "—"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {formatDate(o.created_at)}
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-black" style={{ color: C.text }}>{o.total} ج.م</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${C.green}20`, color: C.green }}
                    >
                      تم التسليم
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
