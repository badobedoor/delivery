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
  red:    "#EF4444",
  purple: "#A855F7",
};

/* ── Types ── */
type TxKind = "order" | "advance" | "penalty" | "settlement" | "commission";

type Tx = {
  id:     number;
  kind:   TxKind;
  label:  string;
  amount: number;   /* positive = credit, negative = debit */
  time:   string;
};

type Shift = {
  id:     number;
  name:   string;
  date:   string;
  orders: number;
  total:  number;
  txs:    Tx[];
};

/* ── Tx meta ── */
const TX_META: Record<TxKind, { emoji: string; color: string }> = {
  order:      { emoji: "📦", color: C.teal   },
  advance:    { emoji: "💵", color: C.orange  },
  penalty:    { emoji: "⚠️", color: C.red     },
  settlement: { emoji: "🔧", color: C.purple  },
  commission: { emoji: "💰", color: C.green   },
};

/* ── Current shift ── */
const currentShift = {
  name:     "وردية الصبح",
  start:    "٨:٠٠ ص",
  orders:   5,
  earnings: 250,
};

const currentTxs: Tx[] = [
  { id: 1, kind: "commission",  label: "حصة أوردر #١٠٢٥ — كنتاكي",    amount:  50,   time: "١١:٣٠ ص" },
  { id: 2, kind: "commission",  label: "حصة أوردر #١٠٢٤ — شاورمر",     amount:  45,   time: "١٠:٥٥ ص" },
  { id: 3, kind: "advance",     label: "سلفة من الإدارة",               amount: -500,  time: "١٠:٣٠ ص" },
  { id: 4, kind: "commission",  label: "حصة أوردر #١٠٢٣ — بيتزا هت",   amount:  60,   time: "١٠:١٠ ص" },
  { id: 5, kind: "settlement",  label: "تسوية من الإدارة",              amount:  200,  time: "٩:٤٥ ص"  },
  { id: 6, kind: "penalty",     label: "غرامة أوردر ملغي #١٠٢٠",        amount:  -55,  time: "٩:٢٥ ص"  },
  { id: 7, kind: "commission",  label: "حصة أوردر #١٠٢١ — صب واي",      amount:  40,   time: "٨:٤٠ ص"  },
  { id: 8, kind: "commission",  label: "حصة أوردر #١٠٢٢ — ماكدونالدز", amount:  55,   time: "٨:١٥ ص"  },
  { id: 9, kind: "order",       label: "توصيل أوردر #١٠٢٥ — كنتاكي",   amount:  142,  time: "١١:٣٠ ص" },
  { id:10, kind: "order",       label: "توصيل أوردر #١٠٢٤ — شاورمر",    amount:  97,   time: "١٠:٥٥ ص" },
];

/* ── Past shifts ── */
const pastShifts: Shift[] = [
  {
    id: 1, name: "وردية المساء", date: "١٢ أبريل ٢٠٢٦", orders: 8, total: 1240,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ٨ أوردرات",          amount:  380, time:"١١:٠٠ م" },
      { id:2, kind:"order",       label:"إجمالي توصيل ٨ أوردرات",    amount: 1020, time:"١١:٠٠ م" },
      { id:3, kind:"penalty",     label:"غرامة أوردر ملغي #١٠١٢",    amount:  -55, time:"٧:٣٠ م"  },
      { id:4, kind:"settlement",  label:"تسوية من الإدارة",           amount:  -50, time:"٦:٠٠ م"  },
      { id:5, kind:"advance",     label:"سلفة ٥٠٠ ج.م",               amount: -500, time:"٤:٠٠ م"  },
    ],
  },
  {
    id: 2, name: "وردية الصبح", date: "١٢ أبريل ٢٠٢٦", orders: 6, total: 890,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ٦ أوردرات",          amount:  270, time:"٢:٠٠ م"  },
      { id:2, kind:"order",       label:"إجمالي توصيل ٦ أوردرات",    amount:  750, time:"٢:٠٠ م"  },
      { id:3, kind:"settlement",  label:"تسوية من الإدارة",           amount:  200, time:"١١:٠٠ ص" },
      { id:4, kind:"penalty",     label:"غرامة أوردر ملغي #١٠٠٦",    amount: -330, time:"٩:٠٠ ص"  },
    ],
  },
  {
    id: 3, name: "وردية المساء", date: "١١ أبريل ٢٠٢٦", orders: 10, total: 1560,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ١٠ أوردرات",         amount:  460, time:"١١:٠٠ م" },
      { id:2, kind:"order",       label:"إجمالي توصيل ١٠ أوردرات",   amount: 1250, time:"١١:٠٠ م" },
      { id:3, kind:"advance",     label:"سلفة ٥٠٠ ج.م",               amount: -500, time:"٥:٠٠ م"  },
      { id:4, kind:"settlement",  label:"تسوية من الإدارة",           amount:  350, time:"٣:٠٠ م"  },
    ],
  },
  {
    id: 4, name: "وردية الصبح", date: "١١ أبريل ٢٠٢٦", orders: 5, total: 730,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ٥ أوردرات",          amount:  230, time:"٢:٠٠ م"  },
      { id:2, kind:"order",       label:"إجمالي توصيل ٥ أوردرات",    amount:  600, time:"٢:٠٠ م"  },
      { id:3, kind:"penalty",     label:"غرامة أوردر ملغي #٩٩٩",     amount:  -55, time:"١٠:٠٠ ص" },
      { id:4, kind:"settlement",  label:"تسوية من الإدارة",           amount:  -45, time:"٩:٠٠ ص"  },
    ],
  },
  {
    id: 5, name: "وردية المساء", date: "١٠ أبريل ٢٠٢٦", orders: 9, total: 1380,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ٩ أوردرات",          amount:  380, time:"١١:٠٠ م" },
      { id:2, kind:"order",       label:"إجمالي توصيل ٩ أوردرات",    amount: 1100, time:"١١:٠٠ م" },
      { id:3, kind:"advance",     label:"سلفة ٣٠٠ ج.م",               amount: -300, time:"٦:٠٠ م"  },
      { id:4, kind:"settlement",  label:"تسوية من الإدارة",           amount:  200, time:"٤:٠٠ م"  },
    ],
  },
  {
    id: 6, name: "وردية الصبح", date: "١٠ أبريل ٢٠٢٦", orders: 4, total: 580,
    txs: [
      { id:1, kind:"commission",  label:"حصص من ٤ أوردرات",          amount:  180, time:"٢:٠٠ م"  },
      { id:2, kind:"order",       label:"إجمالي توصيل ٤ أوردرات",    amount:  480, time:"٢:٠٠ م"  },
      { id:3, kind:"penalty",     label:"غرامة أوردر ملغي #٩٨٥",     amount:  -80, time:"١١:٠٠ ص" },
    ],
  },
];

/* ── Chevron icon ── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── Tx row ── */
function TxRow({ tx, last }: { tx: Tx; last: boolean }) {
  const meta = TX_META[tx.kind];
  const isDebit = tx.amount < 0;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: `${meta.color}18` }}
      >
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: C.text }}>{tx.label}</p>
        <p className="text-xs" style={{ color: C.muted }}>{tx.time}</p>
      </div>
      <span
        className="text-sm font-black flex-shrink-0"
        style={{ color: isDebit ? C.red : C.green }}
      >
        {isDebit ? "" : "+"}{tx.amount} ج.م
      </span>
    </div>
  );
}

/* ── Collapsible past shift card ── */
function ShiftCard({ sh, index }: { sh: Shift; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderTop: index > 0 ? `1px solid ${C.border}` : "none" }}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
        onClick={() => setOpen((v) => !v)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${C.orange}18` }}
        >
          🕐
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold" style={{ color: C.text }}>{sh.name}</p>
          <p className="text-xs" style={{ color: C.muted }}>{sh.date}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span className="text-sm font-black" style={{ color: C.green }}>
            {sh.total.toLocaleString()} ج.م
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${C.teal}20`, color: C.teal }}
          >
            {sh.orders} طلبات
          </span>
        </div>
        <span style={{ color: C.muted, flexShrink: 0 }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Expanded transactions */}
      {open && (
        <div style={{ background: `${C.bg}88` }}>
          {sh.txs.map((tx, i) => (
            <TxRow key={tx.id} tx={tx} last={i === sh.txs.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: `${C.teal}30`, color: C.teal }}>
          م
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {(["current", "archive"] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{
              background: tab === t ? C.teal : "transparent",
              color:      tab === t ? "#fff" : C.muted,
            }}
          >
            {t === "current" ? "الوردية الحالية" : "الأرشيف المالي"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 pb-24">

        {/* ── TAB: الوردية الحالية ── */}
        {tab === "current" && (
          <>
            {/* Summary */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-4"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-black" style={{ color: C.text }}>{currentShift.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>بدأت الساعة {currentShift.start}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: `${C.green}20`, color: C.green }}>
                  نشطة الآن
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ background: C.bg }}>
                  <p className="text-xs" style={{ color: C.muted }}>إجمالي الطلبات</p>
                  <p className="text-2xl font-black" style={{ color: C.teal }}>{currentShift.orders}</p>
                </div>
                <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ background: C.bg }}>
                  <p className="text-xs" style={{ color: C.muted }}>إجمالي المكسب</p>
                  <p className="text-2xl font-black" style={{ color: C.green }}>{currentShift.earnings} ج.م</p>
                </div>
              </div>
            </div>

            {/* Current transactions */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: C.muted }}>
                تفاصيل الوردية
              </p>
              {currentTxs.map((tx, i) => (
                <TxRow key={tx.id} tx={tx} last={i === currentTxs.length - 1} />
              ))}
            </div>
          </>
        )}

        {/* ── TAB: الأرشيف المالي ── */}
        {tab === "archive" && (
          <>
            {/* Grand total */}
            <div className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
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

            {/* Collapsible shifts */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {pastShifts.map((sh, i) => (
                <ShiftCard key={sh.id} sh={sh} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
