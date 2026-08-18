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
type Meal   = { name: string; qty: number; price: number; extras: Extra[]; notes?: string; category?: string; size_name?: string };
type Order  = {
  id:              string;
  num:             string;
  restaurant:      string;
  restaurantArea:  string;
  area:            string;
  address:         string;
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
    restaurantArea: o.restaurants?.address ?? "—",
    area:        o.addresses?.areas?.name ?? "—",
    address:     o.addresses?.full_address ?? "—",
    subtotal:       o.subtotal        ?? 0,
    deliveryFee:    o.delivery_fee    ?? 0,
    discountAmount: o.discount_amount ?? 0,
    total:          o.total           ?? 0,
    meals:       (o.order_items ?? []).map((item: DBOrder) => ({
      name:     item.menu_items?.name ?? "—",
      qty:      item.quantity         ?? 1,
      price:    item.price_at_order   ?? 0,
      extras:   Array.isArray(item.extras) ? item.extras : [],
      notes:    item.notes ?? "",
      category: item.menu_items?.categories?.name ?? undefined,
      size_name: item.size_name ?? "",
    })),
    note: o.notes ?? "",
  };
}

const ORDER_SELECT = `
  id, user_id, status, picked_up, total, subtotal, delivery_fee, discount_amount, notes, user_order_number,
  restaurant_paid, restaurant_debt, payment_method, cash_amount, vodafone_amount,
  restaurants!restaurant_id (name, address),
  addresses!address_id (full_address, areas (name)),
  order_items (quantity, price_at_order, extras, notes, size_name, menu_items (name, categories (name))),
  users!user_id (phone)
`;

/* ── Entity (منشأة) delivery requests — served by /api/driver/delivery-requests.
     Only columns that exist on delivery_requests are used (no picked_up /
     restaurant_paid / payment fields — they don't exist on that table). ── */
type EntityReq = {
  id:               string;
  restaurant_name:  string;
  delivery_address: string | null;
  notes:            string | null;
  status:           string;
  customer_phone:   string | null;
  price:            number | null;
  delivery_fee:     number | null;
  area:             string | null;
  area_id:          string | null;
  created_at:       string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntityReq(r: Record<string, any>): EntityReq {
  return {
    id:               r.id ?? "",
    restaurant_name:  r.restaurant_name ?? "منشأة",
    delivery_address: r.delivery_address ?? null,
    notes:            r.notes ?? null,
    status:           r.status ?? "",
    customer_phone:   r.customer_phone ?? null,
    price:            r.price ?? null,
    delivery_fee:     r.delivery_fee ?? (r.areas?.delivery_fee ?? null),
    area:             r.areas?.name ?? null,
    area_id:          r.area_id ?? null,
    created_at:       r.created_at ?? "",
  };
}

function fmtAmt(n: number) { return `${n.toLocaleString("ar-EG")} ج.م`; }

/* ── Accept sound (Web Audio API) ── */
function playAcceptSound() {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode   = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.setValueAtTime(523, ctx.currentTime);
  oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.5);
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
          <span className="text-[11px] truncate" style={{ color: C.muted }}>📍 {order.restaurantArea}</span>
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
                    <span className="text-sm" style={{ color: C.text }}>{m.category && <span style={{ color: C.blue }}>{m.category} - </span>}{m.name}{m.size_name && <span style={{ color: C.blue }}> ({m.size_name})</span>} ×{m.qty}</span>
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

/* ── Available entity request card — same visual language as AvailableCard,
     with a clear "🏢 طلب منشأة" badge. Only real fields, no fake values. ── */
function EntityAvailableCard({
  req, onAccept, busy,
}: {
  req: EntityReq;
  onAccept: () => void;
  busy: boolean;
}) {
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${C.blue}22`, color: C.blue }}>
              🏢 طلب منشأة
            </span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{req.restaurant_name}</span>
          </div>
          <span className="text-[11px] truncate" style={{ color: C.muted }}>📍 {req.area ?? "—"}</span>
          {req.price != null && (
            <span className="text-base font-black" style={{ color: C.green }}>{req.price} ج.م</span>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <span>🚚 {req.delivery_fee ?? 0}ج</span>
            {req.customer_phone && (
              <>
                <span style={{ color: C.border }}>|</span>
                <span>☎ {req.customer_phone}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!open && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              disabled={busy}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: C.teal, color: "#fff" }}
            >
              {busy ? "جاري..." : "قبول"}
            </button>
          )}
          <span style={{ color: C.muted }}><ChevronIcon open={open} /></span>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: C.border }}>

          {/* Address */}
          <div className="pt-3 flex flex-col gap-0.5">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>عنوان التوصيل</p>
            <p className="text-sm" style={{ color: C.muted }}>🏠 {req.delivery_address || "—"}</p>
          </div>

          {/* Notes */}
          {req.notes && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات</p>
              <p className="text-sm" style={{ color: C.text }}>{req.notes}</p>
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.bg }}>
            {req.price != null && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: C.muted }}>💵 سعر الطلب</span>
                <span className="font-semibold" style={{ color: C.text }}>{req.price} ج.م</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🚚 التوصيل</span>
              <span className="font-semibold" style={{ color: C.blue }}>{req.delivery_fee ?? 0} ج.م</span>
            </div>
          </div>

          <button
            onClick={onAccept}
            disabled={busy}
            className="w-full py-3 rounded-xl text-sm font-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: C.teal, color: "#fff" }}
          >
            {busy ? "جاري القبول..." : "قبول الطلب"}
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
          <span className="text-[11px] truncate" style={{ color: C.muted }}>📍 {order.restaurantArea}</span>
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
                    <span className="text-sm" style={{ color: C.text }}>{m.category && <span style={{ color: C.blue }}>{m.category} - </span>}{m.name}{m.size_name && <span style={{ color: C.blue }}> ({m.size_name})</span>} ×{m.qty}</span>
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

/* ── Active entity request card — driver completes it in the same cycle:
       استلمت الطلب (accepted → on_the_way)  →  تم التسليم (on_the_way → delivered).
     Uses ONLY on_the_way_at / delivered_at / customer_phone that exist on the table. ── */
function EntityActiveCard({
  req, areas, onPickup, onDeliver, busy,
}: {
  req: EntityReq;
  areas: { id: string; name: string }[];
  onPickup: (areaId: string, phone: string, price: string, notes: string) => void;
  onDeliver: () => void;
  busy: boolean;
}) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const [areaId, setAreaId] = useState(req.area_id ?? "");
  const [phone,  setPhone]  = useState(req.customer_phone ?? "");
  const [price,  setPrice]  = useState(req.price != null ? String(req.price) : "");
  const [notes,  setNotes]  = useState(req.notes ?? "");
  const pickedUp = req.status === "on_the_way";
  const phoneValid = /^01[0125][0-9]{8}$/.test(phone.trim().replace(/[\s-]/g, ""));
  const canPickup  = areaId !== "" && phoneValid;

  function copyPhone() {
    if (req.customer_phone) navigator.clipboard.writeText(req.customer_phone).catch(() => {});
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${C.blue}22`, color: C.blue }}>
              🏢 طلب منشأة
            </span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>{req.restaurant_name}</span>
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
          <span className="text-[11px] truncate" style={{ color: C.muted }}>📍 {req.area ?? "—"}</span>
          {req.price != null && (
            <span className="text-base font-black" style={{ color: C.green }}>{req.price} ج.م</span>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <span>🚚 {req.delivery_fee ?? 0}ج</span>
            {req.customer_phone && (
              <>
                <span style={{ color: C.border }}>|</span>
                <span>☎ {req.customer_phone}</span>
              </>
            )}
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
            <p className="text-sm" style={{ color: C.muted }}>🏠 {req.delivery_address || "—"}</p>
          </div>

          {/* Notes */}
          {req.notes && (
            <div className="rounded-xl px-3 py-2" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}30` }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.yellow }}>ملاحظات</p>
              <p className="text-sm" style={{ color: C.text }}>{req.notes}</p>
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.bg }}>
            {req.price != null && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: C.muted }}>💵 سعر الطلب</span>
                <span className="font-semibold" style={{ color: C.text }}>{req.price} ج.م</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.muted }}>🚚 التوصيل</span>
              <span className="font-semibold" style={{ color: C.blue }}>{req.delivery_fee ?? 0} ج.م</span>
            </div>
          </div>

          {/* ── Steps Flow ── */}
          <div className="flex flex-col gap-2 mt-1">
            {!pickedUp && (
              <>
                <div className="flex flex-col gap-2 p-3 rounded-xl"
                  style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold" style={{ color: C.muted }}>
                      المنطقة <span style={{ color: C.red }}>(مطلوب)</span>
                    </label>
                    <select
                      value={areaId}
                      onChange={(e) => setAreaId(e.target.value)}
                      className="rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    >
                      <option value="">اختر المنطقة</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold" style={{ color: C.muted }}>
                      رقم هاتف العميل <span style={{ color: C.red }}>(مطلوب)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      className="rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold" style={{ color: C.muted }}>
                      سعر الطلب (ج.م) <span style={{ color: C.muted }}>(اختياري)</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      className="rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold" style={{ color: C.muted }}>
                      تفاصيل الطلب <span style={{ color: C.muted }}>(اختياري)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="اكتب تفاصيل الطلب إن وجدت"
                      rows={3}
                      className="rounded-xl px-3 py-2 text-sm outline-none resize-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                </div>
                {!canPickup && (
                  <p className="text-[11px] font-semibold text-center" style={{ color: C.red }}>
                    أكمل المنطقة ورقم الهاتف لتفعيل الاستلام
                  </p>
                )}
                <button
                  onClick={() => onPickup(areaId, phone.trim(), price.trim(), notes.trim())}
                  disabled={busy || !canPickup}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.yellow, color: "#0F172A" }}
                >
                  {busy ? "جاري..." : "استلمت الطلب"}
                </button>
              </>
            )}

            {pickedUp && (
              <>
                {req.customer_phone ? (
                  <div className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                    style={{ background: `${C.teal}12`, border: `1px solid ${C.teal}30` }}>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold" style={{ color: C.teal }}>رقم هاتف العميل</p>
                      <p className="text-sm font-bold tracking-wide" style={{ color: C.text }}>{req.customer_phone}</p>
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
                <button
                  onClick={onDeliver}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.green, color: "#fff" }}
                >
                  {busy ? "جاري..." : "تم التسليم"}
                </button>
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

  /* ── Entity (منشأة) delivery requests state ── */
  const [entityAvailable,  setEntityAvailable]  = useState<EntityReq[]>([]);
  const [entityActive,     setEntityActive]     = useState<EntityReq[]>([]);
  const [acceptingEntityId, setAcceptingEntityId] = useState<string | null>(null);
  const [entityBusyId,     setEntityBusyId]     = useState<string | null>(null);
  /* IDs already seen — used to sound the "new request" chime on polling
     (realtime is RLS-blocked on delivery_requests, so polling detects it). */
  const entitySeenRef = useRef<Set<string>>(new Set());

  /* ── Areas list — the driver completes entity request delivery data
        (area + customer phone) before pickup. Loaded from the public
        areas table, same as the entity page. ── */
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("areas")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (mounted && data) setAreas(data);
    })().catch(() => {});
    return () => { mounted = false; };
  }, []);

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

    /* 2b. Entity (منشأة) delivery requests — via guarded server API.
         Active: always (driver must finish what it already owns).
         Available: only in an open shift AND unlocked (same rule as orders).
         Sound on a newly-seen pending request — polling stands in for realtime,
         which is RLS-blocked for browser clients on delivery_requests. */
    try {
      const eres = await fetch("/api/driver/delivery-requests", { credentials: "include" });
      if (eres.ok) {
        const edata = await eres.json();
        const eAvail = ((edata.available ?? []) as DBOrder[]).map(toEntityReq);
        setEntityActive(((edata.active ?? []) as DBOrder[]).map(toEntityReq));
        const visible = sid && !locked ? eAvail : [];
        setEntityAvailable(visible);

        /* Same sound file as regular orders — new request chime */
        if (visible.length > 0 && entitySeenRef.current.size > 0) {
          for (const r of visible) {
            if (!entitySeenRef.current.has(r.id)) {
              try { new Audio("/sounds/driver_new_order.mp3").play().catch(() => {}); } catch { /* ignore */ }
              break;
            }
          }
        }
        entitySeenRef.current = new Set(visible.map((r) => r.id));
      }
    } catch (err) {
      console.error("fetchEntityDeliveryRequests:", err);
    }

    /* 3. Fetch available orders only when unlocked and in a shift */
    if (sid && !locked) {
      const { data: availableOrders } = await supabase
        .from("orders")
        .select(`
          id, total, subtotal, delivery_fee, discount_amount, notes, user_order_number,
          restaurants!restaurant_id (name, address),
          addresses!address_id (full_address, areas (name)),
          order_items (quantity, price_at_order, extras, notes, size_name, menu_items (name, categories (name)))
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

      /* Get the driver's most recent delivery_shift — status="open" means financial shift is active */
      const { data: dsRows, error: dsError } = await supabase
        .from("delivery_shifts")
        .select("id, shift_id, status")
        .eq("delivery_id", did)
        .in("status", ["open", "pending_close"])
        .order("started_at", { ascending: false })
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

      if (ds.status === "pending_close") {
        /* Shift ended — no new orders, keep shiftId for accounts page */
        setShiftStopped(true);
        await loadData(did, null);
      } else if (ds.status !== "open") {
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
        .update({ is_active: true, status: "open" })
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
    playAcceptSound();
    await supabase
      .from("orders")
      .update({ status: "accepted", delivery_id: driverId })
      .eq("id", order.id)
      .eq("status", "pending");
    await loadData(driverId, shiftId);
    setTab("active");
  }, [driverId, shiftId, ordersLocked, loadData]);

  /* ── Accept entity request — server-side ATOMIC (pending → accepted).
         Binds delivery_id + delivery_shift_id + accepted_at on the server. ── */
  const acceptEntity = useCallback(async (req: EntityReq) => {
    if (!driverId || !shiftId || ordersLocked || acceptingEntityId) return;
    setAcceptingEntityId(req.id);
    try {
      const res = await fetch(`/api/driver/delivery-requests/${req.id}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        playAcceptSound();
        if (driverId && shiftId) await loadData(driverId, shiftId);
        setTab("active");
      } else {
        /* Already taken by another driver / state changed — refresh to reflect it */
        if (driverId && shiftId) await loadData(driverId, shiftId);
      }
    } catch (err) {
      console.error("acceptEntity:", err);
    } finally {
      setAcceptingEntityId(null);
    }
  }, [driverId, shiftId, ordersLocked, acceptingEntityId, loadData]);

  /* ── Entity pickup / deliver — server-side status transitions
         (accepted → on_the_way → delivered). At pickup the driver completes
         area_id + customer_phone (required before pickup) and may provide
         price and notes (both optional — the entity may already have set
         them); they are sent to the guarded API and stored server-side. ── */
  const entityTransition = useCallback(async (
    req: EntityReq,
    action: "pickup" | "deliver",
    areaId?: string,
    phone?: string,
    price?: string,
    notes?: string,
  ) => {
    if (!driverId || entityBusyId) return;
    setEntityBusyId(req.id);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "pickup") {
        if (areaId !== undefined) body.area_id = areaId;
        if (phone !== undefined) body.customer_phone = phone;
        if (price !== undefined) body.price = price;
        if (notes !== undefined) body.notes = notes;
      }
      const res = await fetch(`/api/driver/delivery-requests/${req.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && driverId) {
        await loadData(driverId, shiftId);
      }
    } catch (err) {
      console.error("entityTransition:", err);
    } finally {
      setEntityBusyId(null);
    }
  }, [driverId, shiftId, entityBusyId, loadData]);

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

  /* ── Realtime subscription on orders table ── */
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel("driver-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          try {
            const inserted = payload.new as DBOrder;
            if (inserted.status !== "pending") return;
            if (shiftId && inserted.shift_id !== shiftId) return;

            const { data } = await supabase
              .from("orders")
              .select(`
                id, total, subtotal, delivery_fee, discount_amount, notes, user_order_number,
                restaurants!restaurant_id (name, address),
                addresses!address_id (full_address, areas (name)),
                order_items (quantity, price_at_order, extras, notes, size_name, menu_items (name, categories (name)))
              `)
              .eq("id", inserted.id as string)
              .single();

            if (!data) return;

            setAvailable((prev) => {
              if (prev.some((o) => o.id === (data as DBOrder).id)) return prev;
              return [...prev, toOrder(data as DBOrder)];
            });
          } catch (err) {
            console.error("Realtime INSERT error:", err);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          try {
            const updated = payload.new as DBOrder;

            /* Remove from available if no longer pending */
            if (updated.status !== "pending") {
              setAvailable((prev) => prev.filter((o) => o.id !== updated.id));
            }

            /* Update active orders for this driver */
            if (updated.delivery_id === driverId) {
              setActive((prev) =>
                prev.map((o) =>
                  o.id !== updated.id
                    ? o
                    : { ...o, pickedUp: (updated.picked_up as boolean) ?? o.pickedUp }
                )
              );
            }
          } catch (err) {
            console.error("Realtime UPDATE error:", err);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error on orders table");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, shiftId]);

  const canTakeNewOrders = !ordersLocked;

  const availCount  = available.length + entityAvailable.length;
  const activeCount = active.length + entityActive.length;

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
          const label = t === "available"
            ? (availCount > 0 ? `الطلبات المتاحة (${availCount})` : "الطلبات المتاحة")
            : "قيد التنفيذ";
          const count = t === "available" ? availCount : activeCount;
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
            ) : available.length === 0 && entityAvailable.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <span className="text-4xl">📭</span>
                <p className="text-sm" style={{ color: C.muted }}>لا توجد طلبات متاحة حالياً</p>
              </div>
            ) : (
              <>
                {available.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black" style={{ color: C.muted }}>طلبات العملاء</p>
                    {available.map((o) => (
                      <AvailableCard key={o.id} order={o} onAccept={() => accept(o)} />
                    ))}
                  </div>
                )}
                {entityAvailable.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black" style={{ color: C.muted }}>طلبات المنشآت</p>
                    {entityAvailable.map((r) => (
                      <EntityAvailableCard
                        key={r.id}
                        req={r}
                        onAccept={() => acceptEntity(r)}
                        busy={acceptingEntityId === r.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "active" && (
          <>
            {active.length === 0 && entityActive.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <span className="text-4xl">🛵</span>
                <p className="text-sm" style={{ color: C.muted }}>لا توجد طلبات قيد التنفيذ</p>
              </div>
            ) : (
              <>
                {active.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black" style={{ color: C.muted }}>طلبات العملاء</p>
                    {active.map((o) => (
                      <ActiveCard
                        key={o.id}
                        order={o}
                        onDeliver={deliver}
                        onPickup={pickup}
                        onRestaurantPaid={handleRestaurantPaid}
                      />
                    ))}
                  </div>
                )}
                {entityActive.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black" style={{ color: C.muted }}>طلبات المنشآت</p>
                    {entityActive.map((r) => (
                      <EntityActiveCard
                        key={r.id}
                        req={r}
                        areas={areas}
                        onPickup={(areaId, phone, price, notes) => entityTransition(r, "pickup", areaId, phone, price, notes)}
                        onDeliver={() => entityTransition(r, "deliver")}
                        busy={entityBusyId === r.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
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
