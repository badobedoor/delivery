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
  notes: string | null;
  user_order_number: number | null;
  created_at: string;
  restaurant_id: string | null;
  restaurants: { name: string } | null;
  addresses: { full_address: string | null; areas: { name: string } | null } | null;
  order_items: { quantity: number; menu_items: { name: string; price_at_order: number } | null }[];
  users: { name: string | null; phone: string | null } | null;
};

type DBOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  user_order_number: number | null;
  restaurants: { name: string } | null;
  addresses: { areas: { name: string } | null } | null;
  users: { name: string | null; phone: string | null } | null;
  delivery_staff: { name: string | null } | null;
};

/* ── Status helpers ── */
const STATUS_AR: Record<string, string> = {
  pending:    "قيد التنفيذ",
  on_the_way: "في الطريق",
  delivered:  "تم التوصيل",
  cancelled:  "ملغي",
};

function statusColor(s: string) {
  if (s === "delivered"  || s === "تم التوصيل")  return { bg: `${C.green}22`,  color: C.green  };
  if (s === "on_the_way" || s === "في الطريق")   return { bg: `${C.blue}22`,   color: C.blue   };
  if (s === "pending"    || s === "قيد التنفيذ") return { bg: `${C.yellow}22`, color: C.yellow };
  return                                                  { bg: `${C.red}22`,    color: C.red    };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
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

  async function loadData() {
    const { data: newOrdersData, error: e1 } = await supabase
      .from("orders")
      .select(`
        id, total, notes, user_order_number, created_at, restaurant_id,
        restaurants!restaurant_id (name),
        addresses!address_id (full_address, areas(name)),
        order_items (quantity, menu_items(name))
      `)
      .eq("status", "new")
      .order("created_at", { ascending: false });

    console.log("New Orders Error:", e1);
    console.log("New Orders:", newOrdersData);

    const { data: allOrdersData, error: e2 } = await supabase
      .from("orders")
      .select(`
        id, total, status, created_at, user_order_number, user_id, delivery_id,
        restaurants!restaurant_id (name),
        addresses!address_id (areas(name))
      `)
      .neq("status", "new")
      .order("created_at", { ascending: false });

    console.log("All Orders Error:", e2);
    console.log("All Orders:", allOrdersData);

    setNewOrdersList((newOrdersData as DBNewOrder[]) ?? []);
    setAllOrdersList((allOrdersData as DBOrder[]) ?? []);
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

    const itemsText = (order.order_items as any[])
      .map((i: any) => `• ${i.menu_items?.name} ×${i.quantity}`)
      .join("\n");

    const msg = encodeURIComponent(
      `🛵 طلب جديد من حالا\n` +
      `رقم الطلب: #${order.user_order_number}\n\n` +
      `الأصناف:\n${itemsText}\n\n` +
      (order.notes ? `📝 ملاحظات: ${order.notes}\n\n` : "") +
      `يرجى الرد لتأكيد استلام الطلب 🙏`
    );

    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  async function confirmOrder(orderId: string) {
    await supabase.from("orders").update({ status: "pending" }).eq("id", orderId);
    await loadData();
  }

  async function cancelOrder(orderId: string) {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    await loadData();
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
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
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
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span style={{ color: C.text }}>
                          {item.menu_items?.name ?? "—"}{" "}
                          <span style={{ color: C.muted }}>×{item.quantity}</span>
                        </span>
                        <span style={{ color: C.muted }}>
                          {item.menu_items?.price_at_order ?? 0} ج.م
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => sendToRestaurant(order)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}55` }}
                    >
                      <span>📲</span> إرسال للمطعم
                    </button>
                    <button
                      onClick={() => confirmOrder(order.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px]"
                      style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}
                    >
                      <span>✅</span> تأكيد الطلب
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
                      style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
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

    </div>
  );
}
