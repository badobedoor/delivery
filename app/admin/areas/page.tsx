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

type Area = {
  id: number;
  name: string;
  fee: number;
  active: boolean;
};

const seed: Area[] = [
  { id: 1, name: "المعادي",       fee: 15, active: true  },
  { id: 2, name: "الزمالك",       fee: 20, active: true  },
  { id: 3, name: "مصر الجديدة",   fee: 18, active: true  },
  { id: 4, name: "مدينة نصر",    fee: 12, active: true  },
  { id: 5, name: "الدقي",         fee: 20, active: false },
  { id: 6, name: "وسط البلد",    fee: 10, active: false },
];

type ModalMode = "add" | "edit";
const emptyForm = { name: "", fee: "", active: true };

export default function AdminAreasPage() {
  const [rows,      setRows]      = useState<Area[]>(seed);
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState<{ open: boolean; mode: ModalMode; id?: number }>({ open: false, mode: "add" });
  const [form,      setForm]      = useState(emptyForm);
  const [deleteId,  setDeleteId]  = useState<number | null>(null);

  const filtered = rows.filter(
    (r) => !search.trim() || r.name.includes(search.trim())
  );

  /* ── open add modal ── */
  function openAdd() {
    setForm(emptyForm);
    setModal({ open: true, mode: "add" });
  }

  /* ── open edit modal pre-filled ── */
  function openEdit(area: Area) {
    setForm({ name: area.name, fee: String(area.fee), active: area.active });
    setModal({ open: true, mode: "edit", id: area.id });
  }

  function closeModal() {
    setModal({ open: false, mode: "add" });
  }

  function handleSave() {
    if (!form.name.trim() || !form.fee) return;
    const fee = Number(form.fee);
    if (isNaN(fee) || fee < 0) return;

    if (modal.mode === "add") {
      const next: Area = { id: Date.now(), name: form.name.trim(), fee, active: form.active };
      setRows((prev) => [next, ...prev]);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === modal.id ? { ...r, name: form.name.trim(), fee, active: form.active } : r
        )
      );
    }
    closeModal();
  }

  function toggleActive(id: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }

  function confirmDelete(id: number) {
    setDeleteId(id);
  }

  function handleDelete() {
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
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
              placeholder="ابحث عن حي..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
            )}
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: C.orange, color: "#fff" }}
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة حي</span>
          </button>
        </div>

        {/* ── Table card ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["اسم الحي", "سعر التوصيل", "الحالة", "إجراءات"].map((col) => (
                    <th key={col}
                      className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap"
                      style={{ color: C.muted }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد أحياء مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.map((area, i) => (
                    <tr key={area.id}
                      style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                      {/* الاسم */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold" style={{ color: C.text }}>{area.name}</p>
                      </td>

                      {/* سعر التوصيل */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold" style={{ color: C.teal }}>
                          {area.fee} ج.م
                        </span>
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(area.id)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                          style={{
                            background: area.active ? `${C.green}22` : `${C.red}22`,
                            color:      area.active ? C.green : C.red,
                          }}
                        >
                          {area.active ? "نشط" : "مش نشط"}
                        </button>
                      </td>

                      {/* إجراءات */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(area)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                            style={{ background: `${C.teal}22`, color: C.teal }}
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => confirmDelete(area.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                            style={{ background: `${C.red}22`, color: C.red }}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} حي
          </div>
        </div>

      </div>

      {/* ── Add / Edit Modal ── */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl flex flex-col"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {modal.mode === "add" ? "إضافة حي جديد" : "تعديل الحي"}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* اسم الحي */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  اسم الحي <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: المعادي"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              {/* سعر التوصيل */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  سعر التوصيل (ج.م) <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  placeholder="مثال: 15"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* الحالة toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>الحالة</span>
                <button
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: form.active ? `${C.green}22` : `${C.red}22`,
                    color:      form.active ? C.green : C.red,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: form.active ? C.green : C.red }}
                  />
                  {form.active ? "نشط" : "مش نشط"}
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t"
              style={{ borderColor: C.border }}>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.orange, color: "#fff" }}
              >
                حفظ
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="w-full max-w-xs rounded-2xl flex flex-col"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            <div className="px-5 py-5 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🗑️</span>
              <p className="text-base font-black" style={{ color: C.text }}>تأكيد الحذف</p>
              <p className="text-sm" style={{ color: C.muted }}>
                هل أنت متأكد من حذف هذا الحي؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.red, color: "#fff" }}
              >
                حذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
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
