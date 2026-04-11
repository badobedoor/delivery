/* ── ألوان ── */
const C = {
  card:  "#1E293B",
  teal:  "#14B8A6",
  text:  "#F1F5F9",
  muted: "#94A3B8",
  border:"#334155",
  green: "#22C55E",
  yellow:"#EAB308",
  red:   "#EF4444",
};

/* ── بيانات وهمية ── */
const stats = [
  { emoji: "📦", label: "طلبات اليوم",   value: "47"        },
  { emoji: "💰", label: "إيرادات اليوم", value: "3,240 ج.م" },
  { emoji: "⏳", label: "قيد التنفيذ",   value: "8"         },
  { emoji: "👥", label: "عملاء جدد",     value: "12"        },
];

const orders = [
  { id: "#1047", client: "أحمد محمد",   restaurant: "بيت البرجر",   total: "138 ج.م", status: "تم التوصيل",  time: "٢:٣٠ م" },
  { id: "#1046", client: "سارة علي",    restaurant: "ليالي بيتزا",  total: "95 ج.م",  status: "قيد التنفيذ", time: "٢:١٥ م" },
  { id: "#1045", client: "محمود خالد",  restaurant: "شاورما الشام", total: "112 ج.م", status: "تم التوصيل",  time: "١:٥٠ م" },
  { id: "#1044", client: "نور حسن",     restaurant: "كشري التحرير", total: "43 ج.م",  status: "ملغي",         time: "١:٣٠ م" },
  { id: "#1043", client: "عمر إبراهيم", restaurant: "سوشي تايم",   total: "220 ج.م", status: "قيد التنفيذ", time: "١:١٠ م" },
];

const weeklyData = [
  { day: "الأحد",    value: 1800 },
  { day: "الاثنين",  value: 2400 },
  { day: "الثلاثاء", value: 1600 },
  { day: "الأربعاء", value: 3100 },
  { day: "الخميس",   value: 2750 },
  { day: "الجمعة",   value: 3240 },
  { day: "السبت",    value: 2900 },
];

const topRestaurants = [
  { name: "بيت البرجر",   orders: 128 },
  { name: "ليالي بيتزا",  orders: 97  },
  { name: "شاورما الشام", orders: 84  },
];

const topAreas = [
  { name: "المعادي",      orders: 142 },
  { name: "مصر الجديدة", orders: 108 },
  { name: "الزمالك",     orders: 76  },
];

const maxWeekly = Math.max(...weeklyData.map((d) => d.value));

function statusStyle(status: string): React.CSSProperties {
  if (status === "تم التوصيل")  return { background: `${C.green}22`,  color: C.green  };
  if (status === "قيد التنفيذ") return { background: `${C.yellow}22`, color: C.yellow };
  return                                { background: `${C.red}22`,    color: C.red    };
}

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-2xl font-black" style={{ color: C.teal }}>{s.value}</p>
            <p className="text-sm" style={{ color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── 2. Latest Orders Table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-sm font-black" style={{ color: C.text }}>آخر الطلبات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["#", "العميل", "المطعم", "الإجمالي", "الحالة", "الوقت"].map((col, i) => (
                  <th
                    key={col}
                    className={`px-2 py-2 lg:px-4 lg:py-3 text-right font-semibold text-[10px] lg:text-xs${i === 2 ? " hidden sm:table-cell" : ""}`}
                    style={{ color: C.muted }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={order.id}
                  style={{ borderBottom: i < orders.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-2 py-2 lg:px-4 lg:py-3 font-bold text-[10px] lg:text-sm whitespace-nowrap"
                    style={{ color: C.teal }}>{order.id}</td>
                  <td className="px-2 py-2 lg:px-4 lg:py-3 text-[10px] lg:text-sm whitespace-nowrap"
                    style={{ color: C.text }}>{order.client}</td>
                  <td className="hidden sm:table-cell px-2 py-2 lg:px-4 lg:py-3 text-[10px] lg:text-sm whitespace-nowrap"
                    style={{ color: C.muted }}>{order.restaurant}</td>
                  <td className="px-2 py-2 lg:px-4 lg:py-3 font-semibold text-[10px] lg:text-sm whitespace-nowrap"
                    style={{ color: C.text }}>{order.total}</td>
                  <td className="px-2 py-2 lg:px-4 lg:py-3">
                    <span
                      className="px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[9px] lg:text-xs font-bold whitespace-nowrap inline-block"
                      style={statusStyle(order.status)}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 lg:px-4 lg:py-3 text-[10px] lg:text-sm whitespace-nowrap"
                    style={{ color: C.muted }}>{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Chart + Side Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <h2 className="text-base font-black mb-6" style={{ color: C.text }}>
            إيرادات الأسبوع
          </h2>
          <div className="flex items-end justify-between gap-2 h-40">
            {weeklyData.map((d) => {
              const pct = (d.value / maxWeekly) * 100;
              const isToday = d.day === "الجمعة";
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: C.muted }}>
                    {(d.value / 1000).toFixed(1)}k
                  </span>
                  <div className="w-full rounded-t-lg"
                    style={{
                      height:     `${pct}%`,
                      minHeight:  "8px",
                      background: isToday ? C.teal : `${C.teal}40`,
                    }}
                  />
                  <span className="text-xs" style={{ color: isToday ? C.teal : C.muted }}>
                    {d.day.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side cards */}
        <div className="flex flex-col gap-4">

          {/* أكثر المطاعم طلباً */}
          <div className="rounded-2xl p-4 flex-1"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <h2 className="text-sm font-black mb-3" style={{ color: C.text }}>
              أكثر المطاعم طلباً 🍔
            </h2>
            <div className="flex flex-col gap-3">
              {topRestaurants.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black w-4 text-center"
                      style={{ color: C.teal }}>{i + 1}</span>
                    <span className="text-sm" style={{ color: C.text }}>{r.name}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${C.teal}20`, color: C.teal }}>
                    {r.orders} طلب
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* أكثر الأحياء طلباً */}
          <div className="rounded-2xl p-4 flex-1"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <h2 className="text-sm font-black mb-3" style={{ color: C.text }}>
              أكثر الأحياء طلباً 🗺️
            </h2>
            <div className="flex flex-col gap-3">
              {topAreas.map((a, i) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black w-4 text-center"
                      style={{ color: C.teal }}>{i + 1}</span>
                    <span className="text-sm" style={{ color: C.text }}>{a.name}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${C.teal}20`, color: C.teal }}>
                    {a.orders} طلب
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
