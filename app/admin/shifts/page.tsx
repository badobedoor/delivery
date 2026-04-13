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


type Shift = {
  id:        number;
  num:       number;   /* 1, 2, 3 */
  startTime: string;
  endTime:   string;
};

const seedShifts: Shift[] = [
  { id: 1, num: 1, startTime: "07:00", endTime: "15:00" },
  { id: 2, num: 2, startTime: "15:00", endTime: "23:00" },
  { id: 3, num: 3, startTime: "23:00", endTime: "07:00" },
];

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

const emptyForm = { startTime: "07:00", endTime: "15:00" };

export default function AdminShiftsPage() {
  const [rows,  setRows]  = useState<Shift[]>(seedShifts);
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState(emptyForm);

  function openModal() { setForm(emptyForm); setModal(true); }

  function handleSave() {
    const nextNum = rows.length + 1;
    const next: Shift = {
      id:        Date.now(),
      num:       nextNum,
      startTime: form.startTime,
      endTime:   form.endTime,
    };
    setRows((prev) => [...prev, next]);
    setModal(false);
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* ── Top bar ── */}
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm font-bold" style={{ color: C.muted }}>تشغيل الوردية الحالية</p>
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
                  {[
                    { label: "رقم الوردية",  hide: ""                      },
                    { label: "وقت البداية",  hide: " hidden sm:table-cell" },
                    { label: "وقت النهاية",  hide: " hidden sm:table-cell" },
                    { label: "الحالة",        hide: ""                      },
                    { label: "إجراءات",       hide: ""                      },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد ورديات
                    </td>
                  </tr>
                ) : rows.map((s, i) => (
                  <tr key={s.id}
                    style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>

                    {/* رقم الوردية */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-black px-2.5 py-1 rounded-full"
                        style={{ background: `${C.teal}20`, color: C.teal }}>
                        وردية {s.num}
                      </span>
                    </td>

                    {/* وقت البداية */}
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      🕐 {fmt(s.startTime)}
                    </td>

                    {/* وقت النهاية */}
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      🕑 {fmt(s.endTime)}
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: `${C.green}22`, color: C.green }}>
                        الوردية الحالية {s.num}
                      </span>
                    </td>

                    {/* إجراءات */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setRows((p) => p.filter((r) => r.id !== s.id))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
                        style={{ background: `${C.red}22`, color: C.red }}
                      >
                        إنهاء
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {rows.length} وردية اليوم
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

              {/* الأوقات */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>وقت البداية</label>
                  <input type="time" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>وقت النهاية</label>
                  <input type="time" value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }} />
                </div>
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
    </>
  );
}
