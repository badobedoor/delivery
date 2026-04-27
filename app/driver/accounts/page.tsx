"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

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
  yellow: "#EAB308",
  blue:   "#3B82F6",
};

/* ── Types ── */
type TodayOrder = {
  id:             string;
  num:            string;
  restaurant:     string;
  total:          number;
  status:         "accepted" | "on_the_way" | "delivered";
  restaurantPaid: boolean | null;
  restaurantDebt: number;
  paymentMethod:  string | null;
  cashAmount:     number;
  vodafoneAmount: number;
};

type ArchiveOrder = {
  id:             string;
  num:            string;
  restaurant:     string;
  total:          number;
  restaurantPaid: boolean | null;
  restaurantDebt: number;
  cashAmount:     number;
  vodafoneAmount: number;
  isoDate:        string;
};

type AdvReq = {
  id:        number;
  amount:    number;
  note:      string;
  status:    "pending" | "approved" | "rejected";
  createdAt: string;
};

/* ── Helpers ── */
function fmtAmt(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function fmtDateAr(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoDateStr(iso: string) { return iso.slice(0, 10); }

/* ── Chevron ── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   AdvanceModal
───────────────────────────────────────────── */
function AdvanceModal({
  onConfirm, onClose, submitting,
}: {
  onConfirm:  (amount: number, note: string) => void;
  onClose:    () => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  function handleConfirm() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setError("أدخل مبلغاً أكبر من صفر"); return; }
    onConfirm(n, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>طلب سلفة</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>المبلغ المطلوب</label>
            <div className="relative">
              <input type="number" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.orange}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>ملاحظة (اختياري)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="سبب طلب السلفة..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ReadOnlyOrderCard — no action buttons
───────────────────────────────────────────── */
function ReadOnlyOrderCard({ order }: { order: TodayOrder }) {
  const statusLabel =
    order.status === "accepted"   ? "مع السائق"  :
    order.status === "on_the_way" ? "في الطريق" : "تم التسليم";
  const statusColor =
    order.status === "accepted"   ? C.yellow :
    order.status === "on_the_way" ? C.blue   : C.green;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black" style={{ color: C.teal }}>{order.num}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{order.restaurant}</span>
          </div>
          <span className="text-lg font-black" style={{ color: C.text }}>{fmtAmt(order.total)}</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full font-bold"
          style={{ background: `${statusColor}20`, color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Payment + restaurant indicators */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        {order.restaurantPaid !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: order.restaurantPaid ? `${C.green}15` : `${C.red}15` }}>
            <span className="text-xs">{order.restaurantPaid ? "✓" : "⚠"}</span>
            <span className="text-xs font-semibold"
              style={{ color: order.restaurantPaid ? C.green : C.red }}>
              {order.restaurantPaid ? "دفع مطعم" : `دين مطعم: ${fmtAmt(order.restaurantDebt)}`}
            </span>
          </div>
        )}
        {order.status === "delivered" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: order.paymentMethod ? `${C.green}12` : `${C.orange}12` }}>
            {order.paymentMethod ? (
              <>
                <span className="text-xs font-semibold" style={{ color: C.green }}>✓ تم التحصيل</span>
                {order.cashAmount > 0 && (
                  <span className="text-xs mr-2" style={{ color: C.muted }}>نقدي: {fmtAmt(order.cashAmount)}</span>
                )}
                {order.vodafoneAmount > 0 && (
                  <span className="text-xs" style={{ color: C.muted }}>فودافون: {fmtAmt(order.vodafoneAmount)}</span>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold" style={{ color: C.orange }}>لم يُسجّل طريقة الدفع بعد</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ShiftSummary — driver gives ALL money to office
───────────────────────────────────────────── */
function ShiftSummary({ orders }: { orders: TodayOrder[] }) {
  const collected = orders.filter((o) => o.status === "delivered" && o.paymentMethod !== null);
  if (collected.length === 0) return null;

  const cashTotal     = collected.reduce((s, o) => s + o.cashAmount, 0);
  const vodafoneTotal = collected.reduce((s, o) => s + o.vodafoneAmount, 0);
  const paidToRest    = collected.filter((o) => o.restaurantPaid === true).reduce((s, o) => s + o.total, 0);
  const restDebt      = collected.filter((o) => o.restaurantPaid === false).reduce((s, o) => s + o.restaurantDebt, 0);
  /* Driver hands over everything minus what they already paid to restaurants */
  const toHandOver    = cashTotal + vodafoneTotal - paidToRest;

  const rows = [
    { icon: "💰", label: "نقدي معاك",              value: cashTotal,    color: C.green  },
    { icon: "📱", label: "فودافون كاش",            value: vodafoneTotal, color: C.blue   },
    { icon: "🏪", label: "دفعت للمطاعم",           value: paidToRest,   color: C.orange },
    ...(restDebt > 0 ? [{ icon: "⚠️", label: "ديون مطاعم", value: restDebt, color: C.red }] : []),
    { icon: "🏢", label: "تسلّمه للمكتب",         value: toHandOver,   color: toHandOver >= 0 ? C.teal : C.red },
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-black" style={{ color: C.text }}>ملخص الوردية</h3>
      </div>
      {rows.map((row, i) => (
        <div key={row.label}
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <span className="text-sm" style={{ color: C.muted }}>{row.icon} {row.label}</span>
          <span className="text-sm font-black" style={{ color: row.color }}>{fmtAmt(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ArchiveDayCard
───────────────────────────────────────────── */
function ArchiveDayCard({
  dateLabel, orders, index,
}: {
  dateLabel: string;
  orders:    ArchiveOrder[];
  index:     number;
}) {
  const [open, setOpen] = useState(false);

  const cashTotal     = orders.reduce((s, o) => s + o.cashAmount, 0);
  const vodafoneTotal = orders.reduce((s, o) => s + o.vodafoneAmount, 0);
  const paidToRest    = orders.filter((o) => o.restaurantPaid === true).reduce((s, o) => s + o.total, 0);
  const restDebt      = orders.filter((o) => !o.restaurantPaid && o.restaurantDebt > 0).reduce((s, o) => s + o.restaurantDebt, 0);
  const totalCollected = cashTotal + vodafoneTotal;

  return (
    <div style={{ borderTop: index > 0 ? `1px solid ${C.border}` : "none" }}>
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
        onClick={() => setOpen((v) => !v)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${C.teal}18` }}>📅</div>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold" style={{ color: C.text }}>{dateLabel}</p>
          <p className="text-xs" style={{ color: C.muted }}>{orders.length} أوردر</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-black" style={{ color: C.teal }}>{fmtAmt(totalCollected)}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${C.teal}20`, color: C.teal }}>
            إجمالي محصّل
          </span>
        </div>
        <span style={{ color: C.muted, flexShrink: 0 }}><ChevronIcon open={open} /></span>
      </button>

      {open && (
        <div style={{ background: `${C.bg}88` }}>
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: `${C.teal}18` }}>📦</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: C.text }}>{o.num} — {o.restaurant}</p>
                <p className="text-xs" style={{ color: o.restaurantPaid ? C.green : C.red }}>
                  {o.restaurantPaid ? "✓ دفع مطعم" : "⚠ دين مطعم"}
                </p>
              </div>
              <p className="text-sm font-bold flex-shrink-0" style={{ color: C.text }}>
                {fmtAmt(o.cashAmount + o.vodafoneAmount)}
              </p>
            </div>
          ))}

          <div className="px-4 py-3 flex flex-col gap-1.5"
            style={{ borderTop: `1px solid ${C.border}`, background: `${C.card}aa` }}>
            {[
              { label: "إجمالي محصّل", value: totalCollected,  color: C.text   },
              { label: "دفعت للمطاعم", value: paidToRest,      color: C.orange },
              ...(restDebt > 0 ? [{ label: "ديون مطاعم", value: restDebt, color: C.red }] : []),
            ].map((r) => (
              <div key={r.label} className="flex justify-between">
                <span className="text-xs" style={{ color: C.muted }}>{r.label}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{fmtAmt(r.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function DriverAccountsPage() {
  const [tab,           setTab]           = useState<"current" | "archive">("current");
  const [loading,       setLoading]       = useState(true);
  const [driverId,      setDriverId]      = useState<string | null>(null);
  const [driverInitial, setDriverInitial] = useState("م");
  const [shiftId,       setShiftId]       = useState<string | null>(null);

  const [todayOrders,   setTodayOrders]   = useState<TodayOrder[]>([]);
  const [pendingAdv,    setPendingAdv]    = useState<AdvReq | null>(null);
  const [archiveOrders, setArchiveOrders] = useState<ArchiveOrder[]>([]);
  const [archiveLoaded, setArchiveLoaded] = useState(false);

  const [showAdv,             setShowAdv]             = useState(false);
  const [advSubmit,           setAdvSubmit]           = useState(false);
  const [advSuccess,          setAdvSuccess]          = useState(false);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementSent,      setSettlementSent]      = useState(false);
  const [pageError,           setPageError]           = useState("");

  /* ── Load today's data ── */
  const loadData = useCallback(async (did: string) => {
    const [
      { data: ordersData, error: ordersErr },
      { data: advData },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, status, total, user_order_number, restaurant_paid, restaurant_debt, " +
          "payment_method, cash_amount, vodafone_amount, restaurants!restaurant_id(name)",
        )
        .eq("delivery_id", did)
        .in("status", ["accepted", "on_the_way", "delivered"])
        .gte("created_at", todayStartISO())
        .order("created_at", { ascending: true }),
      supabase
        .from("advance_requests")
        .select("id, amount, note, status, created_at")
        .eq("delivery_id", did)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (ordersErr) { setPageError("خطأ في تحميل الأوردرات"); return; }

    setTodayOrders(
      (ordersData ?? []).map((o: any) => ({
        id:             o.id,
        num:            `#${o.user_order_number ?? "—"}`,
        restaurant:     (o.restaurants as any)?.name ?? "—",
        total:          o.total ?? 0,
        status:         o.status,
        restaurantPaid: o.restaurant_paid  ?? null,
        restaurantDebt: o.restaurant_debt  ?? 0,
        paymentMethod:  o.payment_method   ?? null,
        cashAmount:     o.cash_amount      ?? 0,
        vodafoneAmount: o.vodafone_amount  ?? 0,
      })),
    );

    if (advData && advData.status === "pending") {
      setPendingAdv({
        id:        advData.id,
        amount:    advData.amount,
        note:      advData.note ?? "",
        status:    advData.status,
        createdAt: advData.created_at,
      });
    } else {
      setPendingAdv(null);
    }
  }, []);

  /* ── Load archive (lazy) ── */
  const loadArchive = useCallback(async (did: string) => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, total, user_order_number, restaurant_paid, restaurant_debt, " +
        "cash_amount, vodafone_amount, created_at, restaurants!restaurant_id(name)",
      )
      .eq("delivery_id", did)
      .eq("status", "delivered")
      .not("payment_method", "is", null)
      .lt("created_at", todayStartISO())
      .order("created_at", { ascending: false })
      .limit(100);

    setArchiveOrders(
      (data ?? []).map((o: any) => ({
        id:             o.id,
        num:            `#${o.user_order_number ?? "—"}`,
        restaurant:     (o.restaurants as any)?.name ?? "—",
        total:          o.total ?? 0,
        restaurantPaid: o.restaurant_paid ?? null,
        restaurantDebt: o.restaurant_debt ?? 0,
        cashAmount:     o.cash_amount     ?? 0,
        vodafoneAmount: o.vodafone_amount ?? 0,
        isoDate:        o.created_at,
      })),
    );
    setArchiveLoaded(true);
  }, []);

  /* ── Init ── */
  useEffect(() => {
    async function init() {
      const stored = JSON.parse(localStorage.getItem("driver_user") || "{}");
      const did    = stored.id as string | undefined;
      if (!did) { setLoading(false); return; }

      setDriverId(did);
      setDriverInitial((stored.name ?? "م")[0] ?? "م");

      /* Get active shift */
      const { data: shiftData } = await supabase
        .from("delivery_shifts")
        .select("shift_id")
        .eq("delivery_id", did)
        .eq("is_active", true)
        .maybeSingle();
      if (shiftData) setShiftId(shiftData.shift_id);

      /* Check if already submitted settlement request this shift */
      if (shiftData?.shift_id) {
        const { data: existing } = await supabase
          .from("shift_settlement_requests")
          .select("id")
          .eq("delivery_id", did)
          .eq("shift_id", shiftData.shift_id)
          .maybeSingle();
        if (existing) setSettlementSent(true);
      }

      await loadData(did);
      setLoading(false);
    }
    init();
  }, [loadData]);

  /* ── Archive lazy load ── */
  useEffect(() => {
    if (tab === "archive" && !archiveLoaded && driverId) {
      loadArchive(driverId);
    }
  }, [tab, archiveLoaded, driverId, loadArchive]);

  /* ── Advance request ── */
  async function handleAdvanceRequest(amount: number, note: string) {
    if (!driverId) return;
    setAdvSubmit(true);
    try {
      await supabase.from("advance_requests").insert({
        delivery_id: driverId,
        amount,
        note:   note || null,
        status: "pending",
      });
      await loadData(driverId);
      setShowAdv(false);
      setAdvSuccess(true);
      setTimeout(() => setAdvSuccess(false), 5000);
    } catch { setPageError("خطأ في إرسال الطلب، حاول مرة أخرى"); }
    finally   { setAdvSubmit(false); }
  }

  /* ── Shift settlement request ── */
  async function handleSettlement() {
    if (!driverId || !shiftId) return;

    /* Prevent double submission */
    const { data: existing } = await supabase
      .from("shift_settlement_requests")
      .select("id")
      .eq("delivery_id", driverId)
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (existing) { setSettlementSent(true); return; }

    /* Validate all delivered orders have payment recorded */
    const unrecorded = todayOrders.filter(
      (o) => o.status === "delivered" && o.paymentMethod === null,
    );
    if (unrecorded.length > 0) {
      setPageError(`${unrecorded.length} أوردر لم يُسجّل فيه طريقة الدفع — افتح صفحة الطلبات لإكمال التحصيل`);
      return;
    }

    setSettlementSubmitting(true);
    try {
      await supabase.from("shift_settlement_requests").insert({
        delivery_id: driverId,
        shift_id:    shiftId,
        status:      "pending",
      });
      setSettlementSent(true);
    } catch { setPageError("خطأ في إرسال طلب التقفيل، حاول مرة أخرى"); }
    finally   { setSettlementSubmitting(false); }
  }

  /* ── Archive grouping ── */
  const archiveDays = useMemo(() => {
    const map = new Map<string, ArchiveOrder[]>();
    for (const o of archiveOrders) {
      const key = isoDateStr(o.isoDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([iso, orders]) => ({
        isoDate:   iso,
        dateLabel: fmtDateAr(iso + "T00:00:00"),
        orders,
      }));
  }, [archiveOrders]);

  const archiveTotals = useMemo(() => ({
    totalOrders:     archiveOrders.length,
    totalCollected:  archiveOrders.reduce((s, o) => s + o.cashAmount + o.vodafoneAmount, 0),
  }), [archiveOrders]);

  /* Derived */
  const deliveredOrders = todayOrders.filter((o) => o.status === "delivered");
  const activeOrders    = todayOrders.filter((o) => o.status !== "delivered");

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal}44`, borderTopColor: C.teal }} />
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!driverId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: C.bg, direction: "rtl", fontFamily: "var(--font-cairo), Arial, sans-serif" }}>
        <span className="text-5xl">🔒</span>
        <p className="text-base font-bold" style={{ color: C.text }}>يجب تسجيل الدخول أولاً</p>
        <button onClick={() => (window.location.href = "/driver/login")}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: C.teal, color: "#fff" }}>
          تسجيل الدخول
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}>
        <p className="text-lg font-black" style={{ color: C.text }}>حساباتي</p>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: `${C.teal}30`, color: C.teal }}>
          {driverInitial}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {(["current", "archive"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{ background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
            {t === "current" ? "الوردية الحالية" : "الأرشيف المالي"}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {pageError && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl flex items-center justify-between"
          style={{ background: `${C.red}18`, border: `1px solid ${C.red}33` }}>
          <span className="text-sm font-semibold" style={{ color: C.red }}>⚠ {pageError}</span>
          <button onClick={() => setPageError("")} style={{ color: C.red }}>✕</button>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4 p-4 pb-28">

        {/* ── TAB: الوردية الحالية ── */}
        {tab === "current" && (
          <>
            {/* Stats */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between">
                <p className="text-base font-black" style={{ color: C.text }}>وردية اليوم</p>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: `${C.green}20`, color: C.green }}>نشطة الآن</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "إجمالي",    value: todayOrders.length,    color: C.teal   },
                  { label: "جارية",     value: activeOrders.length,   color: C.yellow },
                  { label: "محصّلة",   value: deliveredOrders.filter((o) => o.paymentMethod !== null).length, color: C.green },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-2.5 flex flex-col gap-0.5" style={{ background: C.bg }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Active orders — read-only */}
            {activeOrders.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: C.muted }}>الأوردرات الجارية</p>
                {activeOrders.map((o) => <ReadOnlyOrderCard key={o.id} order={o} />)}
              </div>
            )}

            {/* Delivered orders — read-only */}
            {deliveredOrders.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: C.muted }}>تم التسليم</p>
                {deliveredOrders.map((o) => <ReadOnlyOrderCard key={o.id} order={o} />)}
              </div>
            )}

            {/* Empty state */}
            {todayOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <span style={{ fontSize: 48 }}>📭</span>
                <p className="text-sm font-semibold" style={{ color: C.muted }}>لا توجد أوردرات اليوم</p>
              </div>
            )}

            {/* Shift summary */}
            <ShiftSummary orders={todayOrders} />

            {/* Settlement sent confirmation */}
            {settlementSent && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${C.green}18`, border: `1px solid ${C.green}44` }}>
                <span className="text-lg">✅</span>
                <p className="text-sm font-semibold" style={{ color: C.green }}>
                  تم إرسال طلب تقفيل الوردية، في انتظار مراجعة الإدارة
                </p>
              </div>
            )}

            {/* Advance success */}
            {advSuccess && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${C.green}18`, border: `1px solid ${C.green}44` }}>
                <span className="text-lg">✅</span>
                <p className="text-sm font-semibold" style={{ color: C.green }}>
                  تم إرسال طلب السلفة، في انتظار موافقة الإدارة
                </p>
              </div>
            )}

            {/* Pending advance */}
            {pendingAdv && !advSuccess && (
              <div className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: C.card, border: `1px solid ${C.orange}44` }}>
                <span className="text-2xl">💵</span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: C.orange }}>
                    طلب سلفة معلق: {fmtAmt(pendingAdv.amount)}
                  </p>
                  {pendingAdv.note && (
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{pendingAdv.note}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: C.muted }}>⏳ في انتظار موافقة الإدارة</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: الأرشيف المالي ── */}
        {tab === "archive" && (
          <>
            {!archiveLoaded ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${C.teal}44`, borderTopColor: C.teal }} />
              </div>
            ) : archiveDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <span style={{ fontSize: 48 }}>📭</span>
                <p className="text-sm font-semibold" style={{ color: C.muted }}>لا يوجد سجل مالي بعد</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-xs" style={{ color: C.muted }}>إجمالي الأوردرات</p>
                    <p className="text-2xl font-black" style={{ color: C.teal }}>{archiveTotals.totalOrders}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs" style={{ color: C.muted }}>إجمالي محصّل</p>
                    <p className="text-2xl font-black" style={{ color: C.green }}>
                      {fmtAmt(archiveTotals.totalCollected)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  {archiveDays.map((day, i) => (
                    <ArchiveDayCard
                      key={day.isoDate}
                      dateLabel={day.dateLabel}
                      orders={day.orders}
                      index={i}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-16 left-0 right-0 flex justify-center gap-3 px-4 pointer-events-none z-20">
        {/* تقفيل الوردية */}
        {tab === "current" && shiftId && (
          settlementSent ? (
            <div className="pointer-events-auto px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44` }}>
              ✓ تم إرسال طلب التقفيل
            </div>
          ) : (
            <button
              onClick={handleSettlement}
              disabled={settlementSubmitting}
              className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
              style={{ background: C.teal, color: "#fff" }}>
              {settlementSubmitting ? "جارٍ الإرسال..." : "🔒 تقفيل الوردية"}
            </button>
          )
        )}

        {/* طلب سلفة */}
        {!pendingAdv ? (
          <button
            onClick={() => setShowAdv(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            💵 طلب سلفة
          </button>
        ) : (
          <div className="pointer-events-auto px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}44` }}>
            ⏳ سلفة معلقة: {fmtAmt(pendingAdv.amount)}
          </div>
        )}
      </div>

      {/* Advance modal */}
      {showAdv && (
        <AdvanceModal
          onConfirm={handleAdvanceRequest}
          onClose={() => setShowAdv(false)}
          submitting={advSubmit}
        />
      )}
    </div>
  );
}
