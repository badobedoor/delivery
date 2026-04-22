"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
  yellow: "#EAB308",
};

type Shift = {
  id:        number;
  num:       number;
  startTime: string;
  endTime:   string;
  isActive:  boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Shift {
  return { id: r.id, num: r.num, startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5), isActive: r.is_active };
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* Returns true if point falls inside [start, end) on a 24h circle */
function inRange(start: string, end: string, point: string): boolean {
  const s = toMinutes(start), e = toMinutes(end), p = toMinutes(point);
  return s < e ? p >= s && p < e : p >= s || p < e;
}

/* Two shifts overlap when either start point falls inside the other's range */
function shiftsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return inRange(s1, e1, s2) || inRange(s2, e2, s1);
}

function isActiveShift(startTime: string, endTime: string, now: Date): boolean {
  const cur   = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(startTime);
  const end   = toMinutes(endTime);
  /* overnight shift: end < start (e.g. 23:00 → 07:00) */
  return start < end
    ? cur >= start && cur < end
    : cur >= start || cur < end;
}

const emptyForm = { startTime: "07:00", endTime: "15:00" };

export default function AdminShiftsPage() {
  const [rows,    setRows]    = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [delId,   setDelId]   = useState<number | null>(null);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState(emptyForm);
  const [toggleErr,  setToggleErr]  = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  /* live clock — re-evaluates active shift every minute */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch ── */
  useEffect(() => { fetchShifts(); }, []);

  async function fetchShifts() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("shifts")
      .select("id, num, start_time, end_time, is_active")
      .order("num");
    if (error) setError("تعذّر تحميل الورديات");
    else setRows((data ?? []).map(fromRow));
    setLoading(false);
  }

  /* ── Add ── */
  function openModal() { setForm(emptyForm); setFormErr(null); setModal(true); }

  async function handleSave() {
    if (!form.startTime || !form.endTime) {
      setFormErr("وقت البداية والنهاية مطلوبان"); return;
    }
    if (form.startTime === form.endTime) {
      setFormErr("وقت البداية والنهاية لا يمكن أن يكونا متساويين"); return;
    }
    const conflict = rows.filter((r) => r.isActive).find((r) => shiftsOverlap(form.startTime, form.endTime, r.startTime, r.endTime));
    if (conflict) {
      setFormErr(`الوردية تتداخل مع وردية ${conflict.num}`); return;
    }
    setSaving(true);
    setFormErr(null);
    const nextNum = rows.length + 1;
    const { data, error } = await supabase
      .from("shifts")
      .insert({ num: nextNum, start_time: `${form.startTime}:00`, end_time: `${form.endTime}:00` })
      .select("id, num, start_time, end_time, is_active")
      .single();
    if (error) { setFormErr("فشل الحفظ، حاول مرة أخرى"); setSaving(false); return; }
    setRows((p) => [...p, fromRow(data)]);
    setSaving(false);
    setModal(false);
  }

  /* ── Toggle active ── */
  async function handleToggle(s: Shift) {
    const next = !s.isActive;
    setToggleErr(null);
    if (next) {
      const conflict = rows.find((r) => r.id !== s.id && r.isActive && shiftsOverlap(s.startTime, s.endTime, r.startTime, r.endTime));
      if (conflict) { setToggleErr("لا يمكن تشغيل وردية متداخلة مع وردية نشطة"); return; }
    }
    setDelId(s.id);
    setRows((p) => p.map((r) => r.id === s.id ? { ...r, isActive: next } : r));
    const { error } = await supabase.from("shifts").update({ is_active: next }).eq("id", s.id);
    if (error) setRows((p) => p.map((r) => r.id === s.id ? { ...r, isActive: s.isActive } : r));
    setDelId(null);
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* ── Toggle error ── */}
        {toggleErr && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: `${C.red}22`, color: C.red }}>
            {toggleErr}
          </div>
        )}

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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      جاري التحميل...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.red }}>
                      {error}
                      <button onClick={fetchShifts} className="mr-2 underline" style={{ color: C.teal }}>
                        إعادة المحاولة
                      </button>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد ورديات
                    </td>
                  </tr>
                ) : rows.map((s, i) => {
                  const timeActive = isActiveShift(s.startTime, s.endTime, now);
                  const active     = s.isActive && timeActive;
                  const isToggling = delId === s.id;
                  return (
                    <tr key={s.id}
                      style={{
                        borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
                        background:   active ? `${C.green}0a` : "transparent",
                        opacity:      s.isActive ? 1 : 0.5,
                        transition:   "background 0.3s, opacity 0.3s",
                      }}>

                      {/* رقم الوردية */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-black px-2.5 py-1 rounded-full"
                          style={{
                            background: active ? `${C.green}25` : `${C.teal}20`,
                            color:      active ? C.green : C.teal,
                          }}>
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
                        {!s.isActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                            style={{ background: `${C.border}55`, color: C.muted }}>
                            غير نشط
                          </span>
                        ) : active ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap flex items-center gap-1 w-fit"
                            style={{ background: `${C.green}22`, color: C.green }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: C.green }} />
                            الوردية الحالية
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                            style={{ background: `${C.green}22`, color: C.green }}>
                            نشط
                          </span>
                        )}
                      </td>

                      {/* إجراءات */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={isToggling}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap disabled:opacity-40"
                          style={{
                            background: s.isActive ? `${C.red}22`  : `${C.green}22`,
                            color:      s.isActive ? C.red         : C.green,
                          }}
                        >
                          {isToggling ? "..." : s.isActive ? "إيقاف" : "تشغيل"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {loading ? "..." : `${rows.length} وردية`}
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

              {formErr && (
                <p className="text-xs font-semibold text-center py-1.5 rounded-lg"
                  style={{ background: `${C.red}22`, color: C.red }}>
                  {formErr}
                </p>
              )}

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
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: C.orange, color: "#fff" }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={() => setModal(false)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
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
