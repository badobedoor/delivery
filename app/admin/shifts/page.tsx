"use client";

import { useState } from "react";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  red:    "#EF4444",
  orange: "#F97316",
};

const driverOptions = [
  "كريم سعد",
  "مصطفى علي",
  "عمر حسين",
  "يوسف أحمد",
  "إبراهيم رضا",
  "محمد الشيمي",
  "أحمد فؤاد",
];

const motoOptions = [
  "ياماها ٢٠٢٣ - XR150",
  "هوندا ٢٠٢٢ - CB125",
  "سوزوكي ٢٠٢٣ - GD110",
  "كيمكو ٢٠٢١ - Super 8",
  "TVS ٢٠٢٢ - Metro 110",
  "باجاج ٢٠٢٣ - Boxer 150",
];

type ShiftStatus = "نشطة" | "منتهية";

type Shift = {
  id: number;
  driver: string;
  moto: string;
  startTime: string;
  status: ShiftStatus;
};

const seedShifts: Shift[] = [
  { id: 1, driver: "كريم سعد",    moto: "ياماها ٢٠٢٣ - XR150",  startTime: "09:00", status: "نشطة"   },
  { id: 2, driver: "مصطفى علي",   moto: "هوندا ٢٠٢٢ - CB125",   startTime: "10:30", status: "نشطة"   },
  { id: 3, driver: "عمر حسين",    moto: "سوزوكي ٢٠٢٣ - GD110",  startTime: "12:00", status: "نشطة"   },
  { id: 4, driver: "يوسف أحمد",   moto: "كيمكو ٢٠٢١ - Super 8", startTime: "08:00", status: "منتهية" },
  { id: 5, driver: "إبراهيم رضا", moto: "TVS ٢٠٢٢ - Metro 110", startTime: "07:00", status: "منتهية" },
];

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

const emptyForm = { driver: "", moto: "", startTime: "09:00" };

export default function AdminShiftsPage() {
  const [rows,   setRows]   = useState<Shift[]>(seedShifts);
  const [search, setSearch] = useState("");
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(emptyForm);
  const [endId,  setEndId]  = useState<number | null>(null);

  const filtered = rows.filter(
    (r) => !search.trim() || r.driver.includes(search) || r.moto.includes(search)
  );

  const activeCount  = rows.filter((r) => r.status === "نشطة").length;
  const endedCount   = rows.filter((r) => r.status === "منتهية").length;

  function openModal() {
    setForm(emptyForm);
    setModal(true);
  }

  function handleSave() {
    if (!form.driver || !form.moto) return;
    const next: Shift = {
      id:        Date.now(),
      driver:    form.driver,
      moto:      form.moto,
      startTime: form.startTime,
      status:    "نشطة",
    };
    setRows((prev) => [next, ...prev]);
    setModal(false);
  }

  function endShift(id: number) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "منتهية" } : r));
    setEndId(null);
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي الورديات", value: rows.length,   color: C.teal  },
            { label: "نشطة الآن",       value: activeCount,   color: C.green },
            { label: "منتهية",          value: endedCount,    color: C.muted },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: C.muted }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن وردية..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
            )}
          </div>

          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة وردية</span>
          </button>
        </div>

        {/* ── Table ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["الدلفري", "الموتسكل", "وقت البداية", "الحالة", "إجراءات"].map((col, i) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${
                        i === 1 ? " hidden sm:table-cell" :
                        i === 2 ? " hidden md:table-cell" : ""
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
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد ورديات مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => {
                    const active = s.status === "نشطة";
                    return (
                      <tr key={s.id}
                        style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                        {/* الدلفري */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                              style={{ background: `${C.teal}30`, color: C.teal }}>
                              {s.driver[0]}
                            </div>
                            <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>
                              {s.driver}
                            </p>
                          </div>
                        </td>

                        {/* الموتسكل */}
                        <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap"
                          style={{ color: C.muted }}>
                          🛵 {s.moto}
                        </td>

                        {/* وقت البداية */}
                        <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap"
                          style={{ color: C.muted }}>
                          🕐 {fmt(s.startTime)}
                        </td>

                        {/* الحالة */}
                        <td className="px-4 py-3">
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                            style={{
                              background: active ? `${C.green}22` : `${C.border}`,
                              color:      active ? C.green : C.muted,
                            }}
                          >
                            {s.status}
                          </span>
                        </td>

                        {/* إجراءات */}
                        <td className="px-4 py-3">
                          {active ? (
                            <button
                              onClick={() => setEndId(s.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
                              style={{ background: `${C.red}22`, color: C.red }}
                            >
                              إنهاء الوردية
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: C.muted }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} وردية
          </div>
        </div>

      </div>

      {/* ── Add Shift Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl flex flex-col"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>إضافة وردية جديدة</h2>
              <button onClick={() => setModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">

              {/* اختار الدلفري */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  اختار الدلفري <span style={{ color: C.red }}>*</span>
                </label>
                <select
                  value={form.driver}
                  onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background:  C.bg,
                    border:      `1px solid ${C.border}`,
                    color:       form.driver ? C.text : C.muted,
                    colorScheme: "dark",
                  }}
                >
                  <option value="" disabled>اختار سائق...</option>
                  {driverOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* اختار الموتسكل */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  اختار الموتسكل <span style={{ color: C.red }}>*</span>
                </label>
                <select
                  value={form.moto}
                  onChange={(e) => setForm({ ...form, moto: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background:  C.bg,
                    border:      `1px solid ${C.border}`,
                    color:       form.moto ? C.text : C.muted,
                    colorScheme: "dark",
                  }}
                >
                  <option value="" disabled>اختار موتسكل...</option>
                  {motoOptions.map((m) => (
                    <option key={m} value={m}>🛵 {m}</option>
                  ))}
                </select>
              </div>

              {/* وقت البداية */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>وقت البداية</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background:  C.bg,
                    border:      `1px solid ${C.border}`,
                    color:       C.text,
                    colorScheme: "dark",
                  }}
                />
              </div>

            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.orange, color: "#fff" }}>
                حفظ
              </button>
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── End Shift Confirm Modal ── */}
      {endId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEndId(null); }}
        >
          <div className="w-full max-w-xs rounded-2xl flex flex-col"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🕐</span>
              <p className="text-base font-black" style={{ color: C.text }}>إنهاء الوردية؟</p>
              <p className="text-sm" style={{ color: C.muted }}>
                هل أنت متأكد من إنهاء وردية هذا السائق؟
              </p>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={() => endShift(endId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.red, color: "#fff" }}>
                إنهاء
              </button>
              <button onClick={() => setEndId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
