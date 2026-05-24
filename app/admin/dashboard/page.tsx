"use client";

import { useState, useId, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ── Colors (unchanged) ── */
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

/* ── Types ── */
interface RankItem  { name: string; orders: number; sub?: string; }
interface ChartPoint { label: string; value: number; }

/* ── Date helpers ── */
function localDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Grouping helpers ── */
type RevenueRow = { created_at: string; total: number };

function groupByDay(rows: RevenueRow[]): ChartPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    map.set(day, (map.get(day) || 0) + (r.total || 0));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      label: new Date(date).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" }),
      value,
    }));
}

function groupForAllTime(rows: RevenueRow[]): ChartPoint[] {
  if (!rows.length) return [];
  const days = new Set(rows.map(r => r.created_at.slice(0, 10))).size;
  if (days <= 31) return groupByDay(rows);
  if (days <= 180) {
    const map = new Map<string, number>();
    for (const r of rows) {
      const d    = new Date(r.created_at);
      const diff = (d.getDay() + 6) % 7;
      const mon  = new Date(d);
      mon.setDate(d.getDate() - diff);
      const key = mon.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + (r.total || 0));
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        label: new Date(date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
        value,
      }));
  }
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.created_at.slice(0, 7);
    map.set(key, (map.get(key) || 0) + (r.total || 0));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, value]) => ({
      label: new Date(`${ym}-01`).toLocaleDateString("ar-EG", { year: "2-digit", month: "short" }),
      value,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupTopRestaurants(rows: any[]): RankItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    if (!r.restaurant_id) continue;
    const name = (r.restaurants as { name: string } | null)?.name || "غير معروف";
    const cur  = map.get(r.restaurant_id);
    if (cur) cur.count++;
    else map.set(r.restaurant_id, { name, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map(x => ({ name: x.name, orders: x.count }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupTopAreas(rows: any[]): RankItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    const addr = r.addresses as { area_id: string | null; areas: { name: string } | null } | null;
    if (!addr?.area_id) continue;
    const name = addr.areas?.name || "غير معروف";
    const cur  = map.get(addr.area_id);
    if (cur) cur.count++;
    else map.set(addr.area_id, { name, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map(x => ({ name: x.name, orders: x.count }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupTopCustomers(rows: any[]): RankItem[] {
  const map = new Map<string, { name: string; phone: string; count: number }>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const u   = r.users as { name: string | null; phone: string | null } | null;
    const cur = map.get(r.user_id);
    if (cur) cur.count++;
    else map.set(r.user_id, { name: u?.name || "غير معروف", phone: u?.phone || "", count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map(x => ({ name: x.name, orders: x.count, sub: x.phone }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupTopDrivers(rows: any[]): RankItem[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    if (!r.delivery_id) continue;
    const name = (r.delivery_staff as { name: string | null } | null)?.name || "غير معروف";
    const cur  = map.get(r.delivery_id);
    if (cur) cur.count++;
    else map.set(r.delivery_id, { name, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map(x => ({ name: x.name, orders: x.count }));
}

/* ── Skeleton ── */
function Skel({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: C.border, opacity: 0.55,
      animation: "skelPulse 1.4s ease-in-out infinite",
    }} />
  );
}

/* ── SectionCard (unchanged) ── */
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

/* ── RankRow (unchanged) ── */
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

/* ── AreaChart (unchanged) ── */
function AreaChart({ data, color = C.teal, valueFormatter }: {
  data: ChartPoint[];
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const uid     = useId().replace(/:/g, "");
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (!line) return;

    const len = line.getTotalLength();

    line.style.transition       = "none";
    line.style.strokeDasharray  = `${len}`;
    line.style.strokeDashoffset = `${len}`;

    if (area) { area.style.transition = "none"; area.style.opacity = "0"; }

    line.getBoundingClientRect();

    requestAnimationFrame(() => {
      line.style.transition       = "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)";
      line.style.strokeDashoffset = "0";
      if (area) {
        area.style.transition = "opacity 0.5s ease 0.7s";
        area.style.opacity    = "1";
      }
    });
  }, [data]);

  if (data.length === 0) return (
    <div className="flex items-center justify-center" style={{ height: 150 }}>
      <p className="text-sm" style={{ color: C.muted }}>لا توجد بيانات</p>
    </div>
  );

  const VW = 600, VH = 200;
  const PL = 52, PR = 12, PT = 18, PB = 32;
  const CW = VW - PL - PR;
  const CH = VH - PT - PB;

  const values    = data.map((d) => d.value);
  const rawMin    = Math.min(...values);
  const rawMax    = Math.max(...values);
  const padding   = (rawMax - rawMin) * 0.25 || rawMax * 0.15 || 1;
  const chartMin  = Math.max(0, rawMin - padding);
  const chartMax  = rawMax + padding * 0.4;
  const chartRange = chartMax - chartMin;
  const fmt       = valueFormatter ?? ((v: number) => `${(v / 1000).toFixed(1)}k`);
  const n         = data.length;

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

        <path ref={areaRef} d={areaPath()} fill={`url(#g-${uid})`} style={{ opacity: 0 }} />
        <path ref={lineRef} d={linePath()} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => {
          const x   = gx(i), y = gy(d.value);
          const isH = hovered === i;
          const prev = i > 0     ? (x + gx(i - 1)) / 2 : PL;
          const next = i < n - 1 ? (x + gx(i + 1)) / 2 : VW - PR;

          return (
            <g key={d.label}>
              <rect x={prev} y={PT} width={next - prev} height={CH + 2}
                fill="transparent" style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)} />
              {isH && (
                <circle cx={x} cy={y} r={10}
                  fill={color} fillOpacity="0.15"
                  style={{ pointerEvents: "none" }} />
              )}
              <circle cx={x} cy={y} r={isH ? 5.5 : 3}
                fill={isH ? color : C.card}
                stroke={color} strokeWidth={isH ? 2.5 : 2}
                filter={isH ? `url(#glow-${uid})` : undefined}
                style={{ transition: "r 0.15s ease, fill 0.15s ease, stroke-width 0.15s", pointerEvents: "none" }} />
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
  /* Filter state */
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  /* Loading */
  const [loading, setLoading] = useState(true);

  /* Data state */
  const [ordersCount,    setOrdersCount]    = useState(0);
  const [inProgressCount,setInProgressCount]= useState(0);
  const [revenue,        setRevenue]        = useState(0);
  const [newUsersCount,  setNewUsersCount]  = useState(0);
  const [weeklyChart,    setWeeklyChart]    = useState<ChartPoint[]>([]);
  const [allTimeChart,   setAllTimeChart]   = useState<ChartPoint[]>([]);
  const [topRests,       setTopRests]       = useState<RankItem[]>([]);
  const [topAreas,       setTopAreas]       = useState<RankItem[]>([]);
  const [topCustomers,   setTopCustomers]   = useState<RankItem[]>([]);
  const [topDrivers,     setTopDrivers]     = useState<RankItem[]>([]);

  /* Fetch all data using Promise.all */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const today    = localDateStr();
        const sevenAgo = localDateStr(-6);
        const now      = new Date().toISOString();

        const statsFrom = appliedFrom ? `${appliedFrom}T00:00:00` : `${today}T00:00:00`;
        const statsTo   = appliedTo   ? `${appliedTo}T23:59:59`   : `${today}T23:59:59`;

        const chartFrom    = appliedFrom ? `${appliedFrom}T00:00:00` : `${sevenAgo}T00:00:00`;
        const chartTo      = appliedTo   ? `${appliedTo}T23:59:59`   : now;

        const allTimeFrom  = appliedFrom ? `${appliedFrom}T00:00:00` : "2024-01-01T00:00:00";
        const allTimeTo    = appliedTo   ? `${appliedTo}T23:59:59`   : now;

        const [
          ordersRes, inProgressRes, revenueRes, newUsersRes,
          chartRes,  allTimeRes,
          restsRes,  areasRes, custRes, drvRes,
        ] = await Promise.all([
          supabase.from("orders").select("*", { count: "exact", head: true })
            .gte("created_at", statsFrom).lte("created_at", statsTo),

          supabase.from("orders").select("*", { count: "exact", head: true })
            .in("status", ["confirmed", "in_progress", "picked_up"])
            .gte("created_at", statsFrom).lte("created_at", statsTo),

          supabase.from("orders").select("total")
            .eq("status", "delivered")
            .gte("created_at", statsFrom).lte("created_at", statsTo),

          supabase.from("users").select("*", { count: "exact", head: true })
            .gte("created_at", statsFrom).lte("created_at", statsTo),

          supabase.from("orders").select("created_at, total")
            .eq("status", "delivered")
            .gte("created_at", chartFrom).lte("created_at", chartTo)
            .order("created_at", { ascending: true }),

          supabase.from("orders").select("created_at, total")
            .eq("status", "delivered")
            .gte("created_at", allTimeFrom).lte("created_at", allTimeTo)
            .order("created_at", { ascending: true }),

          supabase.from("orders").select("restaurant_id, restaurants!restaurant_id(name)")
            .eq("status", "delivered")
            .gte("created_at", chartFrom).lte("created_at", chartTo),

          supabase.from("orders").select("addresses!address_id(area_id, areas(name))")
            .gte("created_at", chartFrom).lte("created_at", chartTo),

          supabase.from("orders").select("user_id, users(name, phone)")
            .eq("status", "delivered")
            .gte("created_at", chartFrom).lte("created_at", chartTo),

          supabase.from("orders").select("delivery_id, delivery_staff(name)")
            .eq("status", "delivered")
            .gte("created_at", chartFrom).lte("created_at", chartTo),
        ]);

        if (cancelled) return;

        setOrdersCount(ordersRes.count ?? 0);
        setInProgressCount(inProgressRes.count ?? 0);
        setRevenue((revenueRes.data ?? []).reduce((s, r) => s + (r.total || 0), 0));
        setNewUsersCount(newUsersRes.count ?? 0);
        setWeeklyChart(groupByDay((chartRes.data ?? []) as RevenueRow[]));
        setAllTimeChart(groupForAllTime((allTimeRes.data ?? []) as RevenueRow[]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTopRests(groupTopRestaurants((restsRes.data ?? []) as any[]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTopAreas(groupTopAreas((areasRes.data ?? []) as any[]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTopCustomers(groupTopCustomers((custRes.data ?? []) as any[]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTopDrivers(groupTopDrivers((drvRes.data ?? []) as any[]));
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [appliedFrom, appliedTo]);

  /* Stats cards config (values injected after load) */
  const stats = [
    { emoji: "📦", label: "طلبات الفترة",   value: ordersCount.toLocaleString("ar-EG"),                              color: C.teal   },
    { emoji: "💰", label: "إيرادات الفترة", value: `${revenue.toLocaleString("ar-EG")} ج.م`,                         color: C.green  },
    { emoji: "⏳", label: "قيد التنفيذ",    value: inProgressCount.toLocaleString("ar-EG"),                           color: C.yellow },
    { emoji: "👥", label: "عملاء جدد",      value: newUsersCount.toLocaleString("ar-EG"),                             color: C.blue   },
  ];

  return (
    <div className="flex flex-col gap-5">

      <style>{`
        @keyframes skelPulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 0.25; }
        }
        @keyframes chartFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .chart-card { animation: chartFadeIn 0.5s ease both; }
        .chart-card:nth-child(2) { animation-delay: 0.1s; }
      `}</style>

      {/* ── 1. Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between">
                <Skel w={32} h={32} />
                <Skel w={8} h={8} />
              </div>
              <Skel h={28} w="55%" />
              <Skel h={12} w="70%" />
            </div>
          ))
          : stats.map(s => (
            <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{s.emoji}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              </div>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: C.muted }}>{s.label}</p>
            </div>
          ))
        }
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
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>إلى</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
          </div>
          <button
            onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); }}
            className="px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            تطبيق
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setAppliedFrom(""); setAppliedTo(""); }}
              className="px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ background: `${C.red}22`, color: C.red }}>
              مسح
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Two Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="chart-card rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: C.text }}>📊 إيرادات آخر 7 أيام</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {loading
                ? "..."
                : `الإجمالي: ${weeklyChart.reduce((s, d) => s + d.value, 0).toLocaleString("ar-EG")} ج.م`
              }
            </p>
          </div>
          {loading
            ? <Skel h={150} />
            : <AreaChart data={weeklyChart} color={C.teal} />
          }
        </div>

        <div className="chart-card rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: C.text }}>📈 الإيرادات منذ بداية المشروع</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {loading
                ? "..."
                : `الإجمالي: ${allTimeChart.reduce((s, d) => s + d.value, 0).toLocaleString("ar-EG")} ج.م`
              }
            </p>
          </div>
          {loading
            ? <Skel h={150} />
            : <AreaChart data={allTimeChart} color={C.blue}
                valueFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          }
        </div>

      </div>

      {/* ── 4. Restaurants + Areas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="أكثر المطاعم طلباً" emoji="🍔">
          <div className="flex flex-col gap-3">
            {loading
              ? [0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Skel w={20} h={20} />
                    <Skel h={14} />
                  </div>
                  <Skel w={64} h={26} />
                </div>
              ))
              : topRests.length
                ? topRests.map((r, i) => <RankRow key={r.name + i} rank={i + 1} name={r.name} count={r.orders} />)
                : <p className="text-sm text-center" style={{ color: C.muted }}>لا توجد بيانات</p>
            }
          </div>
        </SectionCard>

        <SectionCard title="أكثر الأحياء طلباً" emoji="🗺️">
          <div className="flex flex-col gap-3">
            {loading
              ? [0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Skel w={20} h={20} />
                    <Skel h={14} />
                  </div>
                  <Skel w={64} h={26} />
                </div>
              ))
              : topAreas.length
                ? topAreas.map((a, i) => <RankRow key={a.name + i} rank={i + 1} name={a.name} count={a.orders} />)
                : <p className="text-sm text-center" style={{ color: C.muted }}>لا توجد بيانات</p>
            }
          </div>
        </SectionCard>

      </div>

      {/* ── 5. Customers + Drivers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="أفضل العملاء" emoji="👑">
          <div className="flex flex-col gap-3">
            {loading
              ? [0,1,2,3,4].map(i => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Skel w={20} h={20} />
                      <Skel h={14} />
                    </div>
                    <Skel w={64} h={26} />
                  </div>
                  <div className="flex items-center gap-3 pr-8">
                    <Skel h={11} w="50%" />
                  </div>
                </div>
              ))
              : topCustomers.length
                ? topCustomers.map((c, i) => <RankRow key={c.sub ?? c.name + i} rank={i + 1} name={c.name} count={c.orders} sub={c.sub} />)
                : <p className="text-sm text-center" style={{ color: C.muted }}>لا توجد بيانات</p>
            }
          </div>
        </SectionCard>

        <SectionCard title="أفضل السائقين" emoji="🛵">
          <div className="flex flex-col gap-3">
            {loading
              ? [0,1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Skel w={20} h={20} />
                    <Skel h={14} />
                  </div>
                  <Skel w={64} h={26} />
                </div>
              ))
              : topDrivers.length
                ? topDrivers.map((d, i) => <RankRow key={d.name + i} rank={i + 1} name={d.name} count={d.orders} />)
                : <p className="text-sm text-center" style={{ color: C.muted }}>لا توجد بيانات</p>
            }
          </div>
        </SectionCard>

      </div>

    </div>
  );
}
