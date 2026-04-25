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
};

/* ── Types ── */
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
type ActiveOrder = Order & { pickedUp: boolean; phone: string };

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
  id, total, notes, user_order_number,
  restaurants!restaurant_id (name),
  addresses!address_id (full_address, area_id),
  order_items (quantity, menu_items(name, price))
`;

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
      {/* Collapsed header — always visible */}
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

      {/* Expanded details */}
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
                <span className="text-sm" style={{ color: C.text }}>
                  {m.qty}× {m.name}
                </span>
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

          {/* Accept button */}
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

/* ── Active order card ── */
function ActiveCard({ order, onDeliver }: { order: ActiveOrder; onDeliver: () => void }) {
  const [open,     setOpen]     = useState(false);
  const [pickedUp, setPickedUp] = useState(order.pickedUp);
  const [copied,   setCopied]   = useState(false);

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
            {/* pickup status badge */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: pickedUp ? `${C.green}20`  : `${C.yellow}20`,
                color:      pickedUp ? C.green          : C.yellow,
              }}
            >
              {pickedUp ? "✓ تم الاستلام" : "لم يُستلم بعد"}
            </span>
          </div>
        </div>
        <span style={{ color: C.muted, flexShrink: 0 }}>
          <ChevronIcon open={open} />
        </span>
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

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={() => setPickedUp(true)}
              disabled={pickedUp}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: pickedUp ? `${C.green}20` : C.yellow,
                color:      pickedUp ? C.green         : "#0F172A",
                cursor:     pickedUp ? "default"       : "pointer",
              }}
            >
              {pickedUp ? "✓ تم الاستلام من المطعم" : "تم الاستلام من المطعم"}
            </button>

            <button
              onClick={onDeliver}
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
  const [tab,       setTab]       = useState<TabId>("available");
  const [available, setAvailable] = useState<Order[]>([]);
  const [active,    setActive]    = useState<ActiveOrder[]>([]);
  const [driverId,  setDriverId]  = useState<string | null>(null);
  const [shiftId,   setShiftId]   = useState<string | null>(null);
  const [noShift,   setNoShift]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  const loadData = useCallback(async (did: string, sid: string) => {
    const { data: availableOrders, error: availableError } = await supabase
      .from("orders")
      .select(`
        id, total, notes, user_order_number,
        restaurants!restaurant_id (name),
        addresses!address_id (full_address, area_id)
      `)
      .eq("status", "pending")
      .eq("shift_id", sid);

    const { data: act } = await supabase.from("orders").select(ORDER_SELECT).eq("status", "on_the_way").eq("delivery_id", did);

    setAvailable((availableOrders ?? []).map(toOrder));
    setActive((act ?? []).map((o) => ({ ...toOrder(o), pickedUp: false, phone: "" })));
  }, []);

  useEffect(() => {
    async function init() {
      const driver = JSON.parse(localStorage.getItem("driver_user") || "{}");
      const did = driver.id;
      if (!did) { setLoading(false); return; }
      setDriverId(did);

      // 1. جيب الـ shift النشطة من delivery_shifts
      const { data: deliveryShift, error: deliveryShiftError } = await supabase
        .from("delivery_shifts")
        .select("shift_id")
        .eq("delivery_id", did)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!deliveryShift) { setNoShift(true); setLoading(false); return; }

      // 2. جيب تفاصيل الـ shift
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id, num, start_time")
        .eq("id", deliveryShift.shift_id)
        .single();

      if (!activeShift) { setNoShift(true); setLoading(false); return; }
      setShiftId(activeShift.id);

      await loadData(did, activeShift.id);
      setLoading(false);
    }
    init();
  }, [loadData]);

  const accept = useCallback(async (order: Order) => {
    if (!driverId || !shiftId) return;
    playNotif();
    await supabase
      .from("orders")
      .update({ status: "on_the_way", delivery_id: driverId })
      .eq("id", order.id);
    await loadData(driverId, shiftId);
    setTab("active");
  }, [driverId, shiftId, loadData]);

  const deliver = useCallback(async (id: string) => {
    await supabase.from("orders").update({ status: "delivered" }).eq("id", id);
    if (driverId && shiftId) await loadData(driverId, shiftId);
  }, [driverId, shiftId, loadData]);

  const availCount = available.length;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
      </div>
    );
  }

  /* ── No active shift ── */
  if (noShift) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6"
        style={{ background: C.bg, color: C.text, direction: "rtl" }}
      >
        <span className="text-5xl">🚫</span>
        <p className="text-base font-bold" style={{ color: C.text }}>ليس لديك وردية نشطة حالياً</p>
        <p className="text-sm" style={{ color: C.muted }}>تواصل مع المشرف لتفعيل الوردية</p>
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
            {available.length === 0 ? (
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
              <ActiveCard key={o.id} order={o} onDeliver={() => deliver(o.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
