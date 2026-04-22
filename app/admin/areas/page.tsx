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
};

type Area = {
  id: number;
  name: string;
  delivery_fee: number;
  is_active: boolean;
};

type ModalMode = "add" | "edit";
const emptyForm = { name: "", delivery_fee: "", is_active: true };

export default function AdminAreasPage() {
  const [rows,    setRows]    = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");

  const [modal,    setModal]    = useState<{ open: boolean; mode: ModalMode; id?: number }>({ open: false, mode: "add" });
  const [form,     setForm]     = useState(emptyForm);
  const [formErr,  setFormErr]  = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feeSort,  setFeeSort]  = useState<"asc" | "desc">("asc");

  /* ── Fetch ── */
  useEffect(() => {
    fetchAreas();
  }, []);

  async function fetchAreas() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("areas")
      .select("id, name, delivery_fee, is_active")
      .order("name");
    if (error) setError("تعذّر تحميل الأحياء");
    else setRows(data ?? []);
    setLoading(false);
  }

  const filtered = rows
    .filter((r) => !search.trim() || r.name.includes(search.trim()))
    .sort((a, b) => feeSort === "asc" ? a.delivery_fee - b.delivery_fee : b.delivery_fee - a.delivery_fee);

  /* ── Modal helpers ── */
  function openAdd() {
    setForm(emptyForm);
    setFormErr(null);
    setModal({ open: true, mode: "add" });
  }

  function openEdit(area: Area) {
    setForm({ name: area.name, delivery_fee: String(area.delivery_fee), is_active: area.is_active });
    setFormErr(null);
    setModal({ open: true, mode: "edit", id: area.id });
  }

  function closeModal() {
    setModal({ open: false, mode: "add" });
    setFormErr(null);
  }

  /* ── Save (add / edit) ── */
  async function handleSave() {
    const name = form.name.trim();
    const fee  = Number(form.delivery_fee);
    if (!name)              { setFormErr("اسم الحي مطلوب");            return; }
    if (!form.delivery_fee) { setFormErr("سعر التوصيل مطلوب");        return; }
    if (isNaN(fee) || fee < 0) { setFormErr("سعر التوصيل غير صحيح"); return; }

    setSaving(true);
    setFormErr(null);

    if (modal.mode === "add") {
      const { data, error } = await supabase
        .from("areas")
        .insert({ name, delivery_fee: fee, is_active: form.is_active })
        .select("id, name, delivery_fee, is_active")
        .single();
      if (error) { setFormErr("فشل الحفظ، حاول مرة أخرى"); setSaving(false); return; }
      setRows((prev) => [data, ...prev].sort((a, b) => a.name.localeCompare(b.name, "ar")));
    } else {
      const { error } = await supabase
        .from("areas")
        .update({ name, delivery_fee: fee, is_active: form.is_active })
        .eq("id", modal.id!);
      if (error) { setFormErr("فشل التعديل، حاول مرة أخرى"); setSaving(false); return; }
      setRows((prev) =>
        prev.map((r) =>
          r.id === modal.id ? { ...r, name, delivery_fee: fee, is_active: form.is_active } : r
        )
      );
    }

    setSaving(false);
    closeModal();
  }

  /* ── Toggle active ── */
  async function toggleActive(area: Area) {
    const next = !area.is_active;
    setRows((prev) => prev.map((r) => (r.id === area.id ? { ...r, is_active: next } : r)));
    const { error } = await supabase
      .from("areas")
      .update({ is_active: next })
      .eq("id", area.id);
    if (error) setRows((prev) => prev.map((r) => (r.id === area.id ? { ...r, is_active: area.is_active } : r)));
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    const { error } = await supabase.from("areas").delete().eq("id", deleteId);
    if (error) { setDeleting(false); return; }
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
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
                  {["اسم الحي"].concat([]).map((col) => (
                    <th key={col}
                      className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap"
                      style={{ color: C.muted }}>
                      {col}
                    </th>
                  ))}
                  <th
                    className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap cursor-pointer select-none"
                    style={{ color: C.muted }}
                    onClick={() => setFeeSort((s) => s === "asc" ? "desc" : "asc")}
                  >
                    <span className="inline-flex items-center gap-1">
                      سعر التوصيل
                      <span style={{ color: C.teal }}>{feeSort === "asc" ? "↑" : "↓"}</span>
                    </span>
                  </th>
                  {["الحالة", "إجراءات"].map((col) => (
                    <th key={col}
                      className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap"
                      style={{ color: C.muted }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      جاري التحميل...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm" style={{ color: C.red }}>
                      {error}
                      <button onClick={fetchAreas} className="mr-2 underline" style={{ color: C.teal }}>إعادة المحاولة</button>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
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
                          {area.delivery_fee} ج.م
                        </span>
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(area)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                          style={{
                            background: area.is_active ? `${C.green}22` : `${C.red}22`,
                            color:      area.is_active ? C.green : C.red,
                          }}
                        >
                          {area.is_active ? "نشط" : "مش نشط"}
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
                            onClick={() => setDeleteId(area.id)}
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
            {loading ? "..." : `${filtered.length} حي`}
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

              {formErr && (
                <p className="text-xs font-semibold text-center py-1.5 rounded-lg"
                  style={{ background: `${C.red}22`, color: C.red }}>
                  {formErr}
                </p>
              )}

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
                  value={form.delivery_fee}
                  onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                  placeholder="مثال: 15"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}
                />
              </div>

              {/* الحالة toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>الحالة</span>
                <button
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: form.is_active ? `${C.green}22` : `${C.red}22`,
                    color:      form.is_active ? C.green : C.red,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: form.is_active ? C.green : C.red }} />
                  {form.is_active ? "نشط" : "مش نشط"}
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: C.orange, color: "#fff" }}
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
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
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: C.red, color: "#fff" }}
              >
                {deleting ? "جاري الحذف..." : "حذف"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
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
