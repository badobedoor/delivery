"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

type Extra  = { name: string; price: number };
type Meal   = { name: string; qty: number; price: number; extras: Extra[]; notes?: string };
type Order  = {
  id:          string;
  num:         string;
  restaurant:  string;
  area:        string;
  address:     string;
  userId:         string;
  subtotal:       number;
  deliveryFee:    number;
  discountAmount: number;
  total:          number;
  meals:          Meal[];
  note:           string;
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
    id:          o.id,
    userId:      (o as DBOrder).user_id ?? "",
    num:         `#${o.user_order_number ?? "—"}`,
    restaurant:  o.restaurants?.name ?? "—",
    area:        o.addresses?.areas?.name ?? "—",
    address:     o.addresses?.full_address ?? "—",
    subtotal:       o.subtotal        ?? 0,
    deliveryFee:    o.delivery_fee    ?? 0,
    discountAmount: o.discount_amount ?? 0,
    total:          o.total           ?? 0,
    meals:       (o.order_items ?? []).map((item: DBOrder) => ({
      name:   item.menu_items?.name ?? "—",
      qty:    item.quantity         ?? 1,
      price:  item.price_at_order   ?? 0,
      extras: Array.isArray(item.extras) ? item.extras : [],
      notes:  item.notes ?? "",
    })),
    note: o.notes ?? "",
  };
}

const ORDER_SELECT = `
  id, user_id, status, picked_up, total, subtotal, delivery_fee, discount_amount, notes, user_order_number,
  restaurant_paid, restaurant_debt, payment_method, cash_amount, vodafone_amount,
  restaurants!restaurant_id (name),
  addresses!address_id (full_address, areas (name)),
  order_items (quantity, price_at_order, extras, notes, menu_items (name)),
  users!user_id (phone)
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
      {/* ── Collapsed header ── */}
      <div
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black" style={{ color: C.teal }}>{order.num}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{order.restaurant}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.teal}20`, color: C.teal }}>
              {order.meals.length} أصناف
            </span>
          </div>
          <span className="text-xs" style={{ color: C.muted }}>📍 {order.area}</span>
          <span className="text-base font-black" style={{ color: C.green }}>{order.total} ج.م</span>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <span>🚚 {order.deliveryFee}ج</span>
            <span style={{ color: C.border }}>|</span>
            <span>🍽️ {order.subtotal}ج</span>
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

      {/* ── Expanded details ── */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: C.border }}>

          {/* Location */}
          <div className="pt-3 flex flex-col gap-0.5">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>الموقع</p>
            <p className="text-xs font-bold" style={{ color: C.text }}>📍 {order.area}</p>
            <p className="text-sm" style={{ color: C.muted }}>🏠 {order.address}</p>
          </div>

          {/* Meals with extras */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>تفاصيل الوجبات</p>
            {order.meals.map((m, i) => {
              const extrasTotal = m.extras.reduce((s, e) => s + (e.price ?? 0), 0);
              const basePrice   = m.price - extrasTotal;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: C.text }}>- {m.name} ×{m.qty}</span>
                    <span className="text-xs" style={{ color: C.muted }}>السعر الأساسي: {basePrice}ج</span>
                  </div>
                  {m.extras.length > 0 && (
                    <div className="flex flex-col gap-0.5 pr-4">
                      {m.extras.map((e, j) => (
                        <span key={j} className="text-[11px]" style={{ color: C.muted }}>
                          + {e.name} <span style={{ color: C.yellow }}>(+{e.price}ج)</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {m.notes && (
                    <div className="pr-4 mt-0.5">
                      <span className="text-[11px]" style={{ color: C.yellow }}>📝 {m.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {order.note && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات العميل</p>
              <p className="text-sm" style={{ color: C.text }}>{order.note}</p>
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.bg }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🍽️ قيمة الطلب للمطعم</span>
              <span className="font-semibold" style={{ color: C.text }}>{order.subtotal} ج.م</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🚚 التوصيل</span>
              <span className="font-semibold" style={{ color: C.blue }}>{order.deliveryFee} ج.م</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: C.green }}>خصم الكوبون</span>
                <span className="font-bold" style={{ color: C.green }}>- {order.discountAmount} ج.م</span>
              </div>
            )}
            <div
              className="flex items-center justify-between pt-2"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
              <span className="text-lg font-black" style={{ color: C.green }}>{order.total} ج.م</span>
            </div>
          </div>

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
      style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>تحصيل المبلغ</h2>
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
              {(() => {
                const entered = (parseFloat(cash) || 0) + (parseFloat(vodafone) || 0);
                const diff    = entered - order.total;
                const statusColor = diff < 0 ? C.blue : diff === 0 ? C.green : C.red;
                const statusText  = diff < 0
                  ? `متبقي: ${fmtAmt(Math.abs(diff))}`
                  : diff === 0
                  ? "✓ مكتمل"
                  : `زيادة: ${fmtAmt(diff)}`;
                return (
                  <>
                    <p className="text-[11px] text-center mt-1" style={{ color: C.muted }}>
                      المجموع: {fmtAmt(entered)}
                      {" / المطلوب: "}{fmtAmt(order.total)}
                    </p>
                    <p className="text-[11px] text-center font-bold" style={{ color: statusColor }}>
                      {statusText}
                    </p>
                  </>
                );
              })()}
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
  const [open,      setOpen]      = useState(false);
  const [restBusy,  setRestBusy]  = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [delivered, setDelivered] = useState(false);

  async function handlePickup() {
    await onPickup(order.id);
  }

  async function handleRestPaid(paid: boolean) {
    setRestBusy(true);
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
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black" style={{ color: C.teal }}>{order.num}</span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{order.restaurant}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: order.pickedUp ? `${C.green}20` : `${C.yellow}20`,
                color:      order.pickedUp ? C.green          : C.yellow,
              }}
            >
              {order.pickedUp ? "✓ تم الاستلام" : "لم يُستلم بعد"}
            </span>
          </div>
          <span className="text-xs" style={{ color: C.muted }}>📍 {order.area}</span>
          <span className="text-base font-black" style={{ color: C.green }}>{order.total} ج.م</span>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <span>🚚 {order.deliveryFee}ج</span>
            <span style={{ color: C.border }}>|</span>
            <span>🍽️ {order.subtotal}ج</span>
          </div>
        </div>
        <span style={{ color: C.muted, flexShrink: 0 }}><ChevronIcon open={open} /></span>
      </button>

      {/* ── Expanded details ── */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: C.border }}>

          {/* Location */}
          <div className="pt-3 flex flex-col gap-0.5">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>الموقع</p>
            <p className="text-xs font-bold" style={{ color: C.text }}>📍 {order.area}</p>
            <p className="text-sm" style={{ color: C.muted }}>🏠 {order.address}</p>
          </div>

          {/* Meals with extras */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>تفاصيل الوجبات</p>
            {order.meals.map((m, i) => {
              const extrasTotal = m.extras.reduce((s, e) => s + (e.price ?? 0), 0);
              const basePrice   = m.price - extrasTotal;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: C.text }}>- {m.name} ×{m.qty}</span>
                    <span className="text-xs" style={{ color: C.muted }}>السعر الأساسي: {basePrice}ج</span>
                  </div>
                  {m.extras.length > 0 && (
                    <div className="flex flex-col gap-0.5 pr-4">
                      {m.extras.map((e, j) => (
                        <span key={j} className="text-[11px]" style={{ color: C.muted }}>
                          + {e.name} <span style={{ color: C.yellow }}>(+{e.price}ج)</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {m.notes && (
                    <div className="pr-4 mt-0.5">
                      <span className="text-[11px]" style={{ color: C.yellow }}>📝 {m.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Note */}
          {order.note && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات العميل</p>
              <p className="text-sm" style={{ color: C.text }}>{order.note}</p>
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.bg }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🍽️ قيمة الطلب للمطعم</span>
              <span className="font-semibold" style={{ color: C.text }}>{order.subtotal} ج.م</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🚚 التوصيل</span>
              <span className="font-semibold" style={{ color: C.blue }}>{order.deliveryFee} ج.م</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: C.green }}>خصم الكوبون</span>
                <span className="font-bold" style={{ color: C.green }}>- {order.discountAmount} ج.م</span>
              </div>
            )}
            <div
              className="flex items-center justify-between pt-2"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
              <span className="text-lg font-black" style={{ color: C.green }}>{order.total} ج.م</span>
            </div>
          </div>

          {/* ── Steps Flow ── */}
          <div className="flex flex-col gap-2 mt-1">

            {/* Step 1 — هل دفعت للمطعم؟ */}
            {order.restaurantPaid === null ? (
              <div className="flex flex-col gap-2 p-3 rounded-xl"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold text-center" style={{ color: C.muted }}>هل دفعت للمطعم؟</p>
                <div className="flex gap-2">
                  <button onClick={() => handleRestPaid(true)} disabled={restBusy}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: `${C.green}22`, color: C.green }}>
                    نعم، دفعت
                  </button>
                  <button onClick={() => handleRestPaid(false)} disabled={restBusy}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: `${C.red}22`, color: C.red }}>
                    لا، لم أدفع
                  </button>
                </div>
              </div>
            ) : null}

            {/* Step 2 — تم الاستلام (يظهر فقط بعد قرار الدفع) */}
            {order.restaurantPaid !== null && !order.pickedUp && (
              <button
                onClick={handlePickup}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.yellow, color: "#0F172A" }}
              >
                تم الاستلام من المطعم
              </button>
            )}

            {/* Step 3 — هاتف العميل + التسليم (يظهر فقط بعد الاستلام) */}
            {order.pickedUp && (
              <>
                {order.phone ? (
                  <div className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                    style={{ background: `${C.teal}12`, border: `1px solid ${C.teal}30` }}>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold" style={{ color: C.teal }}>رقم هاتف العميل</p>
                      <p className="text-sm font-bold tracking-wide" style={{ color: C.text }}>{order.phone}</p>
                    </div>
                    <button onClick={copyPhone}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 flex-shrink-0"
                      style={{ background: C.teal, color: "#fff" }}>
                      <CopyIcon />
                      {copied ? "✓ نُسخ" : "نسخ"}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl px-3 py-2 text-center text-sm font-bold"
                    style={{ background: `${C.yellow}15`, color: C.yellow }}>
                    ⚠ لا يوجد رقم للعميل
                  </div>
                )}
                {delivered ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl"
                    style={{ background: `${C.green}20` }}>
                    <span className="text-sm font-black" style={{ color: C.green }}>
                      ✔ تم التسليم للعميل
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDelivered(true); onDeliver(order); }}
                    className="w-full py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
                    style={{ background: C.green, color: "#fff" }}
                  >
                    تم التسليم للعميل
                  </button>
                )}
              </>
            )}

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
  const [shiftStopped,  setShiftStopped]  = useState(false); // admin stopped shift — blocks new orders only
  const [canStartShift, setCanStartShift] = useState(false); // assigned but driver hasn't started yet
  const [startingShift, setStartingShift] = useState(false);
  const [assignmentId,  setAssignmentId]  = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [ordersLocked,  setOrdersLocked]  = useState(false);
  const [driverName,    setDriverName]    = useState("");
  const { user: authUser, loading: authLoading } = useCurrentUser();

  /* ── Payment collection state ── */
  const [collectTarget, setCollectTarget] = useState<ActiveOrder | null>(null);
  const [collecting,    setCollecting]    = useState(false);
  const [usingCache,    setUsingCache]    = useState(false);

  const CACHE_KEY = "driver_orders_cache";

  const loadData = useCallback(async (did: string, sid: string | null) => {
    /* 1. Fetch active orders first */
    const { data: act, error: actError } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["accepted", "on_the_way"])
      .eq("delivery_id", did);

    let activeOrders: ActiveOrder[];

    if (actError || !act) {
      /* Network failure — try localStorage cache */
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        activeOrders = cached ? JSON.parse(cached) : [];
        setUsingCache(true);
      } catch {
        activeOrders = [];
      }
    } else {
      activeOrders = act.map((o) => ({
        ...toOrder(o),
        pickedUp:       (o as DBOrder).picked_up ?? false,
        phone:          (o as DBOrder).users?.phone ?? "",
        restaurantPaid: (o as DBOrder).restaurant_paid  ?? null,
        restaurantDebt: (o as DBOrder).restaurant_debt  ?? 0,
        paymentMethod:  (o as DBOrder).payment_method   ?? null,
        cashAmount:     (o as DBOrder).cash_amount      ?? 0,
        vodafoneAmount: (o as DBOrder).vodafone_amount  ?? 0,
      }));
      /* Successful fetch — persist to cache and clear stale-cache flag */
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(activeOrders)); } catch { /* ignore */ }
      setUsingCache(false);
    }
    setActive(activeOrders);

    /* 2. Sticky lock — triggers at 3 orders or pickup, releases only at 0 */
    const lockKey      = sid ? `driver_locked_${did}_${sid}` : null;
    const storedLocked = lockKey ? localStorage.getItem(lockKey) === "1" : false;
    const hasPickedUp  = activeOrders.some((o) => o.pickedUp);
    const isAtCapacity = activeOrders.length >= 3;

    let locked: boolean;
    if (activeOrders.length === 0) {
      locked = false;
      if (lockKey) localStorage.removeItem(lockKey);
    } else if (storedLocked || hasPickedUp || isAtCapacity) {
      locked = true;
      if (lockKey) localStorage.setItem(lockKey, "1");
    } else {
      locked = false;
    }
    setOrdersLocked(locked);

    /* 3. Fetch available orders only when unlocked and in a shift */
    if (sid && !locked) {
      const { data: availableOrders } = await supabase
        .from("orders")
        .select(`
          id, total, subtotal, delivery_fee, discount_amount, notes, user_order_number,
          restaurants!restaurant_id (name),
          addresses!address_id (full_address, areas (name)),
          order_items (quantity, price_at_order, extras, notes, menu_items (name))
        `)
        .eq("status", "pending")
        .eq("shift_id", sid);
      setAvailable((availableOrders ?? []).map(toOrder));
    } else {
      setAvailable([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    async function init() {
      const did = authUser?.id;
      console.log("[driver/orders] authUser:", authUser, "did:", did);
      if (!did) { setLoading(false); return; }
      setDriverId(did);
      setDriverName(authUser?.name ?? "");

      /* Get the driver's most recent delivery_shift — is_active=true means driver is working */
      const { data: dsRows, error: dsError } = await supabase
        .from("delivery_shifts")
        .select("id, shift_id, is_active")
        .eq("delivery_id", did)
        .eq("is_active", true)
        .order("id", { ascending: false })
        .limit(1);

      console.log("[driver/orders] did:", did, "delivery_shifts rows:", dsRows, "error:", dsError);

      const ds = dsRows?.[0] ?? null;

      if (!ds?.shift_id) {
        console.log("[driver/orders] no delivery_shift found for driver", did);
        setNoShift(true);
        await loadData(did, null);
        setLoading(false);
        return;
      }

      const sid = ds.shift_id as string;
      setShiftId(sid);

      if (!ds.is_active) {
        /* Driver assigned but hasn't started yet — show "بدء العمل" */
        setCanStartShift(true);
        setAssignmentId(ds.id);
        await loadData(did, null);
      } else {
        /* Driver active — load orders */
        await loadData(did, sid);
      }
      setLoading(false);
    }
    init();
  }, [authLoading, authUser, loadData]);

  /* ── Start shift (driver explicitly begins work) ── */
  const startShift = useCallback(async () => {
    if (!driverId || !shiftId) return;
    setStartingShift(true);
    try {
      const { error } = await supabase
        .from("delivery_shifts")
        .update({ is_active: true })
        .eq("delivery_id", driverId)
        .eq("shift_id", shiftId);
      if (error) throw error;

      setCanStartShift(false);
      setAssignmentId(null);
      await loadData(driverId, shiftId);
    } catch (err) {
      console.error("startShift:", err);
    } finally {
      setStartingShift(false);
    }
  }, [driverId, shiftId, loadData]);

  /* ── Accept order ── */
  const accept = useCallback(async (order: Order) => {
    if (!driverId || !shiftId || ordersLocked) return;
    playNotif();
    await supabase
      .from("orders")
      .update({ status: "accepted", delivery_id: driverId })
      .eq("id", order.id)
      .eq("status", "pending");
    await loadData(driverId, shiftId);
    setTab("active");
  }, [driverId, shiftId, ordersLocked, loadData]);

  /* ── Restaurant payment decision ── */
  const handleRestaurantPaid = useCallback(async (orderId: string, paid: boolean) => {
    const order = active.find((o) => o.id === orderId);
    await supabase
      .from("orders")
      .update({
        restaurant_paid: paid,
        restaurant_debt: paid ? 0 : (order?.subtotal ?? 0),
      })
      .eq("id", orderId)
      .eq("status", "accepted");

    /* Optimistic local update — no full reload needed */
    setActive((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, restaurantPaid: paid, restaurantDebt: paid ? 0 : o.subtotal }
        : o,
    ));
  }, [active]);

  /* ── Pickup ── */
  const pickup = useCallback(async (id: string) => {
    await supabase
      .from("orders")
      .update({ picked_up: true, status: "on_the_way" })
      .eq("id", id)
      .eq("status", "accepted");

    setActive((prev) => prev.map((o) => o.id === id ? { ...o, pickedUp: true } : o));
    refreshFnRef.current?.(); // update lock state (hasPickedUp → ordersLocked)
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
      refreshFnRef.current?.(); // sync accounts page data
    } catch (err) {
      console.error("Collection error:", err);
    } finally {
      setCollecting(false);
    }
  }, [collectTarget]);

  /* ── Smart auto-refresh: keep a live ref to the current refresh fn ── */
  const refreshFnRef   = useRef<(() => void) | null>(null);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    refreshFnRef.current = () => {
      if (!driverId) return;
      loadData(driverId, shiftId);
    };
  }, [driverId, shiftId, loadData]);

  /* Soft refetch on tab focus / visibility restore (throttled to 5 s) */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = now;
      refreshFnRef.current?.();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  /* Refetch when network is restored */
  useEffect(() => {
    function onRestored() {
      const now = Date.now();
      lastRefreshRef.current = now;
      refreshFnRef.current?.();
    }
    window.addEventListener("network-restored", onRestored);
    return () => window.removeEventListener("network-restored", onRestored);
  }, []);

  /* Periodic poll — new orders appear while page stays open (every 10 s) */
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = now;
      refreshFnRef.current?.();
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  const canTakeNewOrders = !ordersLocked;

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
            {(driverName || "م")[0]}
          </div>
          {driverName && (
            <p className="text-sm font-semibold hidden sm:block" style={{ color: C.muted }}>{driverName}</p>
          )}
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
            {canStartShift ? (
              <div
                className="rounded-2xl p-5 flex flex-col items-center gap-4 text-center"
                style={{ background: `${C.teal}12`, border: `1px solid ${C.teal}44` }}
              >
                <span className="text-4xl">🟢</span>
                <p className="text-base font-black" style={{ color: C.teal }}>
                  الوردية متاحة الآن
                </p>
                <p className="text-sm" style={{ color: C.muted }}>
                  اضغط على الزر لبدء العمل واستقبال الأوردرات
                </p>
                <button
                  onClick={startShift}
                  disabled={startingShift}
                  className="px-8 py-3 rounded-2xl text-sm font-black transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: C.teal, color: "#fff" }}
                >
                  {startingShift ? "جارٍ البدء..." : "بدء العمل"}
                </button>
              </div>
            ) : shiftStopped ? (
              <div
                className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: `${C.red}12`, border: `1px solid ${C.red}33` }}
              >
                <span className="text-4xl">🚫</span>
                <p className="text-base font-black" style={{ color: C.red }}>
                  هذه الوردية مغلقة حاليًا
                </p>
                <p className="text-sm" style={{ color: C.muted }}>
                  تم إيقاف استقبال الأوردرات الجديدة لهذه الوردية
                </p>
              </div>
            ) : noShift ? (
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
            ) : !canTakeNewOrders ? (
              <div
                className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: `${C.orange}12`, border: `1px solid ${C.orange}44` }}
              >
                <span className="text-4xl">🛵</span>
                <p className="text-base font-black" style={{ color: C.orange }}>
                  وصّل الطلبات اللي معاك الأول
                </p>
                <p className="text-sm" style={{ color: C.muted }}>
                  أنهِ جميع الطلبات الحالية لاستقبال طلبات جديدة
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

      {/* ── Cached data notice ── */}
      {usingCache && (
        <div
          className="fixed bottom-20 inset-x-0 flex justify-center px-4 z-40"
        >
          <div
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}44` }}
          >
            📦 بيانات محفوظة من آخر اتصال
          </div>
        </div>
      )}
    </div>
  );
}
