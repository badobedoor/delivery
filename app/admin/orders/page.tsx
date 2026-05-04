"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const C = {
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
  bg:     "#0F172A",
};

/* ── DB Types ── */
type DBNewOrder = {
  id: string;
  total: number;
  subtotal: number | null;
  notes: string | null;
  user_order_number: number | null;
  created_at: string;
  restaurant_id: string | null;
  restaurants: { name: string } | null;
  addresses: { full_address: string | null; areas: { name: string } | null } | null;
  order_items: {
    quantity:      number;
    price_at_order: number;
    extras:        { name: string; price: number }[] | null;
    menu_items:    { name: string } | null;
  }[];
  users: { name: string | null; phone: string | null } | null;
};

type DBOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  user_order_number: number | null;
  restaurant_id?: string | null;
  restaurants: { name: string } | null;
  addresses: { areas: { name: string } | null } | null;
  users: { name: string | null; phone: string | null } | null;
  delivery_staff: { name: string | null } | null;
};

/* ── Status helpers ── */
const STATUS_AR: Record<string, string> = {
  new:        "جديد",
  accepted:   "قبله الدرايفر",
  pending:    "قيد التنفيذ",
  on_the_way: "في الطريق",
  delivered:  "تم التوصيل",
  cancelled:  "ملغي",
};

function statusColor(s: string) {
  if (s === "new"        || s === "جديد")        return { bg: `${C.orange}22`, color: C.orange };
  if (s === "delivered"  || s === "تم التوصيل")  return { bg: `${C.green}22`,  color: C.green  };
  if (s === "on_the_way" || s === "في الطريق")   return { bg: `${C.blue}22`,   color: C.blue   };
  if (s === "pending"    || s === "قيد التنفيذ") return { bg: `${C.yellow}22`, color: C.yellow };
  return                                                  { bg: `${C.red}22`,    color: C.red    };
}

function formatTime(iso: string) {
  return new Date(iso + "Z").toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
}

function formatDate(iso: string) {
  return new Date(iso + "Z").toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

/* ── Tabs ── */
const tabs: { label: string; value: string }[] = [
  { label: "الكل",         value: "الكل"         },
  { label: "قيد التنفيذ", value: "قيد التنفيذ"  },
  { label: "في الطريق",   value: "في الطريق"    },
  { label: "تم التوصيل",  value: "تم التوصيل"   },
  { label: "ملغي",         value: "ملغي"         },
];

export default function AdminOrdersPage() {
  const [newOrdersList, setNewOrdersList] = useState<DBNewOrder[]>([]);
  const [allOrdersList, setAllOrdersList] = useState<DBOrder[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("الكل");
  const [search,        setSearch]        = useState("");
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);
  const [confirmError,  setConfirmError]  = useState<string | null>(null);
  const [selectedOrderModal, setSelectedOrderModal] = useState<{
    id: string;
    number:       number | null;
    total:        number;
    subtotal:     number | null;
    delivery_fee: number | null;
    status:       string;
    restaurant:   string | null;
    area:         string | null;
    notes:        string | null;
  } | null>(null);
  const [modalItems,   setModalItems]   = useState<{
    name:     string;
    quantity: number;
    price:    number;
    extras:   { name: string; price: number }[];
  }[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError,   setModalError]   = useState<string | null>(null);

  /* ── Shift time validation (handles overnight shifts) ── */
  function isShiftActiveNow(shift: { start_time: string; end_time: string }): boolean {
    const now            = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH,   endM]   = shift.end_time.split(":").map(Number);
    const startMinutes     = startH * 60 + startM;
    const endMinutes       = endH   * 60 + endM;

    if (startMinutes <= endMinutes) {
      /* Normal shift e.g. 08:00 → 16:00 */
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    /* Overnight shift e.g. 22:00 → 06:00 */
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  async function loadData() {
    // 1. جلب الطلبات بدون order_items
    const { data: newOrdersData, error: e1 } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        subtotal,
        notes,
        user_order_number,
        created_at,
        restaurant_id,
        restaurants:restaurants!restaurant_id (name),
        addresses:addresses!address_id (
          full_address,
          areas (name)
        ),
        users:users (name, phone)
      `)
      .eq("status", "new")
      .order("created_at", { ascending: false });

    console.log("New Orders Error:", e1);
    console.log("New Orders:", newOrdersData);

    // 2. جلب الأصناف لكل الطلبات الجديدة بشكل منفصل
    const orderIds = (newOrdersData ?? []).map((o: any) => o.id);
    let itemsMap: Record<string, DBNewOrder["order_items"]> = {};

    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("order_id, quantity, price_at_order, extras, menu_items (name)")
        .in("order_id", orderIds);

      for (const row of (itemsData ?? []) as any[]) {
        if (!itemsMap[row.order_id]) itemsMap[row.order_id] = [];
        itemsMap[row.order_id].push({
          quantity:       row.quantity,
          price_at_order: row.price_at_order ?? 0,
          extras:         Array.isArray(row.extras) ? row.extras : [],
          menu_items:     row.menu_items ?? null,
        });
      }
    }

    // 3. دمج الأصناف مع الطلبات
    const finalOrders: DBNewOrder[] = (newOrdersData ?? []).map((o: any) => ({
      ...o,
      order_items: itemsMap[o.id] ?? [],
    }));

    const { data: allOrdersData, error: e2 } = await supabase
      .from("orders")
      .select(`
        id, total, status, created_at, user_order_number, user_id, delivery_id,
        restaurants!restaurant_id (name),
        addresses!address_id (areas(name)),
        users (name, phone),
        delivery_staff (name)
      `)
      .neq("status", "new")
      .order("created_at", { ascending: false });

    console.log("All Orders Error:", e2);
    console.log("All Orders:", allOrdersData);

    setNewOrdersList(finalOrders);
    setAllOrdersList((allOrdersData as unknown as DBOrder[]) ?? []);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  async function sendToRestaurant(order: DBNewOrder) {
    console.log("Order:", order);
    console.log("Restaurant ID:", order.restaurant_id);

    if (!order.restaurant_id || order.restaurant_id === "null") {
      alert("لا يوجد رقم مطعم مرتبط بهذا الطلب");
      return;
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("phone")
      .eq("id", order.restaurant_id)
      .single();

    console.log("Restaurant Data:", restaurant);
    console.log("Restaurant Error:", restaurantError);

    if (!restaurant?.phone) return;

    // تحويل الرقم لصيغة دولية
    const phone = restaurant.phone.replace(/^0/, "20").replace(/\D/g, "");

    const itemsText = order.order_items.map((item) => {
      const extras      = item.extras ?? [];
      const extrasTotal = extras.reduce((sum, e) => sum + (e.price ?? 0), 0);
      const basePrice   = item.price_at_order - extrasTotal;

      let line = `- ${item.menu_items?.name ?? "—"} ×${item.quantity}\n  السعر الأساسي: ${basePrice}ج`;

      if (extras.length > 0) {
        const extrasLines = extras.map((e) => `    + ${e.name} (+${e.price}ج)`).join("\n");
        line += `\n  الإضافات:\n${extrasLines}`;
      }

      return line;
    }).join("\n\n");

    const message = [
      "🛵 طلب جديد من حالا",
      "",
      "الأصناف:",
      itemsText,
      "",
      ...(order.notes ? [`📝 ملاحظات: ${order.notes}`, ""] : []),
      `💰 الإجمالي: ${order.subtotal ?? order.total}ج`,
      "",
      "يرجى الرد لتأكيد استلام الطلب 🙏",
    ].join("\n");

    console.log("WhatsApp message:", message);

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  }

  async function confirmOrder(id: string) {
    setConfirmError(null);

    // 1. UI guard — تحقق من الـ local state أولاً قبل أي network call
    const order = newOrdersList.find((o) => o.id === id);
    if (!order) {
      setConfirmError("تم تحديث الطلب بالفعل");
      return;
    }

    setConfirmingId(id);

    // 2. التحقق من وجود وردية نشطة مع start_time و end_time
    const { data: shift } = await supabase
      .from("shifts")
      .select("id, start_time, end_time")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!shift) {
      setConfirmError("🚫 لا توجد وردية نشطة حالياً، يرجى فتح وردية أولاً");
      setConfirmingId(null);
      return;
    }

    // 3. التحقق من أن الوقت الحالي ضمن نطاق الوردية
    if (!isShiftActiveNow(shift)) {
      setConfirmError("⚠️ هذه الوردية خارج وقت التشغيل، يرجى إنهاءها وفتح وردية مناسبة للوقت الحالي");
      setConfirmingId(null);
      return;
    }

    // 4. التحقق من وجود سائقين نشطين في الوردية
    const { count } = await supabase
      .from("delivery_shifts")
      .select("*", { count: "exact", head: true })
      .eq("shift_id", shift.id)
      .eq("is_active", true);

    if (!count) {
      setConfirmError("🚫 لا يوجد سائقين متاحين على هذه الوردية، يرجى إضافة سائقين أولاً");
      setConfirmingId(null);
      return;
    }

    // 5. DB update مع status guard — select("id") عشان نعرف لو اتحدث فعلاً
    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: "pending", shift_id: shift.id })
      .eq("id", id)
      .eq("status", "new")
      .select("id");

    if (error) { console.log("Confirm Error:", error); setConfirmingId(null); return; }

    if (!updated?.length) {
      setConfirmError("تم تحديث الطلب بالفعل من مستخدم آخر");
      setConfirmingId(null);
      return;
    }

    // 6. Optimistic UI update
    setNewOrdersList((prev) => prev.filter((o) => o.id !== id));
    setAllOrdersList((prev) => [{
      id:                order.id,
      total:             order.total,
      status:            "pending",
      created_at:        order.created_at,
      user_order_number: order.user_order_number,
      restaurant_id:     order.restaurant_id,
      restaurants:       order.restaurants,
      addresses:         order.addresses as any,
      users:             order.users,
      delivery_staff:    null,
    }, ...prev]);

    setConfirmingId(null);
  }

  async function cancelOrder(id: string) {
    const order = newOrdersList.find((o) => o.id === id);
    setNewOrdersList((prev) => prev.filter((o) => o.id !== id));
    if (order) {
      setAllOrdersList((prev) => [{
        id: order.id,
        total: order.total,
        status: "cancelled",
        created_at: order.created_at,
        user_order_number: order.user_order_number,
        restaurant_id: order.restaurant_id,
        restaurants: order.restaurants,
        addresses: order.addresses as any,
        users: null,
        delivery_staff: null,
      }, ...prev]);
    }
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "new");
    console.log("Cancel Error:", error);
  }

  async function openModal(id: string, number: number | null, total: number, status: string) {
    setSelectedOrderModal({
      id, number, total, subtotal: null, delivery_fee: null, status, restaurant: null, area: null, notes: null,
    });
    setModalItems([]);
    setModalError(null);
    setModalLoading(true);

    const [orderRes, itemsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("subtotal, delivery_fee, total, notes, restaurants!restaurant_id (name), addresses!address_id (areas (name))")
        .eq("id", id)
        .single(),
      supabase
        .from("order_items")
        .select("quantity, price_at_order, extras, menu_items (name)")
        .eq("order_id", id),
    ]);

    if (orderRes.error) {
      console.error("Modal order fetch error:", orderRes.error);
    } else if (orderRes.data) {
      const od = orderRes.data as any;
      setSelectedOrderModal({
        id,
        number,
        total:        od.total        ?? total,
        subtotal:     od.subtotal     ?? null,
        delivery_fee: od.delivery_fee ?? null,
        status,
        restaurant:   od.restaurants?.name        ?? null,
        area:         od.addresses?.areas?.name   ?? null,
        notes:        od.notes                    ?? null,
      });
    }

    if (itemsRes.error) {
      console.error("Modal items fetch error:", itemsRes.error);
      setModalError("حدث خطأ أثناء تحميل الأصناف");
    } else {
      setModalItems(
        (itemsRes.data ?? []).map((item: any) => ({
          name:     item.menu_items?.name          ?? "—",
          quantity: item.quantity,
          price:    item.price_at_order            ?? 0,
          extras:   Array.isArray(item.extras) ? item.extras : [],
        }))
      );
    }

    setModalLoading(false);
  }

  function closeModal() {
    setSelectedOrderModal(null);
    setModalItems([]);
    setModalError(null);
  }

  const countByStatus = (s: string) => {
    if (s === "الكل") return allOrdersList.length;
    const enStatus = Object.entries(STATUS_AR).find(([, ar]) => ar === s)?.[0];
    return allOrdersList.filter((o) => o.status === enStatus).length;
  };

  const filtered = allOrdersList.filter((o) => {
    const arStatus = STATUS_AR[o.status] ?? o.status;
    const matchTab = activeTab === "الكل" || arStatus === activeTab;
    const q = search.trim();
    const matchSearch = !q ||
      `#${o.user_order_number}`.includes(q) ||
      (o.users?.name ?? "").includes(q) ||
      (o.restaurants?.name ?? "").includes(q);
    return matchTab && matchSearch;
  });

  const arabicDate = new Date().toLocaleDateString("ar-EG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" dir="rtl">

      {/* ── Top info bar ── */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: C.teal, fontSize: 16 }}>📅</span>
          <span className="text-sm font-semibold" style={{ color: C.text }}>{arabicDate}</span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: `${C.teal}18`, border: `1px solid ${C.teal}44` }}
        >
          <span style={{ color: C.teal, fontSize: 14 }}>🕐</span>
          <span className="text-sm font-bold" style={{ color: C.teal }}>
            الوردية الأولى — صباحية
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${C.teal}33`, color: C.teal }}
          >
            أ
          </div>
          <span className="text-sm font-semibold" style={{ color: C.text }}>أحمد الموظف</span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "جديد",         value: newOrdersList.length,               color: C.orange, icon: "🆕" },
          { label: "قيد التنفيذ", value: countByStatus("قيد التنفيذ"),        color: C.yellow, icon: "⏳" },
          { label: "في الطريق",   value: countByStatus("في الطريق"),          color: C.blue,   icon: "🚀" },
          { label: "تم التوصيل",  value: countByStatus("تم التوصيل"),         color: C.green,  icon: "✅" },
          { label: "ملغي",         value: countByStatus("ملغي"),               color: C.red,    icon: "❌" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── New Orders Section ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#1a1033", border: `2px solid ${C.red}55` }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${C.red}33`, background: `${C.red}0d` }}
        >
          <span className="relative flex h-3 w-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: C.red }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: C.red }}
            />
          </span>
          <h2 className="text-base font-black" style={{ color: C.text }}>
            🔴 طلبات جديدة
          </h2>
          <span
            className="mr-auto px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: `${C.red}33`, color: C.red }}
          >
            {newOrdersList.length}
          </span>
        </div>

        {/* Error banner */}
        {confirmError && (
          <div
            className="mx-4 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${C.red}18`, border: `1px solid ${C.red}44` }}
          >
            <p className="text-sm font-semibold" style={{ color: C.red }}>{confirmError}</p>
            <button
              onClick={() => setConfirmError(null)}
              className="flex-shrink-0 text-xs hover:opacity-70"
              style={{ color: C.red }}
            >✕</button>
          </div>
        )}

        {/* Cards */}
        <div className="p-4">
          {newOrdersList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <span style={{ fontSize: 36 }}>🎉</span>
              <p className="text-sm" style={{ color: C.muted }}>لا يوجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {newOrdersList.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                  onClick={() => openModal(order.id, order.user_order_number, order.total, "new")}
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: C.teal }}>
                          #{order.user_order_number ?? "—"}
                        </span>
                        <span className="text-sm font-bold" style={{ color: C.text }}>
                          {order.users?.name ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                        <span>🍽 {order.restaurants?.name ?? "—"}</span>
                        <span>•</span>
                        <span>📍 {order.addresses?.areas?.name ?? "—"}</span>
                        <span>•</span>
                        <span>🕐 {formatTime(order.created_at)}</span>
                      </div>
                      {order.notes && (
                        <p className="text-xs mt-0.5" style={{ color: C.yellow }}>
                          📝 {order.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-black" style={{ color: C.green }}>
                      {order.total} ج.م
                    </span>
                  </div>

                  {/* Items */}
                  <div
                    className="rounded-lg px-3 py-2 flex flex-col gap-1"
                    style={{ background: C.bg }}
                  >
                    {
                    (order.order_items ?? []).map((item, idx) =>(
                      <div key={idx} className="flex justify-between text-xs">
                        {/* order.order_items.map((item, idx) =>  */}
                        <span style={{ color: C.text }}>
                          {item.menu_items?.name ?? "—"}{" "}
                          <span style={{ color: C.muted }}>×{item.quantity}</span>
                        </span>
                        <span style={{ color: C.muted }}>
                          {item.price_at_order} ج.م
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => sendToRestaurant(order)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}55` }}
                    >
                      <span>📲</span> إرسال للمطعم
                    </button>
                    <button
                      onClick={() => confirmOrder(order.id)}
                      disabled={confirmingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px] disabled:opacity-60 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}
                    >
                      <span>✅</span>
                      {confirmingId === order.id ? "جارٍ التأكيد..." : "تأكيد الطلب"}
                    </button>
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[80px]"
                      style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55` }}
                    >
                      <span>✕</span> إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── All Orders Table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* ── Toolbar ── */}
        <div className="px-4 py-3 border-b flex flex-col gap-3" style={{ borderColor: C.border }}>
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الطلب، العميل أو المطعم..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
              dir="rtl"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {tabs.map((t) => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                  style={{
                    background: active ? C.teal : "transparent",
                    color:      active ? "#fff" : C.muted,
                    border:     active ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  {t.label}
                  <span className="text-[10px] opacity-80">
                    ({countByStatus(t.value)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["#", "العميل", "المطعم", "الحي", "السائق", "الأصناف", "الإجمالي", "الحالة", "الوقت"].map((col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 text-right font-semibold text-xs whitespace-nowrap${
                      i === 3 ? " hidden md:table-cell" :
                      i === 4 ? " hidden lg:table-cell" :
                      i === 5 ? " hidden sm:table-cell" : ""
                    }`}
                    style={{ color: C.muted }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد طلبات مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((order, i) => {
                  const sc = statusColor(order.status);
                  return (
                    <tr key={order.id}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}
                      onClick={() => openModal(order.id, order.user_order_number, order.total, order.status)}>
                      <td className="px-3 py-2.5 font-bold text-xs whitespace-nowrap" style={{ color: C.teal }}>
                        #{order.user_order_number ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.text }}>
                        <p className="font-semibold">{order.users?.name ?? "—"}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{order.users?.phone ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.restaurants?.name ?? "—"}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.addresses?.areas?.name ?? "—"}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.delivery_staff?.name ?? "—"}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-xs text-center" style={{ color: C.muted }}>
                        —
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: C.text }}>
                        {order.total} ج.م
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {STATUS_AR[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] whitespace-nowrap" style={{ color: C.muted }}>
                        <p>{formatTime(order.created_at)}</p>
                        <p style={{ color: C.border }}>{formatDate(order.created_at)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          عرض {filtered.length} من {allOrdersList.length} طلب
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrderModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-md flex flex-col gap-4 rounded-t-2xl sm:rounded-2xl p-5"
            style={{ background: C.card, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black" style={{ color: C.text }}>
                تفاصيل الطلب #{selectedOrderModal.number ?? "—"}
              </h3>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}
              >
                ✕
              </button>
            </div>

            {/* ── Section 1: معلومات الطلب ── */}
            <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: C.bg }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.muted }}>الحالة</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: statusColor(selectedOrderModal.status).bg,
                    color:      statusColor(selectedOrderModal.status).color,
                  }}
                >
                  {STATUS_AR[selectedOrderModal.status] ?? selectedOrderModal.status}
                </span>
              </div>
              {selectedOrderModal.restaurant && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>المطعم</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>
                    🍽 {selectedOrderModal.restaurant}
                  </span>
                </div>
              )}
              {selectedOrderModal.area && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>المنطقة</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>
                    📍 {selectedOrderModal.area}
                  </span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: C.border }} />

            {/* ── Section 2: الأصناف ── */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold" style={{ color: C.muted }}>الأصناف</p>

              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }}
                  />
                </div>
              ) : modalError ? (
                <p className="text-sm text-center py-6" style={{ color: C.red }}>{modalError}</p>
              ) : modalItems.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: C.muted }}>لا توجد أصناف</p>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: C.bg }}>
                  {modalItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex flex-col px-3 py-2.5 gap-1.5"
                      style={{ borderBottom: i < modalItems.length - 1 ? `1px solid ${C.border}` : "none" }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${C.teal}22`, color: C.teal }}
                          >
                            ×{item.quantity}
                          </span>
                          <span style={{ color: C.text }}>{item.name}</span>
                        </div>
                        <span style={{ color: C.muted }}>
                          {item.extras.length > 0
                            ? item.price - item.extras.reduce((s, e) => s + (e.price ?? 0), 0)
                            : item.price} ج.م
                        </span>
                      </div>
                      {item.extras.length > 0 && (
                        <div className="flex flex-col gap-0.5 pr-8">
                          {item.extras.map((e, j) => (
                            <span key={j} className="text-[11px]" style={{ color: C.muted }}>
                              + {e.name} <span style={{ color: C.yellow }}>(+{e.price}ج)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 2.5: الملاحظات ── */}
            {!modalLoading && !modalError && selectedOrderModal.notes && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div
                  className="rounded-xl px-3 py-2.5 flex gap-2"
                  style={{ background: `${C.yellow}0f`, border: `1px solid ${C.yellow}33` }}
                >
                  <span className="text-sm flex-shrink-0">📝</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold" style={{ color: C.yellow }}>ملاحظات</p>
                    <p className="text-xs" style={{ color: C.text }}>{selectedOrderModal.notes}</p>
                  </div>
                </div>
              </>
            )}

            {/* ── Section 3: الحساب ── */}
            {!modalLoading && !modalError && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div className="flex flex-col gap-2">
                  {selectedOrderModal.subtotal != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: C.muted }}>قيمة الطلب للمطعم</span>
                      <span style={{ color: C.text }}>{selectedOrderModal.subtotal} ج.م</span>
                    </div>
                  )}
                  {selectedOrderModal.delivery_fee != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: C.muted }}>رسوم التوصيل</span>
                      <span style={{ color: C.text }}>{selectedOrderModal.delivery_fee} ج.م</span>
                    </div>
                  )}
                  <div
                    className="flex items-center justify-between pt-2 mt-0.5"
                    style={{ borderTop: `1px solid ${C.border}` }}
                  >
                    <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
                    <span className="text-lg font-black" style={{ color: C.green }}>
                      {selectedOrderModal.total} ج.م
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ── Section 4: أزرار التحكم (فقط للطلبات الجديدة) ── */}
            {selectedOrderModal.status === "new" &&
              newOrdersList.some((o) => o.id === selectedOrderModal.id) && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const o = newOrdersList.find((ord) => ord.id === selectedOrderModal.id);
                      if (o) sendToRestaurant(o);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}55` }}
                  >
                    <span>📲</span> إرسال للمطعم
                  </button>
                  <button
                    onClick={() => { confirmOrder(selectedOrderModal.id); closeModal(); }}
                    disabled={confirmingId === selectedOrderModal.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px] disabled:opacity-60 transition-opacity"
                    style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}
                  >
                    <span>✅</span>
                    {confirmingId === selectedOrderModal.id ? "جارٍ التأكيد..." : "تأكيد الطلب"}
                  </button>
                  <button
                    onClick={() => { cancelOrder(selectedOrderModal.id); closeModal(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[80px]"
                    style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55` }}
                  >
                    <span>✕</span> إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
