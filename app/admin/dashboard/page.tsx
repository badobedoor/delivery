"use client";

import { useState, useId, useRef, useEffect } from "react";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  yellow: "#EAB308",
  red:    "#EF4444",
  orange: "#F97316",
  blue:   "#3B82F6",
  purple: "#A855F7",
};

/* ── Mock data — replace with real DB queries later ── */

const stats = [
  { emoji: "📦", label: "طلبات اليوم",   value: "47",        color: C.teal   },
  { emoji: "💰", label: "إيرادات اليوم", value: "3,240 ج.م", color: C.green  },
  { emoji: "⏳", label: "قيد التنفيذ",   value: "8",         color: C.yellow },
  { emoji: "👥", label: "عملاء جدد",     value: "12",        color: C.blue   },
];

const weeklyData = [
  { label: "الأحد",    value: 1800 },
  { label: "الاثنين",  value: 2400 },
  { label: "الثلاثاء", value: 1600 },
  { label: "الأربعاء", value: 3100 },
  { label: "الخميس",   value: 2750 },
  { label: "الجمعة",   value: 3240 },
  { label: "السبت",    value: 2900 },
];

const allWeeksData = [
  { label: "أ١",  value: 8500  },
  { label: "أ٢",  value: 11200 },
  { label: "أ٣",  value: 9800  },
  { label: "أ٤",  value: 13400 },
  { label: "أ٥",  value: 12100 },
  { label: "أ٦",  value: 15600 },
  { label: "أ٧",  value: 14200 },
  { label: "أ٨",  value: 17800 },
  { label: "أ٩",  value: 16500 },
  { label: "أ١٠", value: 19200 },
  { label: "أ١١", value: 18100 },
  { label: "أ١٢", value: 21400 },
];

const topRestaurants = [
  { name: "بيت البرجر",    orders: 128 },
  { name: "ليالي بيتزا",   orders: 97  },
  { name: "شاورما الشام",  orders: 84  },
  { name: "كشري التحرير",  orders: 71  },
  { name: "سوشي تايم",    orders: 58  },
];

const topAreas = [
  { name: "المعادي",        orders: 142 },
  { name: "مصر الجديدة",   orders: 108 },
  { name: "الزمالك",       orders: 76  },
  { name: "التجمع الخامس", orders: 65  },
  { name: "مدينة نصر",     orders: 54  },
];

const topCustomers = [
  { name: "أحمد محمد",   phone: "01012345678", orders: 34 },
  { name: "سارة علي",    phone: "01098765432", orders: 28 },
  { name: "محمود خالد",  phone: "01112345678", orders: 22 },
  { name: "نور حسن",     phone: "01555123456", orders: 19 },
  { name: "عمر إبراهيم", phone: "01234567890", orders: 15 },
];

const topDrivers = [
  { name: "خالد سعيد",  orders: 89 },
  { name: "محمد أحمد",  orders: 74 },
  { name: "علي حسن",    orders: 62 },
  { name: "عمر رمضان",  orders: 55 },
  { name: "ياسر فؤاد",  orders: 48 },
];

/* ── Shared UI ── */

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <h2 className="text-sm font-black flex items-center gap-2" style={{ color: C.text }}>
        <span>{emoji}</span>{title}
      </h2>
      {children}
    </div>
  );
}

function RankRow({ rank, name, count, sub }: { rank: number; name: string; count: number; sub?: string }) {
  const rankColor = rank === 1 ? C.yellow : rank === 2 ? C.muted : rank === 3 ? C.orange : C.muted;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-black w-5 text-center flex-shrink-0"
          style={{ color: rankColor }}>
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{name}</p>
          {sub && <p className="text-xs font-semibold" style={{ color: C.teal }}>{sub}</p>}
        </div>
      </div>
      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: `${C.teal}20`, color: C.teal }}>
        {count} طلب
      </span>
    </div>
  );
}

function AreaChart({ data, color = C.teal, valueFormatter }: {
  data: { label: string; value: number }[];
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const uid     = useId().replace(/:/g, "");
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  /* ── Animate: draw line + fade area on mount / data change ── */
  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (!line) return;

    const len = line.getTotalLength();

    /* 1. Line: strokeDashoffset trick — draw from left */
    line.style.transition    = "none";
    line.style.strokeDasharray  = `${len}`;
    line.style.strokeDashoffset = `${len}`;

    /* 2. Area: start transparent */
    if (area) { area.style.transition = "none"; area.style.opacity = "0"; }

    /* Force reflow so CSS picks up starting state */
    line.getBoundingClientRect();

    /* Kick off transitions */
    requestAnimationFrame(() => {
      line.style.transition        = "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)";
      line.style.strokeDashoffset  = "0";

      if (area) {
        area.style.transition = "opacity 0.5s ease 0.7s";
        area.style.opacity    = "1";
      }
    });
  }, [data]);

  if (data.length === 0) return null;

  const VW = 600, VH = 200;
  const PL = 52, PR = 12, PT = 18, PB = 32;
  const CW = VW - PL - PR;
  const CH = VH - PT - PB;

  const values     = data.map((d) => d.value);
  const rawMin     = Math.min(...values);
  const rawMax     = Math.max(...values);
  const padding    = (rawMax - rawMin) * 0.25 || rawMax * 0.15 || 1;
  const chartMin   = Math.max(0, rawMin - padding);
  const chartMax   = rawMax + padding * 0.4;
  const chartRange = chartMax - chartMin;
  const fmt        = valueFormatter ?? ((v: number) => `${(v / 1000).toFixed(1)}k`);
  const n          = data.length;

  function gx(i: number) { return PL + (i / Math.max(n - 1, 1)) * CW; }
  function gy(v: number)  { return PT + CH - ((v - chartMin) / chartRange) * CH; }

  function linePath() {
    let d = `M ${gx(0)} ${gy(data[0].value)}`;
    for (let i = 1; i < n; i++) {
      const x0 = gx(i - 1), y0 = gy(data[i - 1].value);
      const x1 = gx(i),     y1 = gy(data[i].value);
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
    }
    return d;
  }

  function areaPath() {
    const baseY = PT + CH;
    return `${linePath()} L ${gx(n - 1)} ${baseY} L ${gx(0)} ${baseY} Z`;
  }

  const ticks = [0, 1, 2, 3, 4].map((i) => chartMin + (chartRange * i) / 4);

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + Y labels */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PL} y1={gy(v)} x2={VW - PR} y2={gy(v)}
              stroke={C.border} strokeWidth="1" strokeDasharray="4 3" />
            <text x={PL - 5} y={gy(v) + 4} textAnchor="end"
              fill={C.muted} fontSize="10" fontFamily="Cairo, Arial, sans-serif">
              {fmt(Math.round(v))}
            </text>
          </g>
        ))}

        {/* Area fill — fades in after line draws */}
        <path ref={areaRef} d={areaPath()} fill={`url(#g-${uid})`} style={{ opacity: 0 }} />

        {/* Line — draws itself via strokeDashoffset animation */}
        <path ref={lineRef} d={linePath()} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points + hover zones + labels */}
        {data.map((d, i) => {
          const x   = gx(i), y = gy(d.value);
          const isH = hovered === i;
          const prev = i > 0     ? (x + gx(i - 1)) / 2 : PL;
          const next = i < n - 1 ? (x + gx(i + 1)) / 2 : VW - PR;

          return (
            <g key={d.label}>
              {/* Hover zone */}
              <rect x={prev} y={PT} width={next - prev} height={CH + 2}
                fill="transparent" style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)} />

              {/* Glow ring (shows on hover) */}
              {isH && (
                <circle cx={x} cy={y} r={10}
                  fill={color} fillOpacity="0.15"
                  style={{ pointerEvents: "none" }} />
              )}

              {/* Dot */}
              <circle cx={x} cy={y} r={isH ? 5.5 : 3}
                fill={isH ? color : C.card}
                stroke={color} strokeWidth={isH ? 2.5 : 2}
                filter={isH ? `url(#glow-${uid})` : undefined}
                style={{
                  transition:    "r 0.15s ease, fill 0.15s ease, stroke-width 0.15s",
                  pointerEvents: "none",
                }} />

              {/* Tooltip */}
              {isH && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={x - 40} y={y - 36} width={80} height={24} rx={7}
                    fill={C.card} stroke={color} strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 2px 6px ${color}44)` }} />
                  <text x={x} y={y - 20} textAnchor="middle"
                    fill={color} fontSize="11" fontWeight="700"
                    fontFamily="Cairo, Arial, sans-serif">
                    {d.value.toLocaleString("ar-EG")} ج.م
                  </text>
                </g>
              )}

              {/* X label */}
              <text x={x} y={VH - 4} textAnchor="middle"
                fill={isH ? color : C.muted} fontSize="10"
                fontFamily="Cairo, Arial, sans-serif"
                style={{ transition: "fill 0.15s" }}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Page ── */

export default function AdminDashboardPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  return (
    <div className="flex flex-col gap-5">

      {/* ── 1. Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.emoji}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── 2. Date Filter ── */}
      <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ color: C.teal }}>📅</span>
          <p className="text-sm font-black" style={{ color: C.text }}>فلترة بالتاريخ</p>
        </div>
        <div className="flex flex-1 flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>من</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>إلى</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
          </div>
          <button
            className="px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            تطبيق
          </button>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }}
              className="px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ background: `${C.red}22`, color: C.red }}>
              مسح
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Two Charts ── */}
      <style>{`
        @keyframes chartFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .chart-card { animation: chartFadeIn 0.5s ease both; }
        .chart-card:nth-child(2) { animation-delay: 0.1s; }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 1: Last 7 days */}
        <div className="chart-card rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: C.text }}>📊 إيرادات آخر 7 أيام</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              الإجمالي: {weeklyData.reduce((s, d) => s + d.value, 0).toLocaleString("ar-EG")} ج.م
            </p>
          </div>
          <AreaChart data={weeklyData} color={C.teal} />
        </div>

        {/* Chart 2: Since project start */}
        <div className="chart-card rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: C.text }}>📈 الإيرادات منذ بداية المشروع</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              الإجمالي: {allWeeksData.reduce((s, d) => s + d.value, 0).toLocaleString("ar-EG")} ج.م
            </p>
          </div>
          <AreaChart data={allWeeksData} color={C.blue}
            valueFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        </div>

      </div>

      {/* ── 4. Restaurants + Areas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="أكثر المطاعم طلباً" emoji="🍔">
          <div className="flex flex-col gap-3">
            {topRestaurants.map((r, i) => (
              <RankRow key={r.name} rank={i + 1} name={r.name} count={r.orders} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="أكثر الأحياء طلباً" emoji="🗺️">
          <div className="flex flex-col gap-3">
            {topAreas.map((a, i) => (
              <RankRow key={a.name} rank={i + 1} name={a.name} count={a.orders} />
            ))}
          </div>
        </SectionCard>

      </div>

      {/* ── 5. Customers + Drivers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Best Customers */}
        <SectionCard title="أفضل العملاء" emoji="👑">
          <div className="flex flex-col gap-3">
            {topCustomers.map((c, i) => (
              <RankRow key={c.phone} rank={i + 1} name={c.name} count={c.orders} sub={c.phone} />
            ))}
          </div>
        </SectionCard>

        {/* Best Drivers */}
        <SectionCard title="أفضل السائقين" emoji="🛵">
          <div className="flex flex-col gap-3">
            {topDrivers.map((d, i) => (
              <RankRow key={d.name} rank={i + 1} name={d.name} count={d.orders} />
            ))}
          </div>
        </SectionCard>

      </div>

    </div>
  );
}
