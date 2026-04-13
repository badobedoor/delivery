"use client";

import { useState, useRef } from "react";

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

type Ad = {
  id:       number;
  image:    string;   /* placeholder emoji or URL */
  page:     string;
  order:    number;
  startDate:string;
  endDate:  string;
  active:   boolean;
};

type ModalForm = {
  image:     string;
  page:      string;
  order:     string;
  startDate: string;
  endDate:   string;
  active:    boolean;
};

const PAGES = ["الرئيسية", "المطاعم", "كل الصفحات"];

const seed: Ad[] = [
  { id: 1, image: "🖼️", page: "الرئيسية",     order: 1, startDate: "٢٠٢٦-٠٤-٠١", endDate: "٢٠٢٦-٠٤-٣٠", active: true  },
  { id: 2, image: "🖼️", page: "المطاعم",       order: 2, startDate: "٢٠٢٦-٠٤-١٠", endDate: "٢٠٢٦-٠٥-١٠", active: true  },
  { id: 3, image: "🖼️", page: "كل الصفحات",   order: 3, startDate: "٢٠٢٦-٠٣-١٥", endDate: "٢٠٢٦-٠٤-١٥", active: false },
];

const empty: ModalForm = { image: "", page: "الرئيسية", order: "1", startDate: "", endDate: "", active: true };

/* ── Delete modal ── */
function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-base font-black text-center" style={{ color: C.text }}>حذف الإعلان</p>
        <p className="text-sm text-center" style={{ color: C.muted }}>هل تريد حذف إعلان <span style={{ color: C.red }}>{name}</span>؟ لا يمكن التراجع.</p>
        <div className="flex gap-3 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.red, color: "#fff" }}>حذف</button>
        </div>
      </div>
    </div>
  );
}

/* ── Ad modal ── */
function AdModal({
  title, form, onChange, onSave, onClose,
}: {
  title:    string;
  form:     ModalForm;
  onChange: (f: ModalForm) => void;
  onSave:   () => void;
  onClose:  () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  function set<K extends keyof ModalForm>(k: K, v: ModalForm[K]) {
    onChange({ ...form, [k]: v });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  }

  const inputStyle = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    color: C.text,
    colorScheme: "dark" as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh]" style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: C.border }}>
          <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: C.muted }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">

          {/* Image upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الصورة</label>
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: C.bg, border: `2px dashed ${C.border}` }}
              onClick={() => fileRef.current?.click()}
            >
              <span className="text-3xl">🖼️</span>
              <p className="text-xs" style={{ color: C.muted }}>{fileName || "اضغط لرفع صورة"}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Page */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الصفحة</label>
            <select
              value={form.page}
              onChange={(e) => set("page", e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            >
              {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الترتيب</label>
            <input
              type="number" min="1"
              value={form.order}
              onChange={(e) => set("order", e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>تاريخ البداية</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>تاريخ النهاية</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: C.muted }}>الحالة</span>
            <button
              onClick={() => set("active", !form.active)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: form.active ? C.teal : C.border }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ right: form.active ? "2px" : "auto", left: form.active ? "auto" : "2px" }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t flex-shrink-0" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onSave}  className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.orange, color: "#fff" }}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

let nextId = seed.length + 1;

export default function AdminAdvertisementsPage() {
  const [rows,     setRows]     = useState<Ad[]>(seed);
  const [modal,    setModal]    = useState<"add" | "edit" | null>(null);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form,     setForm]     = useState<ModalForm>(empty);

  function openAdd() {
    setForm(empty);
    setEditId(null);
    setModal("add");
  }

  function openEdit(ad: Ad) {
    setForm({ image: ad.image, page: ad.page, order: String(ad.order), startDate: ad.startDate, endDate: ad.endDate, active: ad.active });
    setEditId(ad.id);
    setModal("edit");
  }

  function handleSave() {
    if (modal === "add") {
      setRows((p) => [...p, {
        id: nextId++, image: "🖼️", page: form.page,
        order: Number(form.order) || 1,
        startDate: form.startDate, endDate: form.endDate, active: form.active,
      }]);
    } else if (editId !== null) {
      setRows((p) => p.map((r) => r.id === editId
        ? { ...r, page: form.page, order: Number(form.order) || 1, startDate: form.startDate, endDate: form.endDate, active: form.active }
        : r));
    }
    setModal(null);
  }

  function handleDelete() {
    setRows((p) => p.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  function toggleActive(id: number) {
    setRows((p) => p.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  }

  const deleteTarget = rows.find((r) => r.id === deleteId);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: C.orange, color: "#fff" }}
        >
          <span>+</span> إضافة إعلان
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الصورة",        hide: ""                      },
                  { label: "الصفحة",         hide: ""                      },
                  { label: "الترتيب",        hide: " hidden sm:table-cell" },
                  { label: "تاريخ البداية", hide: " hidden md:table-cell" },
                  { label: "تاريخ النهاية", hide: " hidden md:table-cell" },
                  { label: "الحالة",         hide: ""                      },
                  { label: "إجراءات",        hide: ""                      },
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
              {rows.map((ad, i) => (
                <tr key={ad.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>

                  {/* Image preview */}
                  <td className="px-4 py-3">
                    <div className="w-12 h-9 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                      {ad.image}
                    </div>
                  </td>

                  {/* Page */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>{ad.page}</span>
                  </td>

                  {/* Order */}
                  <td className="hidden sm:table-cell px-4 py-3 text-center">
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${C.teal}20`, color: C.teal }}>
                      {ad.order}
                    </span>
                  </td>

                  {/* Start date */}
                  <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {ad.startDate}
                  </td>

                  {/* End date */}
                  <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {ad.endDate}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(ad.id)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ background: ad.active ? C.teal : C.border }}
                    >
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ right: ad.active ? "2px" : "auto", left: ad.active ? "auto" : "2px" }} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(ad)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.teal}22`, color: C.teal }}>
                        تعديل
                      </button>
                      <button
                        onClick={() => setDeleteId(ad.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.red}22`, color: C.red }}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {rows.length} إعلان
        </div>
      </div>

      {/* ── Modals ── */}
      {(modal === "add" || modal === "edit") && (
        <AdModal
          title={modal === "add" ? "إضافة إعلان" : "تعديل إعلان"}
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {deleteId !== null && deleteTarget && (
        <DeleteModal
          name={`صفحة ${deleteTarget.page}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
