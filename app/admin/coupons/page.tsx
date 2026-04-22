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

type CouponType   = "قيمة ثابتة" | "نسبة مئوية";
type AppliesTo    = "توصيل" | "أكل" | "الاتنين";

type Coupon = {
  id:                  number;
  code:                string;
  type:                CouponType;
  value:               number;
  applies:             AppliesTo;
  minOrder:            number;
  usage_limit_total:   number | null;
  usage_limit_per_user: number | null;
  expiry:              string;
  active:              boolean;
};

/* ── DB row → Coupon ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Coupon {
  return {
    id:                   r.id,
    code:                 r.code,
    type:                 r.type         as CouponType,
    value:                r.value,
    applies:              r.applies_to   as AppliesTo,
    minOrder:             r.min_order    ?? 0,
    usage_limit_total:    r.usage_limit_total    ?? null,
    usage_limit_per_user: r.usage_limit_per_user ?? null,
    expiry:               r.expires_at   ?? "",
    active:               r.is_active,
  };
}

const emptyForm = {
  code:                 "",
  type:                 "قيمة ثابتة" as CouponType,
  value:                "",
  applies:              "توصيل" as AppliesTo,
  minOrder:             "",
  usage_limit_total:    "",
  usage_limit_per_user: "",
  expiry:               "",
  active:               true,
};

function formatExpiry(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
}

export default function AdminCouponsPage() {
  const [rows,     setRows]     = useState<Coupon[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [formErr,  setFormErr]  = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter(
    (r) => !search.trim() || r.code.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Fetch ── */
  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    setLoading(true);
    setFetchErr(null);
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, type, value, applies_to, min_order, usage_limit_total, usage_limit_per_user, expires_at, is_active")
      .order("id", { ascending: false });
    if (error) setFetchErr("تعذّر تحميل الكوبونات");
    else setRows((data ?? []).map(fromRow));
    setLoading(false);
  }

  /* ── Modal helpers ── */
  function openAdd() {
    setForm(emptyForm);
    setFormErr(null);
    setModal({ open: true });
  }

  function openEdit(c: Coupon) {
    setForm({
      code:                 c.code,
      type:                 c.type,
      value:                String(c.value),
      applies:              c.applies,
      minOrder:             String(c.minOrder),
      usage_limit_total:    c.usage_limit_total    != null ? String(c.usage_limit_total)    : "",
      usage_limit_per_user: c.usage_limit_per_user != null ? String(c.usage_limit_per_user) : "",
      expiry:               c.expiry,
      active:               c.active,
    });
    setFormErr(null);
    setModal({ open: true, id: c.id });
  }

  function closeModal() { setModal({ open: false }); setFormErr(null); }

  /* ── Save (add / edit) ── */
  async function handleSave() {
    setFormErr(null);

    if (!form.code.trim()) {
      setFormErr("كود الكوبون مطلوب"); return;
    }
    if (!form.value) {
      setFormErr("القيمة مطلوبة"); return;
    }
    const value = Number(form.value);
    if (isNaN(value) || value <= 0) {
      setFormErr("القيمة يجب أن تكون رقمًا أكبر من صفر"); return;
    }
    if (form.type === "نسبة مئوية" && value > 100) {
      setFormErr("نسبة الخصم لا يمكن أن تتجاوز 100%"); return;
    }
    if (form.minOrder && Number(form.minOrder) < 0) {
      setFormErr("الحد الأدنى للطلب لا يمكن أن يكون سالبًا"); return;
    }
    if (form.usage_limit_total && Number(form.usage_limit_total) < 1) {
      setFormErr("الحد الإجمالي للاستخدام يجب أن يكون 1 على الأقل"); return;
    }
    if (form.usage_limit_per_user && Number(form.usage_limit_per_user) < 1) {
      setFormErr("حد الاستخدام للمستخدم يجب أن يكون 1 على الأقل"); return;
    }

    const dbPayload = {
      code:                 form.code.trim().toUpperCase(),
      type:                 form.type,
      value,
      applies_to:           form.applies,
      min_order:            Number(form.minOrder) || 0,
      usage_limit_total:    form.usage_limit_total    ? Number(form.usage_limit_total)    : null,
      usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : null,
      expires_at:           form.expiry || null,
      is_active:            form.active,
    };

    setSaving(true);
    if (!isEdit) {
      const { data, error } = await supabase
        .from("coupons")
        .insert({ ...dbPayload, used_count: 0 })
        .select("id, code, type, value, applies_to, min_order, usage_limit_total, usage_limit_per_user, expires_at, is_active")
        .single();
      if (error) { setFormErr("فشل الحفظ، حاول مرة أخرى"); setSaving(false); return; }
      setRows((p) => [fromRow(data), ...p]);
    } else {
      const { error } = await supabase
        .from("coupons")
        .update(dbPayload)
        .eq("id", modal.id!);
      if (error) { setFormErr("فشل التعديل، حاول مرة أخرى"); setSaving(false); return; }
      setRows((p) => p.map((r) => r.id === modal.id ? fromRow({ ...dbPayload, id: modal.id }) : r));
    }
    setSaving(false);
    closeModal();
  }

  /* ── Toggle active ── */
  async function toggleActive(c: Coupon) {
    const next = !c.active;
    setRows((p) => p.map((r) => r.id === c.id ? { ...r, active: next } : r));
    const { error } = await supabase.from("coupons").update({ is_active: next }).eq("id", c.id);
    if (error) setRows((p) => p.map((r) => r.id === c.id ? { ...r, active: c.active } : r));
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    const { error } = await supabase.from("coupons").delete().eq("id", deleteId);
    if (!error) setRows((p) => p.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
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
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      جاري التحميل...
                    </td>
                  </tr>
                ) : fetchErr ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: C.red }}>
                      {fetchErr}
                      <button onClick={fetchCoupons} className="mr-2 underline" style={{ color: C.teal }}>إعادة المحاولة</button>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
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
                      {c.usage_limit_total != null ? c.usage_limit_total : "—"}
                    </td>

                    {/* تاريخ الانتهاء */}
                    <td className="hidden xl:table-cell px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {formatExpiry(c.expiry)}
                    </td>

                    {/* الحالة */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleActive(c)}
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
            {loading ? "..." : `${filtered.length} كوبون`}
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

              {formErr && (
                <p className="text-xs font-semibold text-center py-1.5 rounded-lg"
                  style={{ background: `${C.red}22`, color: C.red }}>
                  {formErr}
                </p>
              )}

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

              {/* الحد الأدنى للطلب */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: C.muted }}>الحد الأدنى للطلب (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  placeholder="0 — بدون حد أدنى"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inp}
                />
              </div>

              {/* حدود الاستخدام */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>الحد الإجمالي للاستخدام</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usage_limit_total}
                    onChange={(e) => setForm({ ...form, usage_limit_total: e.target.value })}
                    placeholder="غير محدود"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={inp}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: C.muted }}>حد لكل مستخدم</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usage_limit_per_user}
                    onChange={(e) => setForm({ ...form, usage_limit_per_user: e.target.value })}
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
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: C.orange, color: "#fff" }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={closeModal} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
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
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: C.red, color: "#fff" }}>
                {deleting ? "جاري الحذف..." : "حذف"}
              </button>
              <button onClick={() => setDeleteId(null)} disabled={deleting}
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
