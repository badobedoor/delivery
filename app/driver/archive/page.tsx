"use client";

import Link from "next/link";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
};

type ArchivedOrder = {
  id:         number;
  num:        string;
  restaurant: string;
  total:      number;
  date:       string;
  time:       string;
};

const seed: ArchivedOrder[] = [
  { id: 1, num: "#١٠٢٢", restaurant: "بيتزا هت",    total: 185, date: "١٣ أبريل ٢٠٢٦",  time: "٢:٤٥ م"  },
  { id: 2, num: "#١٠٢١", restaurant: "شاورمر",       total: 97,  date: "١٣ أبريل ٢٠٢٦",  time: "١:١٠ م"  },
  { id: 3, num: "#١٠٢٠", restaurant: "كنتاكي",       total: 142, date: "١٢ أبريل ٢٠٢٦",  time: "٩:٣٠ م"  },
  { id: 4, num: "#١٠١٩", restaurant: "ماكدونالدز",   total: 210, date: "١٢ أبريل ٢٠٢٦",  time: "٧:٥٥ م"  },
  { id: 5, num: "#١٠١٨", restaurant: "صب واي",        total: 78,  date: "١١ أبريل ٢٠٢٦",  time: "٣:٢٠ م"  },
  { id: 6, num: "#١٠١٧", restaurant: "هارديز",        total: 165, date: "١١ أبريل ٢٠٢٦",  time: "١:٠٠ م"  },
  { id: 7, num: "#١٠١٦", restaurant: "برجر كينج",     total: 130, date: "١٠ أبريل ٢٠٢٦",  time: "٨:٤٠ م"  },
  { id: 8, num: "#١٠١٥", restaurant: "بيتزا هت",      total: 220, date: "١٠ أبريل ٢٠٢٦",  time: "٦:١٥ م"  },
];

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function DriverArchivePage() {
  const totalEarnings = seed.reduce((s, o) => s + o.total, 0);

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
        {/* spacer to keep title centered */}
        <div className="w-8" />
      </header>

      {/* ── Summary card ── */}
      <div className="p-4">
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <div>
            <p className="text-xs" style={{ color: C.muted }}>إجمالي الطلبات المنجزة</p>
            <p className="text-2xl font-black" style={{ color: C.teal }}>{seed.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: C.muted }}>إجمالي المكاسب</p>
            <p className="text-2xl font-black" style={{ color: C.green }}>{totalEarnings} ج.م</p>
          </div>
        </div>
      </div>

      {/* ── Orders list ── */}
      <div className="flex flex-col gap-3 px-4 pb-24">
        {seed.map((o) => (
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
                <span className="text-sm font-black" style={{ color: C.teal }}>{o.num}</span>
                <span className="text-sm font-semibold truncate" style={{ color: C.text }}>{o.restaurant}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                {o.date} — {o.time}
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
    </div>
  );
}
