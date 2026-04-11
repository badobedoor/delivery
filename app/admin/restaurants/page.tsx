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

type Restaurant = {
  id: number;
  name: string;
  desc: string;
  phone: string;
  opens: string;
  closes: string;
  rating: number;
  active: boolean;
};

const seed: Restaurant[] = [
  { id: 1, name: "بيت البرجر",   desc: "أشهى البرجر الأمريكي بأفضل المكونات الطازجة",   phone: "0100-111-2233", opens: "10:00", closes: "00:00", rating: 4.8, active: true  },
  { id: 2, name: "ليالي بيتزا",  desc: "بيتزا إيطالية أصيلة بعجينة رقيقة مقرمشة",      phone: "0101-222-3344", opens: "12:00", closes: "01:00", rating: 4.6, active: true  },
  { id: 3, name: "شاورما الشام", desc: "شاورما لحم ودجاج بالطريقة الشامية الأصيلة",     phone: "0102-333-4455", opens: "09:00", closes: "23:00", rating: 4.5, active: true  },
  { id: 4, name: "كشري التحرير", desc: "كشري مصري أصيل بأفضل الأسعار في القاهرة",      phone: "0103-444-5566", opens: "08:00", closes: "22:00", rating: 4.3, active: false },
  { id: 5, name: "سوشي تايم",   desc: "سوشي ياباني طازج يومياً بأيدي خبراء يابانيين", phone: "0104-555-6677", opens: "13:00", closes: "00:00", rating: 4.7, active: true  },
  { id: 6, name: "حلويات النصر", desc: "حلويات شرقية وغربية وكيك مناسبات بالطلب",      phone: "0105-666-7788", opens: "10:00", closes: "23:00", rating: 4.4, active: false },
];

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={C.orange} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function formatHours(opens: string, closes: string) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "ص" : "م";
    const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
  };
  return `${fmt(opens)} – ${fmt(closes)}`;
}

const emptyForm = { name: "", desc: "", phone: "", opens: "10:00", closes: "23:00", image: "" };

export default function AdminRestaurantsPage() {
  const [rows,       setRows]       = useState<Restaurant[]>(seed);
  const [search,     setSearch]     = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(emptyForm);
  const [imageLabel, setImageLabel] = useState("اختر صورة...");

  const filtered = rows.filter(
    (r) => !search.trim() || r.name.includes(search) || r.phone.includes(search)
  );

  function toggleActive(id: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const newRest: Restaurant = {
      id:      rows.length + 1,
      name:    form.name.trim(),
      desc:    form.desc.trim() || "—",
      phone:   form.phone.trim() || "—",
      opens:   form.opens,
      closes:  form.closes,
      rating:  5.0,
      active:  true,
    };
    setRows((prev) => [newRest, ...prev]);
    setForm(emptyForm);
    setImageLabel("اختر صورة...");
    setShowModal(false);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageLabel(file ? file.name : "اختر صورة...");
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مطعم..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: C.orange, color: "#fff" }}
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة مطعم</span>
          </button>
        </div>

        {/* ── Table card ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["الاسم", "الوصف", "التليفون", "ساعات العمل", "التقييم", "الحالة", "إجراءات"].map((col, i) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${
                        i === 1 ? " hidden lg:table-cell" :
                        i === 2 ? " hidden sm:table-cell" :
                        i === 3 ? " hidden md:table-cell" : ""
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
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد مطاعم مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id}
                      style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                      {/* الاسم */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </td>

                      {/* الوصف */}
                      <td className="hidden lg:table-cell px-4 py-3 max-w-[220px]">
                        <p className="text-xs line-clamp-2" style={{ color: C.muted }}>{r.desc}</p>
                      </td>

                      {/* التليفون */}
                      <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {r.phone}
                      </td>

                      {/* ساعات العمل */}
                      <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {formatHours(r.opens, r.closes)}
                      </td>

                      {/* التقييم */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs font-bold whitespace-nowrap" style={{ color: C.text }}>
                          <StarIcon />
                          {r.rating.toFixed(1)}
                        </span>
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(r.id)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                          style={{
                            background: r.active ? `${C.green}22` : `${C.red}22`,
                            color:      r.active ? C.green : C.red,
                          }}
                        >
                          {r.active ? "نشط" : "مش نشط"}
                        </button>
                      </td>

                      {/* إجراءات */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                            style={{ background: `${C.teal}22`, color: C.teal }}
                          >
                            تعديل
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                            style={{ background: `${C.orange}22`, color: C.orange }}
                          >
                            المنيو
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} مطعم
          </div>
        </div>

      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>إضافة مطعم جديد</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* اسم المطعم */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  اسم المطعم <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: بيت البرجر"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              {/* الوصف */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>الوصف</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="وصف مختصر للمطعم..."
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              {/* التليفون */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>التليفون</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XX-XXX-XXXX"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              {/* ساعات العمل */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>بيفتح الساعة</label>
                  <input
                    type="time"
                    value={form.opens}
                    onChange={(e) => setForm({ ...form, opens: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>بيقفل الساعة</label>
                  <input
                    type="time"
                    value={form.closes}
                    onChange={(e) => setForm({ ...form, closes: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      colorScheme: "dark",
                    }}
                  />
                </div>
              </div>

              {/* رفع صورة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>صورة المطعم</label>
                <label
                  className="flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: C.bg, border: `1px dashed ${C.border}` }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${C.orange}22` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={C.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{imageLabel}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>PNG, JPG حتى 5MB</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0"
              style={{ borderColor: C.border }}>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.orange, color: "#fff" }}
              >
                حفظ
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
