"use client";

import { useState } from "react";

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

type Status = "تم التوصيل" | "في الطريق" | "قيد التنفيذ" | "ملغي";

/* ── Dummy: new orders waiting action ── */
const newOrders = [
  {
    id: "#1049",
    client: "يوسف الشريف",
    phone: "0111-555-7890",
    restaurant: "بيت البرجر",
    area: "المعادي",
    total: "162 ج.م",
    items: [
      { name: "برجر دبل تشيز", qty: 2, price: "58 ج.م" },
      { name: "بطاطس كبيرة",   qty: 1, price: "28 ج.م" },
      { name: "كولا",           qty: 2, price: "18 ج.م" },
    ],
    time: "٣:١٠ م",
    notes: "بدون بصل من فضلك",
  },
  {
    id: "#1048",
    client: "فاطمة الزهراء",
    phone: "0122-444-6789",
    restaurant: "ليالي بيتزا",
    area: "الزمالك",
    total: "215 ج.م",
    items: [
      { name: "بيتزا مارغريتا L", qty: 1, price: "120 ج.م" },
      { name: "باستا كريمة",      qty: 1, price: "75 ج.م" },
      { name: "عصير برتقال",      qty: 2, price: "20 ج.م" },
    ],
    time: "٣:٠٥ م",
    notes: "",
  },
];

/* ── Existing orders ── */
const allOrders: {
  id: string; client: string; phone: string; restaurant: string;
  area: string; driver: string; total: string; items: number;
  status: Status; time: string; date: string;
}[] = [
  { id: "#1047", client: "أحمد محمد",   phone: "0100-123-4567", restaurant: "بيت البرجر",   area: "المعادي",     driver: "كريم سعد",   total: "138 ج.م", items: 3, status: "تم التوصيل",  time: "٢:٣٠ م",  date: "١١ أبريل" },
  { id: "#1046", client: "سارة علي",     phone: "0101-234-5678", restaurant: "ليالي بيتزا",  area: "الزمالك",     driver: "مصطفى علي",  total: "95 ج.م",  items: 2, status: "في الطريق",   time: "٢:١٥ م",  date: "١١ أبريل" },
  { id: "#1045", client: "محمود خالد",   phone: "0102-345-6789", restaurant: "شاورما الشام", area: "مصر الجديدة", driver: "عمر حسين",   total: "112 ج.م", items: 4, status: "تم التوصيل",  time: "١:٥٠ م",  date: "١١ أبريل" },
  { id: "#1044", client: "نور حسن",      phone: "0103-456-7890", restaurant: "كشري التحرير", area: "وسط البلد",   driver: "—",          total: "43 ج.م",  items: 1, status: "ملغي",        time: "١:٣٠ م",  date: "١١ أبريل" },
  { id: "#1043", client: "عمر إبراهيم",  phone: "0104-567-8901", restaurant: "سوشي تايم",   area: "الدقي",       driver: "يوسف أحمد",  total: "220 ج.م", items: 5, status: "قيد التنفيذ", time: "١:١٠ م",  date: "١١ أبريل" },
  { id: "#1042", client: "ريم عبدالله",  phone: "0105-678-9012", restaurant: "بيت البرجر",   area: "المعادي",     driver: "كريم سعد",   total: "76 ج.م",  items: 2, status: "تم التوصيل",  time: "١٢:٤٥ م", date: "١١ أبريل" },
  { id: "#1041", client: "خالد منصور",   phone: "0106-789-0123", restaurant: "ليالي بيتزا",  area: "مدينة نصر",  driver: "مصطفى علي",  total: "185 ج.م", items: 3, status: "تم التوصيل",  time: "١٢:٢٠ م", date: "١١ أبريل" },
  { id: "#1040", client: "هدى يوسف",     phone: "0107-890-1234", restaurant: "حلويات النصر", area: "الزيتون",     driver: "عمر حسين",   total: "62 ج.م",  items: 2, status: "في الطريق",   time: "١٢:٠٠ م", date: "١١ أبريل" },
  { id: "#1039", client: "تامر فريد",    phone: "0108-901-2345", restaurant: "كريب هاوس",   area: "الدقي",       driver: "يوسف أحمد",  total: "89 ج.م",  items: 3, status: "قيد التنفيذ", time: "١١:٤٠ ص", date: "١١ أبريل" },
  { id: "#1038", client: "منى السيد",    phone: "0109-012-3456", restaurant: "شاورما الشام", area: "الزمالك",     driver: "—",          total: "54 ج.م",  items: 1, status: "ملغي",        time: "١١:١٥ ص", date: "١١ أبريل" },
  { id: "#1037", client: "إسلام رضا",    phone: "0110-123-4567", restaurant: "كشري التحرير", area: "وسط البلد",   driver: "كريم سعد",   total: "38 ج.م",  items: 1, status: "تم التوصيل",  time: "١٠:٥٠ ص", date: "١١ أبريل" },
  { id: "#1036", client: "دينا مصطفى",   phone: "0111-234-5678", restaurant: "سوشي تايم",   area: "مصر الجديدة", driver: "مصطفى علي",  total: "310 ج.م", items: 6, status: "تم التوصيل",  time: "١٠:٣٠ ص", date: "١٠ أبريل" },
  { id: "#1035", client: "يحيى شحاتة",   phone: "0112-345-6789", restaurant: "بيت البرجر",   area: "المعادي",     driver: "عمر حسين",   total: "142 ج.م", items: 3, status: "تم التوصيل",  time: "٩:٤٥ ص",  date: "١٠ أبريل" },
  { id: "#1034", client: "لمياء عمر",    phone: "0113-456-7890", restaurant: "ليالي بيتزا",  area: "الزيتون",     driver: "يوسف أحمد",  total: "97 ج.م",  items: 2, status: "تم التوصيل",  time: "٩:٢٠ ص",  date: "١٠ أبريل" },
  { id: "#1033", client: "ماجد حمدي",    phone: "0114-567-8901", restaurant: "حلويات النصر", area: "مدينة نصر",  driver: "كريم سعد",   total: "74 ج.م",  items: 2, status: "تم التوصيل",  time: "٨:٥٠ ص",  date: "١٠ أبريل" },
];

const tabs: { label: string; value: Status | "الكل" }[] = [
  { label: "الكل",         value: "الكل"         },
  { label: "قيد التنفيذ", value: "قيد التنفيذ"  },
  { label: "في الطريق",   value: "في الطريق"    },
  { label: "تم التوصيل",  value: "تم التوصيل"   },
  { label: "ملغي",         value: "ملغي"         },
];

function statusColor(s: Status) {
  if (s === "تم التوصيل")  return { bg: `${C.green}22`,  color: C.green  };
  if (s === "في الطريق")   return { bg: `${C.blue}22`,   color: C.blue   };
  if (s === "قيد التنفيذ") return { bg: `${C.yellow}22`, color: C.yellow };
  return                           { bg: `${C.red}22`,    color: C.red    };
}

const countByStatus = (s: Status | "الكل") =>
  s === "الكل" ? allOrders.length : allOrders.filter((o) => o.status === s).length;

function buildWhatsApp(order: typeof newOrders[number]) {
  const itemsText = order.items.map((i) => `  • ${i.name} ×${i.qty} — ${i.price}`).join("\n");
  const msg = encodeURIComponent(
    `🛵 طلب جديد ${order.id}\n` +
    `👤 العميل: ${order.client} — ${order.phone}\n` +
    `📍 المنطقة: ${order.area}\n\n` +
    `الأصناف:\n${itemsText}\n\n` +
    `💰 الإجمالي: ${order.total}` +
    (order.notes ? `\n📝 ملاحظات: ${order.notes}` : "")
  );
  return `https://wa.me/?text=${msg}`;
}

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab]         = useState<Status | "الكل">("الكل");
  const [search, setSearch]               = useState("");
  const [pendingNew, setPendingNew]       = useState(newOrders.map((o) => o.id));

  const visibleNew = newOrders.filter((o) => pendingNew.includes(o.id));

  const confirmOrder = (id: string) => setPendingNew((p) => p.filter((x) => x !== id));
  const cancelOrder  = (id: string) => setPendingNew((p) => p.filter((x) => x !== id));

  const filtered = allOrders.filter((o) => {
    const matchTab    = activeTab === "الكل" || o.status === activeTab;
    const q           = search.trim();
    const matchSearch = !q || o.id.includes(q) || o.client.includes(q) || o.restaurant.includes(q);
    return matchTab && matchSearch;
  });

  /* Arabic date */
  const arabicDate = new Date().toLocaleDateString("ar-EG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="flex flex-col gap-5" dir="rtl">

      {/* ── Top info bar ── */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        {/* Right: date */}
        <div className="flex items-center gap-2">
          <span style={{ color: C.teal, fontSize: 16 }}>📅</span>
          <span className="text-sm font-semibold" style={{ color: C.text }}>{arabicDate}</span>
        </div>

        {/* Center: shift */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: `${C.teal}18`, border: `1px solid ${C.teal}44` }}
        >
          <span style={{ color: C.teal, fontSize: 14 }}>🕐</span>
          <span className="text-sm font-bold" style={{ color: C.teal }}>
            الوردية الأولى — صباحية
          </span>
        </div>

        {/* Left: user */}
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
          { label: "جديد",         value: visibleNew.length,              color: C.orange, icon: "🆕" },
          { label: "قيد التنفيذ", value: countByStatus("قيد التنفيذ"),   color: C.yellow, icon: "⏳" },
          { label: "في الطريق",   value: 3,                               color: C.blue,   icon: "🚀" },
          { label: "تم التوصيل",  value: countByStatus("تم التوصيل"),    color: C.green,  icon: "✅" },
          { label: "ملغي",         value: countByStatus("ملغي"),          color: C.red,    icon: "❌" },
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
          {/* Pulsing dot */}
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
            {visibleNew.length}
          </span>
        </div>

        {/* Cards */}
        <div className="p-4">
          {visibleNew.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <span style={{ fontSize: 36 }}>🎉</span>
              <p className="text-sm" style={{ color: C.muted }}>لا يوجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleNew.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: C.teal }}>{order.id}</span>
                        <span className="text-sm font-bold" style={{ color: C.text }}>{order.client}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                        <span>🍽 {order.restaurant}</span>
                        <span>•</span>
                        <span>📍 {order.area}</span>
                        <span>•</span>
                        <span>🕐 {order.time}</span>
                      </div>
                      {order.notes && (
                        <p className="text-xs mt-0.5" style={{ color: C.yellow }}>
                          📝 {order.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-black" style={{ color: C.green }}>{order.total}</span>
                  </div>

                  {/* Items */}
                  <div
                    className="rounded-lg px-3 py-2 flex flex-col gap-1"
                    style={{ background: C.bg }}
                  >
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span style={{ color: C.text }}>{item.name} <span style={{ color: C.muted }}>×{item.qty}</span></span>
                        <span style={{ color: C.muted }}>{item.price}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={buildWhatsApp(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px]"
                      style={{ background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}55` }}
                    >
                      <span>📲</span> إرسال للمطعم
                    </a>
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
                        {order.id}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.text }}>
                        <p className="font-semibold">{order.client}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{order.phone}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.restaurant}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.area}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {order.driver}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-xs text-center" style={{ color: C.muted }}>
                        {order.items}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: C.text }}>
                        {order.total}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] whitespace-nowrap" style={{ color: C.muted }}>
                        <p>{order.time}</p>
                        <p style={{ color: C.border }}>{order.date}</p>
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
          عرض {filtered.length} من {allOrders.length} طلب
        </div>
      </div>

    </div>
  );
}
