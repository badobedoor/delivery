"use client";

import { useState, useEffect } from "react";
import { supabasePublic } from "@/lib/supabasePublic";

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

/* ── Eye icons ── */
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <path d="m1 1 22 22"/>
    </svg>
  );
}

/* ══════════════════════════════════════════
   Shared modal
══════════════════════════════════════════ */

type ModalForm = { name: string; phone: string; password: string; active: boolean };
const emptyForm: ModalForm = { name: "", phone: "", password: "", active: true };

function TeamModal({
  open, title, isEdit, showStatus, form, setForm, onSave, onClose,
}: {
  open:       boolean;
  title:      string;
  isEdit:     boolean;
  showStatus: boolean;
  form:       ModalForm;
  setForm:    (f: ModalForm) => void;
  onSave:     () => void;
  onClose:    () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              الاسم <span style={{ color: C.red }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="الاسم الكامل"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>رقم الهاتف</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01XX-XXX-XXXX"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              الباسورد
              {!isEdit && <span style={{ color: C.red }}> *</span>}
              {isEdit  && <span style={{ color: C.muted }}> (فارغ = بدون تغيير)</span>}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? "••••••••" : "أدخل كلمة المرور"}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background:  C.bg,
                  border:      `1px solid ${C.border}`,
                  color:       C.text,
                  paddingLeft: "40px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: C.muted }}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {showStatus && (
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
                <span className="w-2 h-2 rounded-full" style={{ background: form.active ? C.green : C.red }} />
                {form.active ? "نشط" : "مش نشط"}
              </button>
            </div>
          )}

        </div>

        {/* footer */}
        <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: C.border }}>
          <button onClick={onSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>حفظ</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>

      </div>
    </div>
  );
}

/* ── Delete confirm ── */
function DeleteModal({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xs rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🗑️</span>
          <p className="text-base font-black" style={{ color: C.text }}>تأكيد الحذف</p>
          <p className="text-sm" style={{ color: C.muted }}>هل أنت متأكد؟ لا يمكن التراجع.</p>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.red, color: "#fff" }}>حذف</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Types
══════════════════════════════════════════ */

type StaffRow = {
  id: number;
  name: string;
  phone: string | null;
  password: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

type DriverRow = {
  id: number;
  name: string;
  phone: string | null;
  password: string | null;
  is_active: boolean;
  created_at: string;
};

/* ══════════════════════════════════════════
   TAB 1 — المدراء
══════════════════════════════════════════ */

function AdminsTab({
  managers,
  onRefresh,
}: {
  managers: StaffRow[];
  onRefresh: () => void;
}) {
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function handleSave() {
    if (!form.name.trim() || !form.password.trim()) return;

    const { error } = await supabasePublic
      .from("staff")
      .insert([{
        name:      form.name.trim(),
        phone:     form.phone.trim() || null,
        password:  form.password,
        role:      "admin",
        is_active: true,
      }]);

    if (!error) {
      setForm(emptyForm);
      setModal(false);
      onRefresh();
    }
  }

  async function handleDelete(id: number) {
    await supabasePublic.from("staff").delete().eq("id", id);
    setDeleteId(null);
    onRefresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-start">
          <button onClick={() => { setForm(emptyForm); setModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span> إضافة مدير
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "الاسم",         hide: "" },
                    { label: "رقم الهاتف",    hide: " hidden sm:table-cell" },
                    { label: "النوع",          hide: "" },
                    { label: "الحالة",         hide: "" },
                    { label: "تاريخ الإنشاء", hide: " hidden md:table-cell" },
                    { label: "إجراءات",        hide: "" },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا يوجد مدراء</td></tr>
                ) : managers.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < managers.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.orange}30`, color: C.orange }}>
                          {r.name[0]}
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: `${C.teal}22`, color: C.teal }}>مدير</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{
                          background: r.is_active ? `${C.green}22` : `${C.red}22`,
                          color:      r.is_active ? C.green : C.red,
                        }}>
                        {r.is_active ? "نشط" : "مش نشط"}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteId(r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {managers.length} مدير
          </div>
        </div>
      </div>

      <TeamModal open={modal} title="إضافة مدير جديد" isEdit={false} showStatus={false}
        form={form} setForm={setForm} onSave={handleSave} onClose={() => setModal(false)} />
      <DeleteModal open={deleteId !== null}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)} />
    </>
  );
}

/* ══════════════════════════════════════════
   TAB 2 — الموظفين
══════════════════════════════════════════ */

function StaffTab({
  staff,
  onRefresh,
}: {
  staff: StaffRow[];
  onRefresh: () => void;
}) {
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");

  const isEdit   = modal.id !== undefined;
  const filtered = staff.filter((r) =>
    !search.trim() || r.name.includes(search) || (r.phone ?? "").includes(search),
  );

  function openAdd() { setForm(emptyForm); setModal({ open: true }); }
  function openEdit(r: StaffRow) {
    setForm({ name: r.name, phone: r.phone ?? "", password: "", active: r.is_active });
    setModal({ open: true, id: r.id });
  }
  function closeModal() { setModal({ open: false }); }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (!isEdit && !form.password.trim()) return;

    if (!isEdit) {
      const { error } = await supabasePublic
        .from("staff")
        .insert([{
          name:      form.name.trim(),
          phone:     form.phone.trim() || null,
          password:  form.password,
          role:      "staff",
          is_active: form.active,
        }]);
      if (!error) { closeModal(); onRefresh(); }
    } else {
      const update: Record<string, unknown> = {
        name:      form.name.trim(),
        phone:     form.phone.trim() || null,
        is_active: form.active,
      };
      if (form.password.trim()) update.password = form.password;

      const { error } = await supabasePublic
        .from("staff")
        .update(update)
        .eq("id", modal.id!);
      if (!error) { closeModal(); onRefresh(); }
    }
  }

  async function handleDelete(id: number) {
    await supabasePublic.from("staff").delete().eq("id", id);
    setDeleteId(null);
    onRefresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن موظف..."
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: C.text }} />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة موظف</span>
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "الاسم",         hide: "" },
                    { label: "رقم الهاتف",    hide: " hidden sm:table-cell" },
                    { label: "الباسورد",      hide: " hidden md:table-cell" },
                    { label: "الحالة",         hide: "" },
                    { label: "تاريخ الإنشاء", hide: " hidden lg:table-cell" },
                    { label: "إجراءات",        hide: "" },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا توجد نتائج</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>{r.name[0]}</div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.phone || "—"}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm font-mono" style={{ color: C.muted }}>
                      {r.password || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{
                          background: r.is_active ? `${C.green}22` : `${C.red}22`,
                          color:      r.is_active ? C.green : C.red,
                        }}>
                        {r.is_active ? "نشط" : "مش نشط"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.teal}22`, color: C.teal }}>تعديل</button>
                        <button onClick={() => setDeleteId(r.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} موظف
          </div>
        </div>
      </div>

      <TeamModal open={modal.open} title={isEdit ? "تعديل موظف" : "إضافة موظف جديد"}
        isEdit={isEdit} showStatus={true} form={form} setForm={setForm}
        onSave={handleSave} onClose={closeModal} />
      <DeleteModal open={deleteId !== null}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)} />
    </>
  );
}

/* ══════════════════════════════════════════
   TAB 3 — الدلفري
══════════════════════════════════════════ */

function DriversTab({
  drivers,
  onRefresh,
}: {
  drivers: DriverRow[];
  onRefresh: () => void;
}) {
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");

  const isEdit   = modal.id !== undefined;
  const filtered = drivers.filter((r) =>
    !search.trim() || r.name.includes(search) || (r.phone ?? "").includes(search),
  );

  function openAdd() { setForm(emptyForm); setModal({ open: true }); }
  function openEdit(r: DriverRow) {
    setForm({ name: r.name, phone: r.phone ?? "", password: "", active: r.is_active });
    setModal({ open: true, id: r.id });
  }
  function closeModal() { setModal({ open: false }); }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (!isEdit && !form.password.trim()) return;

    if (!isEdit) {
      const { error } = await supabasePublic
        .from("delivery_staff")
        .insert([{
          name:      form.name.trim(),
          phone:     form.phone.trim() || null,
          password:  form.password,
          is_active: form.active,
        }]);
      if (!error) { closeModal(); onRefresh(); }
    } else {
      const update: Record<string, unknown> = {
        name:      form.name.trim(),
        phone:     form.phone.trim() || null,
        is_active: form.active,
      };
      if (form.password.trim()) update.password = form.password;

      const { error } = await supabasePublic
        .from("delivery_staff")
        .update(update)
        .eq("id", modal.id!);
      if (!error) { closeModal(); onRefresh(); }
    }
  }

  async function handleDelete(id: number) {
    await supabasePublic.from("delivery_staff").delete().eq("id", id);
    setDeleteId(null);
    onRefresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن دلفري..."
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: C.text }} />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة دلفري</span>
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "الاسم",         hide: "" },
                    { label: "رقم الهاتف",    hide: " hidden sm:table-cell" },
                    { label: "الباسورد",      hide: " hidden md:table-cell" },
                    { label: "الحالة",         hide: "" },
                    { label: "تاريخ الإنشاء", hide: " hidden lg:table-cell" },
                    { label: "إجراءات",        hide: "" },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا توجد نتائج</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>{r.name[0]}</div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.phone || "—"}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm font-mono" style={{ color: C.muted }}>
                      {r.password || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{
                          background: r.is_active ? `${C.green}22` : `${C.red}22`,
                          color:      r.is_active ? C.green : C.red,
                        }}>
                        {r.is_active ? "نشط" : "مش نشط"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.teal}22`, color: C.teal }}>تعديل</button>
                        <button onClick={() => setDeleteId(r.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} دلفري
          </div>
        </div>
      </div>

      <TeamModal open={modal.open} title={isEdit ? "تعديل دلفري" : "إضافة دلفري جديد"}
        isEdit={isEdit} showStatus={true} form={form} setForm={setForm}
        onSave={handleSave} onClose={closeModal} />
      <DeleteModal open={deleteId !== null}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)} />
    </>
  );
}

/* ══════════════════════════════════════════
   Page
══════════════════════════════════════════ */

const TABS = ["المدراء", "الموظفين", "الدلفري"] as const;
type Tab = typeof TABS[number];

export default function AdminTeamPage() {
  const [tab,      setTab]      = useState<Tab>("المدراء");
  const [managers, setManagers] = useState<StaffRow[]>([]);
  const [staff,    setStaff]    = useState<StaffRow[]>([]);
  const [drivers,  setDrivers]  = useState<DriverRow[]>([]);

  async function fetchStaff() {
    const { data } = await supabasePublic.from("staff").select("*").order("created_at", { ascending: false });
    if (data) {
      setManagers(data.filter((u) => u.role === "admin"));
      setStaff(data.filter((u) => u.role === "staff"));
    }
  }

  async function fetchDrivers() {
    const { data, error } = await supabasePublic
      .from("delivery_staff")
      .select("*")
      .order("name");

    if (error) {
      console.error("fetchDrivers:", error);
    }

    setDrivers(data ?? []);
  }

  useEffect(() => {
    fetchStaff();
    fetchDrivers();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 p-1 rounded-xl self-start"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
            style={{ background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "المدراء"  && <AdminsTab managers={managers} onRefresh={fetchStaff} />}
      {tab === "الموظفين" && <StaffTab  staff={staff}       onRefresh={fetchStaff} />}
      {tab === "الدلفري"  && <DriversTab drivers={drivers}  onRefresh={fetchDrivers} />}
    </div>
  );
}
