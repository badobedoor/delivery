"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
  blue:   "#3B82F6",
  orange: "#F97316",
};

/* ── Types ── */
type PayMethod = "cash" | "vodafone" | "mixed";

type Meal   = { name: string; qty: number; price: number };
type Order  = {
  id:         string;
  num:        string;
  restaurant: string;
  area:       string;
  address:    string;
  total:      number;
  meals:      Meal[];
  note:       string;
};
type ActiveOrder = Order & {
  pickedUp:       boolean;
  phone:          string;
  restaurantPaid: boolean | null;
  restaurantDebt: number;
  paymentMethod:  string | null;
  cashAmount:     number;
  vodafoneAmount: number;
};

/* ── DB → local mapper ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DBOrder = Record<string, any>;

function toOrder(o: DBOrder): Order {
  return {
    id:         o.id,
    num:        `#${o.user_order_number ?? "—"}`,
    restaurant: o.restaurants?.name ?? "—",
    area:       o.addresses?.area_id ?? o.addresses?.areas?.name ?? "—",
    address:    o.addresses?.full_address ?? "—",
    total:      o.total ?? 0,
    meals:      (o.order_items ?? []).map((item: DBOrder) => ({
      name:  item.menu_items?.name  ?? "—",
      qty:   item.quantity  ?? 1,
      price: item.menu_items?.price ?? 0,
    })),
    note: o.notes ?? "",
  };
}

const ORDER_SELECT = `
  id, status, total, notes, user_order_number,
  restaurant_paid, restaurant_debt, payment_method, cash_amount, vodafone_amount,
  restaurants!restaurant_id (name),
  addresses!address_id (full_address, area_id),
  order_items (quantity, menu_items(name, price))
`;

function fmtAmt(n: number) { return `${n.toLocaleString("ar-EG")} ج.م`; }

/* ── Web Audio notification ── */
function playNotif() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type      = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* ignore if AudioContext unavailable */ }
}

/* ── Chevron icon ── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── Available order card ── */
function AvailableCard({ order, onAccept }: { order: Order; onAccept: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black" style={{ color: C.teal }}>{order.num}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{order.restaurant}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.teal}20`, color: C.teal }}>
              {order.meals.length} أصناف
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: C.muted }}>{order.area}</span>
            <span className="text-sm font-bold" style={{ color: C.text }}>{order.total} ج.م</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!open && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: C.teal, color: "#fff" }}
            >
              قبول
            </button>
          )}
          <span style={{ color: C.muted }}><ChevronIcon open={open} /></span>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: C.border }}>
          <div className="pt-3 flex flex-col gap-0.5">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>عنوان التوصيل</p>
            <p className="text-sm" style={{ color: C.text }}>{order.address}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>تفاصيل الوجبات</p>
            {order.meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: C.text }}>{m.qty}× {m.name}</span>
                <span className="text-sm" style={{ color: C.muted }}>{m.price} ج.م</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-1 mt-1" style={{ borderColor: C.border }}>
              <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
              <span className="text-sm font-black" style={{ color: C.teal }}>{order.total} ج.م</span>
            </div>
          </div>
          {order.note && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات العميل</p>
              <p className="text-sm" style={{ color: C.text }}>{order.note}</p>
            </div>
          )}
          <button
            onClick={onAccept}
            className="w-full py-3 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
            style={{ background: C.teal, color: "#fff" }}
          >
            قبول الطلب
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Copy icon ── */
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   PaymentModal — تحصيل المبلغ بعد التسليم
───────────────────────────────────────────── */
function PaymentModal({
  order, onConfirm, onClose, submitting,
}: {
  order:      ActiveOrder;
  onConfirm:  (method: PayMethod, cash: number, vodafone: number) => void;
  onClose:    () => void;
  submitting: boolean;
}) {
  const [method,   setMethod]   = useState<PayMethod>("cash");
  const [cash,     setCash]     = useState("");
  const [vodafone, setVodafone] = useState("");
  const [error,    setError]    = useState("");

  function handleConfirm() {
    let cashAmt = 0, vodAmt = 0;
    if (method === "cash") {
      cashAmt = order.total;
    } else if (method === "vodafone") {
      vodAmt = order.total;
    } else {
      cashAmt = parseFloat(cash)     || 0;
      vodAmt  = parseFloat(vodafone) || 0;
      if (cashAmt < 0 || vodAmt < 0) { setError("أدخل مبالغ صحيحة"); return; }
      if (Math.abs(cashAmt + vodAmt - order.total) > 0.01) {
        setError(`المجموع (${fmtAmt(cashAmt + vodAmt)}) يجب أن يساوي ${fmtAmt(order.total)}`);
        return;
      }
    }
    onConfirm(method, cashAmt, vodAmt);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>تحصيل المبلغ</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: C.bg }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.muted }}>{order.restaurant}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{order.num}</p>
            </div>
            <p className="text-2xl font-black" style={{ color: C.teal }}>{fmtAmt(order.total)}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>طريقة الدفع</label>
            {([
              { v: "cash",     label: "كل المبلغ نقدي" },
              { v: "vodafone", label: "كل المبلغ فودافون كاش" },
              { v: "mixed",    label: "جزء نقدي وجزء فودافون كاش" },
            ] as const).map(({ v, label }) => (
              <label key={v}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: method === v ? `${C.teal}15` : C.bg,
                  border:     `1px solid ${method === v ? C.teal : C.border}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: method === v ? C.teal : C.muted }}>
                  {method === v && <div className="w-2 h-2 rounded-full" style={{ background: C.teal }} />}
                </div>
                <input type="radio" name="paymethod" value={v} checked={method === v}
                  onChange={() => { setMethod(v); setError(""); }} className="hidden" />
                <span className="text-sm" style={{ color: C.text }}>{label}</span>
              </label>
            ))}
          </div>

          {method === "mixed" && (
            <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: C.bg }}>
              {[
                { label: "نقدي",    val: cash,     set: setCash },
                { label: "فودافون", val: vodafone, set: setVodafone },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-16 flex-shrink-0" style={{ color: C.muted }}>{label}</span>
                  <input type="number" value={val}
                    onChange={(e) => { set(e.target.value); setError(""); }}
                    placeholder="0"
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                  <span className="text-xs flex-shrink-0" style={{ color: C.muted }}>ج.م</span>
                </div>
              ))}
              <p className="text-[11px] text-center mt-1" style={{ color: C.muted }}>
                المجموع: {fmtAmt((parseFloat(cash) || 0) + (parseFloat(vodafone) || 0))}
                {" / المطلوب: "}{fmtAmt(order.total)}
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            {submitting ? "جارٍ المعالجة..." : "تأكيد التحصيل"}
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
   ActiveCard — with restaurant payment step
───────────────────────────────────────────── */
function ActiveCard({
  order,
  onDeliver,
  onPickup,
  onRestaurantPaid,
}: {
  order:            ActiveOrder;
  onDeliver:        (order: ActiveOrder) => void;
  onPickup:         (id: string) => Promise<void>;
  onRestaurantPaid: (id: string, paid: boolean) => void;
}) {
  const [open,          setOpen]          = useState(false);
  const [pickedUp,      setPickedUp]      = useState(order.pickedUp);
  const [restaurantPaid, setRestaurantPaid] = useState(order.restaurantPaid);
  const [restBusy,      setRestBusy]      = useState(false);
  const [copied,        setCopied]        = useState(false);

  async function handlePickup() {
    setPickedUp(true);
    await onPickup(order.id);
  }

  async function handleRestPaid(paid: boolean) {
    setRestBusy(true);
    setRestaurantPaid(paid);
    onRestaurantPaid(order.id, paid);
    setRestBusy(false);
  }

  function copyPhone() {
    navigator.clipboard.writeText(order.phone).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {/* ── Collapsed header ── */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black" style={{ color: C.teal }}>{order.num}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{order.restaurant}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: C.text }}>{order.total} ج.م</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: pickedUp ? `${C.green}20` : `${C.yellow}20`,
                color:      pickedUp ? C.green          : C.yellow,
              }}
            >
              {pickedUp ? "✓ تم الاستلام" : "لم يُستلم بعد"}
            </span>
          </div>
        </div>
        <span style={{ color: C.muted, flexShrink: 0 }}><ChevronIcon open={open} /></span>
      </button>

      {/* ── Expanded details ── */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: C.border }}>

          {/* Address */}
          <div className="pt-3 flex flex-col gap-0.5">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>عنوان التوصيل</p>
            <p className="text-sm" style={{ color: C.text }}>{order.address}</p>
          </div>

          {/* Meals */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>تفاصيل الوجبات</p>
            {order.meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: C.text }}>{m.qty}× {m.name}</span>
                <span className="text-sm" style={{ color: C.muted }}>{m.price} ج.م</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-1 mt-1" style={{ borderColor: C.border }}>
              <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
              <span className="text-sm font-black" style={{ color: C.teal }}>{order.total} ج.م</span>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات العميل</p>
              <p className="text-sm" style={{ color: C.text }}>{order.note}</p>
            </div>
          )}

          {/* Phone — visible only after pickup */}
          {pickedUp && order.phone && (
            <div
              className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
              style={{ background: `${C.teal}12`, border: `1px solid ${C.teal}30` }}
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold" style={{ color: C.teal }}>رقم هاتف العميل</p>
                <p className="text-sm font-bold tracking-wide" style={{ color: C.text }}>{order.phone}</p>
              </div>
              <button
                onClick={copyPhone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 flex-shrink-0"
                style={{ background: C.teal, color: "#fff" }}
              >
                <CopyIcon />
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2 mt-1">

            {/* Step 1 — Restaurant payment (only before pickup) */}
            {!pickedUp && restaurantPaid === null && (
              <div className="flex flex-col gap-2 p-3 rounded-xl"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold text-center" style={{ color: C.muted }}>هل دفعت للمطعم؟</p>
                <div className="flex gap-2">
                  <button onClick={() => handleRestPaid(true)} disabled={restBusy}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: `${C.green}22`, color: C.green }}>
                    أيوه، دفعت
                  </button>
                  <button onClick={() => handleRestPaid(false)} disabled={restBusy}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: `${C.red}22`, color: C.red }}>
                    لا، لم أدفع
                  </button>
                </div>
              </div>
            )}

            {/* Restaurant payment indicator (after decision) */}
            {!pickedUp && restaurantPaid !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: restaurantPaid ? `${C.green}15` : `${C.red}15` }}>
                <span className="text-sm">{restaurantPaid ? "✓" : "⚠"}</span>
                <span className="text-xs font-semibold"
                  style={{ color: restaurantPaid ? C.green : C.red }}>
                  {restaurantPaid ? "دفعت للمطعم" : `دين مطعم: ${fmtAmt(order.total)}`}
                </span>
              </div>
            )}

            {/* Step 2 — Pickup (only after restaurant payment decision) */}
            <button
              onClick={handlePickup}
              disabled={pickedUp || (!pickedUp && restaurantPaid === null)}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: pickedUp
                  ? `${C.green}20`
                  : restaurantPaid !== null
                    ? C.yellow
                    : `${C.yellow}30`,
                color: pickedUp
                  ? C.green
                  : restaurantPaid !== null
                    ? "#0F172A"
                    : `${C.yellow}60`,
                cursor: (pickedUp || restaurantPaid === null) ? "default" : "pointer",
              }}
            >
              {pickedUp ? "✓ تم الاستلام من المطعم" : "تم الاستلام من المطعم"}
            </button>

            {/* Step 3 — Deliver (only after pickup) */}
            <button
              onClick={() => onDeliver(order)}
              disabled={!pickedUp}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: !pickedUp ? `${C.green}15` : C.green,
                color:      !pickedUp ? `${C.green}50` : "#fff",
                cursor:     !pickedUp ? "default"       : "pointer",
              }}
            >
              تم التسليم للعميل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
type TabId = "available" | "active";

export default function DriverOrdersPage() {
  const [tab,           setTab]           = useState<TabId>("available");
  const [available,     setAvailable]     = useState<Order[]>([]);
  const [active,        setActive]        = useState<ActiveOrder[]>([]);
  const [driverId,      setDriverId]      = useState<string | null>(null);
  const [shiftId,       setShiftId]       = useState<string | null>(null);
  const [noShift,       setNoShift]       = useState(false);
  const [loading,       setLoading]       = useState(true);

  /* ── Payment collection state ── */
  const [collectTarget, setCollectTarget] = useState<ActiveOrder | null>(null);
  const [collecting,    setCollecting]    = useState(false);

  const loadData = useCallback(async (did: string, sid: string | null) => {
    /* Available orders — only when driver has an active shift */
    if (sid) {
      const { data: availableOrders } = await supabase
        .from("orders")
        .select(`
          id, total, notes, user_order_number,
          restaurants!restaurant_id (name),
          addresses!address_id (full_address, area_id),
          order_items (quantity, menu_items(name, price))
        `)
        .eq("status", "pending")
        .eq("shift_id", sid);
      setAvailable((availableOrders ?? []).map(toOrder));
    } else {
      setAvailable([]);
    }

    /* Active orders — ALWAYS by delivery_id, never filtered by shift */
    const { data: act } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["accepted", "on_the_way"])
      .eq("delivery_id", did);

    setActive((act ?? []).map((o) => ({
      ...toOrder(o),
      pickedUp:       (o as DBOrder).status === "on_the_way",
      phone:          "",
      restaurantPaid: (o as DBOrder).restaurant_paid  ?? null,
      restaurantDebt: (o as DBOrder).restaurant_debt  ?? 0,
      paymentMethod:  (o as DBOrder).payment_method   ?? null,
      cashAmount:     (o as DBOrder).cash_amount      ?? 0,
      vodafoneAmount: (o as DBOrder).vodafone_amount  ?? 0,
    })));
  }, []);

  useEffect(() => {
    async function init() {
      const driver = JSON.parse(localStorage.getItem("driver_user") || "{}");
      const did = driver.id;
      if (!did) { setLoading(false); return; }
      setDriverId(did);

      const { data: deliveryShift } = await supabase
        .from("delivery_shifts")
        .select("shift_id")
        .eq("delivery_id", did)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!deliveryShift) {
        setNoShift(true);
        await loadData(did, null);
        setLoading(false);
        return;
      }

      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id, num, start_time")
        .eq("id", deliveryShift.shift_id)
        .single();

      if (!activeShift) {
        setNoShift(true);
        await loadData(did, null);
        setLoading(false);
        return;
      }
      setShiftId(activeShift.id);

      await loadData(did, activeShift.id);
      setLoading(false);
    }
    init();
  }, [loadData]);

  /* ── Accept order ── */
  const accept = useCallback(async (order: Order) => {
    if (!driverId || !shiftId) return;
    playNotif();
    await supabase
      .from("orders")
      .update({ status: "accepted", delivery_id: driverId })
      .eq("id", order.id)
      .eq("status", "pending");
    await loadData(driverId, shiftId);
    setTab("active");
  }, [driverId, shiftId, loadData]);

  /* ── Restaurant payment decision ── */
  const handleRestaurantPaid = useCallback(async (orderId: string, paid: boolean) => {
    const order = active.find((o) => o.id === orderId);
    await supabase
      .from("orders")
      .update({
        restaurant_paid: paid,
        restaurant_debt: paid ? 0 : (order?.total ?? 0),
      })
      .eq("id", orderId)
      .eq("status", "accepted");

    /* Optimistic local update — no full reload needed */
    setActive((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, restaurantPaid: paid, restaurantDebt: paid ? 0 : o.total }
        : o,
    ));
  }, [active]);

  /* ── Pickup ── */
  const pickup = useCallback(async (id: string) => {
    await supabase
      .from("orders")
      .update({ status: "on_the_way" })
      .eq("id", id)
      .eq("status", "accepted");
  }, []);

  /* ── Deliver → open payment modal ── */
  const deliver = useCallback(async (order: ActiveOrder) => {
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", order.id)
      .eq("status", "on_the_way");

    /* Open modal before reload so the order data is still available */
    setCollectTarget(order);
    if (driverId && shiftId) await loadData(driverId, shiftId);
  }, [driverId, shiftId, loadData]);

  /* ── Payment collection — record method only, NO financial calculations ── */
  const handleCollect = useCallback(async (method: PayMethod, cash: number, vodafone: number) => {
    if (!collectTarget) return;
    setCollecting(true);
    try {
      await supabase.from("orders").update({
        payment_method:  method,
        cash_amount:     cash,
        vodafone_amount: vodafone,
      }).eq("id", collectTarget.id);
      setCollectTarget(null);
    } catch (err) {
      console.error("Collection error:", err);
    } finally {
      setCollecting(false);
    }
  }, [collectTarget]);

  const availCount = available.length;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
      </div>
    );
  }

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
        <p className="text-lg font-black" style={{ color: C.text }}>طلباتي</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: `${C.teal}30`, color: C.teal }}>
            م
          </div>
          <p className="text-sm font-semibold hidden sm:block" style={{ color: C.muted }}>محمود السائق</p>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        {(["available", "active"] as TabId[]).map((t) => {
          const label = t === "available" ? "الطلبات المتاحة" : "قيد التنفيذ";
          const count = t === "available" ? availCount : active.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: tab === t ? C.teal : "transparent",
                color:      tab === t ? "#fff" : C.muted,
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1"
                  style={{ background: tab === t ? "rgba(255,255,255,0.3)" : `${C.red}22`, color: tab === t ? "#fff" : C.red }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 p-4 flex flex-col gap-3 pb-24">
        {tab === "available" && (
          <>
            {noShift ? (
              <div
                className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}44` }}
              >
                <span className="text-4xl">⚠️</span>
                <p className="text-base font-black" style={{ color: C.yellow }}>
                  أنت غير مسجل في وردية حالياً
                </p>
                <p className="text-sm" style={{ color: C.muted }}>
                  يرجى التواصل مع الإدارة للانضمام إلى وردية
                </p>
              </div>
            ) : available.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <span className="text-4xl">📭</span>
                <p className="text-sm" style={{ color: C.muted }}>لا توجد طلبات متاحة حالياً</p>
              </div>
            ) : available.map((o) => (
              <AvailableCard key={o.id} order={o} onAccept={() => accept(o)} />
            ))}
          </>
        )}

        {tab === "active" && (
          <>
            {active.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <span className="text-4xl">🛵</span>
                <p className="text-sm" style={{ color: C.muted }}>لا توجد طلبات قيد التنفيذ</p>
              </div>
            ) : active.map((o) => (
              <ActiveCard
                key={o.id}
                order={o}
                onDeliver={deliver}
                onPickup={pickup}
                onRestaurantPaid={handleRestaurantPaid}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Payment modal ── */}
      {collectTarget && (
        <PaymentModal
          order={collectTarget}
          onConfirm={handleCollect}
          onClose={() => setCollectTarget(null)}
          submitting={collecting}
        />
      )}
    </div>
  );
}
