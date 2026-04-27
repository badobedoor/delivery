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
type PayMethod = "cash" | "vodafone" | "mixed";

type TodayOrder = {
  id:             string;
  num:            string;
  restaurant:     string;
  total:          number;
  status:         "accepted" | "on_the_way" | "delivered";
  restaurantPaid: boolean | null;
  restaurantDebt: number;
  paymentMethod:  PayMethod | null;
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

function isoDateStr(iso: string) {
  return iso.slice(0, 10);
}

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
   CollectionModal
───────────────────────────────────────────── */
function CollectionModal({
  order, onConfirm, onClose, submitting,
}: {
  order:      TodayOrder;
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
      cashAmt = parseFloat(cash)    || 0;
      vodAmt  = parseFloat(vodafone) || 0;
      if (cashAmt < 0 || vodAmt < 0) { setError("أدخل مبالغ صحيحة"); return; }
      if (Math.abs(cashAmt + vodAmt - order.total) > 0.01) {
        setError(`المجموع (${fmtAmt(cashAmt + vodAmt)}) يجب أن يساوي ${fmtAmt(order.total)}`);
        return;
      }
    }
    onConfirm(method, cashAmt, vodAmt);
  }

  const mixed = method === "mixed";

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
          {/* Amount */}
          <div className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: C.bg }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.muted }}>{order.restaurant}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{order.num}</p>
            </div>
            <p className="text-2xl font-black" style={{ color: C.teal }}>{fmtAmt(order.total)}</p>
          </div>

          {/* Payment method */}
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

          {/* Mixed inputs */}
          {mixed && (
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
   OrderCard
───────────────────────────────────────────── */
function OrderCard({
  order, onRestaurantPaid, onPickup, onDeliver, onCollect, submittingId,
}: {
  order:            TodayOrder;
  onRestaurantPaid: (id: string, paid: boolean) => void;
  onPickup:         (id: string) => void;
  onDeliver:        (order: TodayOrder) => void;
  onCollect:        (order: TodayOrder) => void;
  submittingId:     string | null;
}) {
  const busy = submittingId === order.id;

  const statusLabel =
    order.status === "accepted"   ? "مع السائق"    :
    order.status === "on_the_way" ? "في الطريق"   : "تم التسليم";
  const statusColor =
    order.status === "accepted"   ? C.yellow :
    order.status === "on_the_way" ? C.blue   : C.green;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>

      {/* Header */}
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

      {/* Restaurant payment indicator */}
      {order.restaurantPaid !== null && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: order.restaurantPaid ? `${C.green}15` : `${C.red}15` }}>
          <span className="text-sm">{order.restaurantPaid ? "✓" : "⚠"}</span>
          <span className="text-xs font-semibold"
            style={{ color: order.restaurantPaid ? C.green : C.red }}>
            {order.restaurantPaid
              ? "دفعت للمطعم"
              : `دين مطعم: ${fmtAmt(order.restaurantDebt)}`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 flex flex-col gap-2">

        {/* Step 1 — restaurant payment decision */}
        {order.status === "accepted" && order.restaurantPaid === null && (
          <div className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-bold text-center" style={{ color: C.muted }}>هل دفعت للمطعم؟</p>
            <div className="flex gap-2">
              <button onClick={() => onRestaurantPaid(order.id, true)} disabled={busy}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: `${C.green}22`, color: C.green }}>
                {busy ? "..." : "أيوه، دفعت"}
              </button>
              <button onClick={() => onRestaurantPaid(order.id, false)} disabled={busy}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: `${C.red}22`, color: C.red }}>
                {busy ? "..." : "لا، مش دفعت"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — pickup */}
        {order.status === "accepted" && order.restaurantPaid !== null && (
          <button onClick={() => onPickup(order.id)} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}44` }}>
            {busy ? "جارٍ المعالجة..." : "✓ تم الاستلام من المطعم"}
          </button>
        )}

        {/* Step 3 — deliver */}
        {order.status === "on_the_way" && (
          <button onClick={() => onDeliver(order)} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: C.teal, color: "#fff" }}>
            {busy ? "جارٍ المعالجة..." : "✓ تم التسليم للعميل"}
          </button>
        )}

        {/* Step 4a — collect pending */}
        {order.status === "delivered" && order.paymentMethod === null && (
          <button onClick={() => onCollect(order)} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: C.orange, color: "#fff" }}>
            {busy ? "..." : "💰 تحصيل المبلغ"}
          </button>
        )}

        {/* Step 4b — collected summary */}
        {order.status === "delivered" && order.paymentMethod !== null && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: `${C.green}12`, border: `1px solid ${C.green}33` }}>
            <span className="text-xs font-semibold" style={{ color: C.green }}>✓ تم التحصيل</span>
            <div className="flex gap-3">
              {order.cashAmount > 0 && (
                <span className="text-xs" style={{ color: C.muted }}>نقدي: {fmtAmt(order.cashAmount)}</span>
              )}
              {order.vodafoneAmount > 0 && (
                <span className="text-xs" style={{ color: C.muted }}>فودافون: {fmtAmt(order.vodafoneAmount)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ShiftSummary
───────────────────────────────────────────── */
function ShiftSummary({ orders, driverPct }: { orders: TodayOrder[]; driverPct: number }) {
  const collected = orders.filter((o) => o.status === "delivered" && o.paymentMethod !== null);
  if (collected.length === 0) return null;

  const cashTotal     = collected.reduce((s, o) => s + o.cashAmount, 0);
  const vodafoneTotal = collected.reduce((s, o) => s + o.vodafoneAmount, 0);
  const paidToRest    = collected.filter((o) => o.restaurantPaid === true).reduce((s, o) => s + o.total, 0);
  const restDebt      = collected.filter((o) => o.restaurantPaid === false).reduce((s, o) => s + o.restaurantDebt, 0);
  const commission    = collected.reduce((s, o) => s + Math.round(o.total * driverPct / 100), 0);
  const toHandOver    = cashTotal + vodafoneTotal - paidToRest - commission;

  const rows = [
    { icon: "💰", label: "فلوس نقدي معاك",       value: cashTotal,     color: C.green  },
    { icon: "📱", label: "فلوس فودافون كاش",     value: vodafoneTotal, color: C.blue   },
    { icon: "🏪", label: "دفعت للمطاعم",          value: paidToRest,    color: C.orange },
    ...(restDebt > 0 ? [{ icon: "⚠️", label: "ديون على المطاعم", value: restDebt, color: C.red }] : []),
    { icon: "💼", label: "عمولتك",                value: commission,    color: C.green  },
    { icon: "🏢", label: "المفروض تسلّم للمكتب", value: toHandOver,    color: toHandOver >= 0 ? C.teal : C.red },
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
  dateLabel, orders, driverPct, index,
}: {
  dateLabel: string;
  orders:    ArchiveOrder[];
  driverPct: number;
  index:     number;
}) {
  const [open, setOpen] = useState(false);

  const cashTotal     = orders.reduce((s, o) => s + o.cashAmount, 0);
  const vodafoneTotal = orders.reduce((s, o) => s + o.vodafoneAmount, 0);
  const paidToRest    = orders.filter((o) => o.restaurantPaid === true).reduce((s, o) => s + o.total, 0);
  const restDebt      = orders.filter((o) => o.restaurantPaid === false).reduce((s, o) => s + o.restaurantDebt, 0);
  const commission    = orders.reduce((s, o) => s + Math.round(o.total * driverPct / 100), 0);
  const netToOffice   = cashTotal + vodafoneTotal - paidToRest - commission;

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
          <span className="text-sm font-black" style={{ color: C.green }}>+{fmtAmt(commission)}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${C.teal}20`, color: C.teal }}>
            {fmtAmt(cashTotal + vodafoneTotal)} إجمالي
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
              <div className="text-left flex-shrink-0">
                <p className="text-sm font-black" style={{ color: C.green }}>
                  +{fmtAmt(Math.round(o.total * driverPct / 100))}
                </p>
                <p className="text-xs" style={{ color: C.muted }}>{fmtAmt(o.total)}</p>
              </div>
            </div>
          ))}

          {/* Day summary */}
          <div className="px-4 py-3 flex flex-col gap-1.5"
            style={{ borderTop: `1px solid ${C.border}`, background: `${C.card}99` }}>
            {[
              { label: "إجمالي محصّل",  value: cashTotal + vodafoneTotal, color: C.text   },
              { label: "دفعت للمطاعم",  value: paidToRest,                color: C.orange },
              ...(restDebt > 0 ? [{ label: "ديون مطاعم", value: restDebt, color: C.red }] : []),
              { label: "عمولتك",         value: commission,                color: C.green  },
            ].map((r) => (
              <div key={r.label} className="flex justify-between">
                <span className="text-xs" style={{ color: C.muted }}>{r.label}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{fmtAmt(r.value)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5" style={{ borderTop: `1px solid ${C.border}` }}>
              <span className="text-xs font-bold" style={{ color: C.text }}>صافي للمكتب</span>
              <span className="text-xs font-black"
                style={{ color: netToOffice >= 0 ? C.teal : C.red }}>{fmtAmt(netToOffice)}</span>
            </div>
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
  const [driverPct,     setDriverPct]     = useState(10);

  const [todayOrders,   setTodayOrders]   = useState<TodayOrder[]>([]);
  const [pendingAdv,    setPendingAdv]    = useState<AdvReq | null>(null);
  const [archiveOrders, setArchiveOrders] = useState<ArchiveOrder[]>([]);
  const [archiveLoaded, setArchiveLoaded] = useState(false);

  const [submittingId,  setSubmittingId]  = useState<string | null>(null);
  const [collectTarget, setCollectTarget] = useState<TodayOrder | null>(null);
  const [collecting,    setCollecting]    = useState(false);
  const [showAdv,       setShowAdv]       = useState(false);
  const [advSubmit,     setAdvSubmit]     = useState(false);
  const [advSuccess,    setAdvSuccess]    = useState(false);
  const [pageError,     setPageError]     = useState("");

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
        restaurantPaid: o.restaurant_paid ?? null,
        restaurantDebt: o.restaurant_debt ?? 0,
        paymentMethod:  o.payment_method  ?? null,
        cashAmount:     o.cash_amount     ?? 0,
        vodafoneAmount: o.vodafone_amount ?? 0,
      })),
    );

    if (advData && advData.status === "pending") {
      setPendingAdv({
        id: advData.id, amount: advData.amount,
        note: advData.note ?? "", status: advData.status, createdAt: advData.created_at,
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

      const { data: settings } = await supabase
        .from("settings")
        .select("driver_percentage")
        .single();

      setDriverPct(settings?.driver_percentage ?? 10);

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

  /* ── Action handlers ── */
  async function handleRestaurantPaid(id: string, paid: boolean) {
    if (!driverId) return;
    setSubmittingId(id);
    try {
      const order = todayOrders.find((o) => o.id === id);
      await supabase.from("orders")
        .update({ restaurant_paid: paid, restaurant_debt: paid ? 0 : (order?.total ?? 0) })
        .eq("id", id);
      await loadData(driverId);
    } catch { setPageError("حدث خطأ، حاول مرة أخرى"); }
    finally   { setSubmittingId(null); }
  }

  async function handlePickup(id: string) {
    if (!driverId) return;
    setSubmittingId(id);
    try {
      await supabase.from("orders").update({ status: "on_the_way" }).eq("id", id).eq("status", "accepted");
      await loadData(driverId);
    } catch { setPageError("حدث خطأ، حاول مرة أخرى"); }
    finally   { setSubmittingId(null); }
  }

  async function handleDeliver(order: TodayOrder) {
    if (!driverId) return;
    setSubmittingId(order.id);
    try {
      await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id).eq("status", "on_the_way");
      await loadData(driverId);
      setCollectTarget({ ...order, status: "delivered" });
    } catch { setPageError("حدث خطأ، حاول مرة أخرى"); }
    finally   { setSubmittingId(null); }
  }

  async function handleCollect(method: PayMethod, cash: number, vodafone: number) {
    if (!collectTarget || !driverId) return;
    setCollecting(true);
    try {
      /* 1. UPDATE order payment info */
      await supabase.from("orders")
        .update({ payment_method: method, cash_amount: cash, vodafone_amount: vodafone })
        .eq("id", collectTarget.id);

      /* 2. Compute commission */
      const commission = Math.round(collectTarget.total * driverPct / 100);

      /* 3. INSERT commission entry */
      await supabase.from("delivery_accounts").insert({
        delivery_id: driverId,
        type:        "commission",
        amount:      commission,
        reason:      `حصة أوردر ${collectTarget.num}`,
        order_id:    collectTarget.id,
        from_wallet: "office",
      });

      /* 4. UPDATE driver wallet balance */
      const { data: staff } = await supabase
        .from("delivery_staff")
        .select("wallet_balance")
        .eq("id", driverId)
        .single();

      if (staff) {
        await supabase.from("delivery_staff")
          .update({ wallet_balance: (staff.wallet_balance ?? 0) + commission })
          .eq("id", driverId);
      }

      await loadData(driverId);
      setCollectTarget(null);
    } catch { setPageError("خطأ في حفظ التحصيل، حاول مرة أخرى"); }
    finally   { setCollecting(false); }
  }

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
    totalCommission: archiveOrders.reduce(
      (s, o) => s + Math.round(o.total * driverPct / 100), 0),
  }), [archiveOrders, driverPct]);

  /* ── Derived order groups ── */
  const activeOrders      = todayOrders.filter((o) => o.status !== "delivered");
  const deliveredOrders   = todayOrders.filter((o) => o.status === "delivered");
  const needsCollection   = deliveredOrders.filter((o) => o.paymentMethod === null);
  const collectedOrders   = deliveredOrders.filter((o) => o.paymentMethod !== null);

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
                  { label: "إجمالي",  value: todayOrders.length,    color: C.teal   },
                  { label: "جارية",   value: activeOrders.length,   color: C.yellow },
                  { label: "محصّلة", value: collectedOrders.length, color: C.green  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-2.5 flex flex-col gap-0.5" style={{ background: C.bg }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs collection alert */}
            {needsCollection.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: `${C.orange}18`, border: `1px solid ${C.orange}44` }}>
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-semibold" style={{ color: C.orange }}>
                  {needsCollection.length} أوردر بانتظار تحصيل المبلغ
                </p>
              </div>
            )}

            {/* Active orders */}
            {activeOrders.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: C.muted }}>الأوردرات الجارية</p>
                {activeOrders.map((o) => (
                  <OrderCard key={o.id} order={o}
                    onRestaurantPaid={handleRestaurantPaid}
                    onPickup={handlePickup}
                    onDeliver={handleDeliver}
                    onCollect={setCollectTarget}
                    submittingId={submittingId} />
                ))}
              </div>
            )}

            {/* Needs collection */}
            {needsCollection.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: C.orange }}>بانتظار التحصيل</p>
                {needsCollection.map((o) => (
                  <OrderCard key={o.id} order={o}
                    onRestaurantPaid={handleRestaurantPaid}
                    onPickup={handlePickup}
                    onDeliver={handleDeliver}
                    onCollect={setCollectTarget}
                    submittingId={submittingId} />
                ))}
              </div>
            )}

            {/* Collected */}
            {collectedOrders.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: C.muted }}>تم التحصيل</p>
                {collectedOrders.map((o) => (
                  <OrderCard key={o.id} order={o}
                    onRestaurantPaid={handleRestaurantPaid}
                    onPickup={handlePickup}
                    onDeliver={handleDeliver}
                    onCollect={setCollectTarget}
                    submittingId={submittingId} />
                ))}
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
            <ShiftSummary orders={todayOrders} driverPct={driverPct} />

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

            {/* Pending advance card */}
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
                {/* Grand totals */}
                <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-xs" style={{ color: C.muted }}>إجمالي الأوردرات</p>
                    <p className="text-2xl font-black" style={{ color: C.teal }}>
                      {archiveTotals.totalOrders}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs" style={{ color: C.muted }}>إجمالي عمولتك</p>
                    <p className="text-2xl font-black" style={{ color: C.green }}>
                      {fmtAmt(archiveTotals.totalCommission)}
                    </p>
                  </div>
                </div>

                {/* Days list */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  {archiveDays.map((day, i) => (
                    <ArchiveDayCard
                      key={day.isoDate}
                      dateLabel={day.dateLabel}
                      orders={day.orders}
                      driverPct={driverPct}
                      index={i}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Fixed advance button / pending badge */}
      <div className="fixed bottom-16 left-0 right-0 flex justify-center px-4 pointer-events-none z-20">
        {pendingAdv ? (
          <div className="pointer-events-auto px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}55` }}>
            ⏳ سلفة معلقة: {fmtAmt(pendingAdv.amount)}
          </div>
        ) : (
          <button onClick={() => setShowAdv(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            💵 طلب سلفة
          </button>
        )}
      </div>

      {/* Collection modal */}
      {collectTarget && (
        <CollectionModal
          order={collectTarget}
          onConfirm={handleCollect}
          onClose={() => setCollectTarget(null)}
          submitting={collecting}
        />
      )}

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
