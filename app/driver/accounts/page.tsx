"use client";

import { useState } from "react";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  orange: "#F97316",
};

/* ── Types ── */
type Transaction = {
  id:         number;
  num:        string;
  restaurant: string;
  amount:     number;
  time:       string;
};

type Shift = {
  id:         number;
  name:       string;
  date:       string;
  orders:     number;
  total:      number;
};

/* ── Current shift data ── */
const currentShift = {
  name:     "وردية الصبح",
  start:    "٨:٠٠ ص",
  orders:   5,
  earnings: 750,
};

const currentTransactions: Transaction[] = [
  { id: 1, num: "#١٠٢٥", restaurant: "كنتاكي",     amount: 142, time: "١١:٣٠ ص" },
  { id: 2, num: "#١٠٢٤", restaurant: "شاورمر",      amount: 97,  time: "١٠:٥٥ ص" },
  { id: 3, num: "#١٠٢٣", restaurant: "بيتزا هت",    amount: 185, time: "١٠:١٠ ص" },
  { id: 4, num: "#١٠٢٢", restaurant: "ماكدونالدز",  amount: 210, time: "٩:٢٥ ص"  },
  { id: 5, num: "#١٠٢١", restaurant: "صب واي",       amount: 116, time: "٨:٤٠ ص"  },
];

/* ── Past shifts data ── */
const pastShifts: Shift[] = [
  { id: 1, name: "وردية المساء",  date: "١٢ أبريل ٢٠٢٦", orders: 8,  total: 1240 },
  { id: 2, name: "وردية الصبح",   date: "١٢ أبريل ٢٠٢٦", orders: 6,  total:  890 },
  { id: 3, name: "وردية المساء",  date: "١١ أبريل ٢٠٢٦", orders: 10, total: 1560 },
  { id: 4, name: "وردية الصبح",   date: "١١ أبريل ٢٠٢٦", orders: 5,  total:  730 },
  { id: 5, name: "وردية المساء",  date: "١٠ أبريل ٢٠٢٦", orders: 9,  total: 1380 },
  { id: 6, name: "وردية الصبح",   date: "١٠ أبريل ٢٠٢٦", orders: 4,  total:  580 },
];

type TabId = "current" | "archive";

export default function DriverAccountsPage() {
  const [tab, setTab] = useState<TabId>("current");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}
      >
        <p className="text-lg font-black" style={{ color: C.text }}>حساباتي</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: `${C.teal}30`, color: C.teal }}>
            م
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {(["current", "archive"] as TabId[]).map((t) => {
          const label = t === "current" ? "الوردية الحالية" : "الأرشيف المالي";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: tab === t ? C.teal : "transparent",
                color:      tab === t ? "#fff" : C.muted,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 pb-24">

        {/* ── TAB: الوردية الحالية ── */}
        {tab === "current" && (
          <>
            {/* Shift summary card */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-4"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-black" style={{ color: C.text }}>{currentShift.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>بدأت الساعة {currentShift.start}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: `${C.green}20`, color: C.green }}
                >
                  نشطة الآن
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-3 flex flex-col gap-0.5"
                  style={{ background: C.bg }}
                >
                  <p className="text-xs" style={{ color: C.muted }}>إجمالي الطلبات</p>
                  <p className="text-2xl font-black" style={{ color: C.teal }}>{currentShift.orders}</p>
                </div>
                <div
                  className="rounded-xl p-3 flex flex-col gap-0.5"
                  style={{ background: C.bg }}
                >
                  <p className="text-xs" style={{ color: C.muted }}>إجمالي المكسب</p>
                  <p className="text-2xl font-black" style={{ color: C.green }}>{currentShift.earnings} ج.م</p>
                </div>
              </div>
            </div>

            {/* Transactions list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: C.muted }}>
                طلبات الوردية
              </p>
              {currentTransactions.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${C.teal}18` }}
                  >
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: C.teal }}>{t.num}</span>
                      <span className="text-sm truncate" style={{ color: C.text }}>{t.restaurant}</span>
                    </div>
                    <p className="text-xs" style={{ color: C.muted }}>{t.time}</p>
                  </div>
                  <span className="text-sm font-black flex-shrink-0" style={{ color: C.green }}>
                    +{t.amount} ج.م
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TAB: الأرشيف المالي ── */}
        {tab === "archive" && (
          <>
            {/* Total summary */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div>
                <p className="text-xs" style={{ color: C.muted }}>إجمالي الورديات</p>
                <p className="text-2xl font-black" style={{ color: C.teal }}>{pastShifts.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: C.muted }}>إجمالي المكاسب</p>
                <p className="text-2xl font-black" style={{ color: C.green }}>
                  {pastShifts.reduce((s, sh) => s + sh.total, 0).toLocaleString()} ج.م
                </p>
              </div>
            </div>

            {/* Past shifts list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              {pastShifts.map((sh, i) => (
                <div
                  key={sh.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${C.orange}18` }}
                  >
                    🕐
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: C.text }}>{sh.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{sh.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-black" style={{ color: C.green }}>{sh.total.toLocaleString()} ج.م</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.teal}20`, color: C.teal }}>
                      {sh.orders} طلبات
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
