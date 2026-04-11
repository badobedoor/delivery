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

type CouponType   = "قيمة ثابتة" | "نسبة مئوية";
type AppliesTo    = "توصيل" | "أكل" | "الاتنين";

type Coupon = {
  id:       number;
  code:     string;
  type:     CouponType;
  value:    number;
  applies:  AppliesTo;
  minOrder: number;
  uses:     number;
  expiry:   string;
  active:   boolean;
};

const seed: Coupon[] = [
  { id: 1, code: "HALA50",    type: "نسبة مئوية", value: 50, applies: "الاتنين", minOrder: 100, uses: 200, expiry: "2026-04-30", active: true  },
  { id: 2, code: "FREESHIP",  type: "قيمة ثابتة", value: 20, applies: "توصيل",   minOrder: 0,   uses: 500, expiry: "2026-05-15", active: true  },
  { id: 3, code: "PIZZA20",   type: "نسبة مئوية", value: 20, applies: "أكل",     minOrder: 80,  uses: 100, expiry: "2026-06-01", active: true  },
  { id: 4, code: "WELCOME30", type: "قيمة ثابتة", value: 30, applies: "الاتنين", minOrder: 150, uses: 50,  expiry: "2026-03-31", active: false },
  { id: 5, code: "EID25",     type: "نسبة مئوية", value: 25, applies: "أكل",     minOrder: 120, uses: 300, expiry: "2026-04-10", active: false },
];

const emptyForm = {
  code:     "",
  type:     "قيمة ثابتة" as CouponType,
  value:    "",
  applies:  "الاتنين" as AppliesTo,
  minOrder: "",
  uses:     "",
  expiry:   "",
  active:   true,
};

function formatExpiry(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
}

export default function AdminCouponsPage() {
  const [rows,     setRows]     = useState<Coupon[]>(seed);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter(
    (r) => !search.trim() || r.code.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm(emptyForm);
    setModal({ open: true });
  }

  function openEdit(c: Coupon) {
    setForm({
      code:     c.code,
      type:     c.type,
      value:    String(c.value),
      applies:  c.applies,
      minOrder: String(c.minOrder),
      uses:     String(c.uses),
      expiry:   c.expiry,
      active:   c.active,
    });
    setModal({ open: true, id: c.id });
  }

  function closeModal() { setModal({ open: false }); }

  function handleSave() {
    if (!form.code.trim() || !form.value) return;
    const payload = {
      code:     form.code.trim().toUpperCase(),
      type:     form.type,
      value:    Number(form.value),
      applies:  form.applies,
      minOrder: Number(form.minOrder) || 0,
      uses:     Number(form.uses)     || 0,
      expiry:   form.expiry,
      active:   form.active,
    };
    if (!isEdit) {
      setRows((p) => [{ id: Date.now(), ...payload }, ...p]);
    } else {
      setRows((p) => p.map((r) => r.id === modal.id ? { ...r, ...payload } : r));
    }
    closeModal();
  }

  function toggleActive(id: number) {
    setRows((p) => p.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  }

  function handleDelete() {
    setRows((p) => p.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  /* shared input style */
  const inp: React.CSSProperties = {
    background:  C.bg,
    border:      `1px solid ${C.border}`,
    color:       C.text,
    colorScheme: "dark",
  };

  return (
    <>
      <div className="flex flex-col gap-5">

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
              placeholder="ابحث عن كوبون..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
            />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة كوبون</span>
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
                    { label: "الكود",           hide: ""                        },
                    { label: "النوع",           hide: " hidden sm:table-cell"   },
                    { label: "القيمة",          hide: ""                        },
                    { label: "يطبق على",        hide: " hidden md:table-cell"   },
                    { label: "الحد الأدنى",     hide: " hidden lg:table-cell"   },
                    { label: "عدد الاستخدام",   hide: " hidden lg:table-cell"   },
                    { label: "تاريخ الانتهاء",  hide: " hidden xl:table-cell"   },
                    { label: "الحالة",          hide: ""                        },
                    { label: "إجراءات",         hide: ""                        },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-3 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد كوبونات مطابقة
                    </td>
                  </tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                    {/* الكود */}
                    <td className="px-3 py-3">
                      <span className="text-xs font-black tracking-wider px-2 py-1 rounded-lg"
                        style={{ background: `${C.orange}18`, color: C.orange }}>
                        {c.code}
                      </span>
                    </td>

                    {/* النوع */}
                    <td className="hidden sm:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {c.type}
                    </td>

                    {/* القيمة */}
                    <td className="px-3 py-3">
                      <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.teal }}>
                        {c.type === "نسبة مئوية" ? `${c.value}%` : `${c.value} ج.م`}
                      </span>
                    </td>

                    {/* يطبق على */}
                    <td className="hidden md:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {c.applies}
                    </td>

                    {/* الحد الأدنى */}
                    <td className="hidden lg:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {c.minOrder > 0 ? `${c.minOrder} ج.م` : "—"}
                    </td>

                    {/* عدد الاستخدام */}
                    <td className="hidden lg:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {c.uses > 0 ? c.uses : "—"}
                    </td>

                    {/* تاريخ الانتهاء */}
                    <td className="hidden xl:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {formatExpiry(c.expiry)}
                    </td>

                    {/* الحالة */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleActive(c.id)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                        style={{
                          background: c.active ? `${C.green}22` : `${C.red}22`,
                          color:      c.active ? C.green : C.red,
                        }}
                      >
                        {c.active ? "نشط" : "مش نشط"}
                      </button>
                    </td>

                    {/* إجراءات */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.teal}22`, color: C.teal }}>
                          تعديل
                        </button>
                        <button onClick={() => setDeleteId(c.id)}
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
            {filtered.length} كوبون
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
          <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {isEdit ? "تعديل الكوبون" : "إضافة كوبون جديد"}
              </h2>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* الكود */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  الكود <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: HALA50"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none tracking-widest font-bold"
                  style={inp}
                />
              </div>

              {/* النوع */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>النوع</label>
                <div className="flex gap-3">
                  {(["قيمة ثابتة", "نسبة مئوية"] as CouponType[]).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.type === t}
                        onChange={() => setForm({ ...form, type: t })}
                        className="accent-orange-500"
                      />
                      <span className="text-sm" style={{ color: form.type === t ? C.text : C.muted }}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* القيمة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>
                  القيمة {form.type === "نسبة مئوية" ? "(%)" : "(ج.م)"}
                  <span style={{ color: C.red }}> *</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={form.type === "نسبة مئوية" ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "نسبة مئوية" ? "مثال: 25" : "مثال: 30"}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inp}
                />
              </div>

              {/* يطبق على */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>يطبق على</label>
                <select
                  value={form.applies}
                  onChange={(e) => setForm({ ...form, applies: e.target.value as AppliesTo })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inp}
                >
                  {(["توصيل", "أكل", "الاتنين"] as AppliesTo[]).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* الحد الأدنى + عدد الاستخدام */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>الحد الأدنى (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={inp}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>عدد الاستخدام</label>
                  <input
                    type="number"
                    min={0}
                    value={form.uses}
                    onChange={(e) => setForm({ ...form, uses: e.target.value })}
                    placeholder="غير محدود"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={inp}
                  />
                </div>
              </div>

              {/* تاريخ الانتهاء */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inp}
                />
              </div>

              {/* الحالة */}
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
                  <span className="w-2 h-2 rounded-full"
                    style={{ background: form.active ? C.green : C.red }} />
                  {form.active ? "نشط" : "مش نشط"}
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: C.border }}>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.orange, color: "#fff" }}>
                حفظ
              </button>
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
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

            <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🗑️</span>
              <p className="text-base font-black" style={{ color: C.text }}>تأكيد الحذف</p>
              <p className="text-sm" style={{ color: C.muted }}>
                هل أنت متأكد من حذف هذا الكوبون؟ لا يمكن التراجع.
              </p>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.red, color: "#fff" }}>
                حذف
              </button>
              <button onClick={() => setDeleteId(null)}
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
