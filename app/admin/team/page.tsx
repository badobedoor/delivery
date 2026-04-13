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

const CURRENT_ROLE: "super_admin" | "admin" = "super_admin";

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

          {/* الاسم */}
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

          {/* رقم الهاتف */}
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

          {/* الباسورد */}
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

          {/* الحالة (optional) */}
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
   TAB 1 — المدراء
══════════════════════════════════════════ */

type Admin = { id: number; name: string; phone: string; role: "super_admin" | "admin"; created: string };

const seedAdmins: Admin[] = [
  { id: 1, name: "أحمد الإداري", phone: "0100-111-0001", role: "super_admin", created: "١ يناير ٢٠٢٦"  },
  { id: 2, name: "خالد المشرف",  phone: "0101-222-0002", role: "admin",       created: "١٥ يناير ٢٠٢٦" },
  { id: 3, name: "دينا الإدارة", phone: "0102-333-0003", role: "admin",       created: "١ مارس ٢٠٢٦"   },
];

function AdminsTab() {
  const [rows,     setRows]     = useState<Admin[]>(seedAdmins);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isSuperAdmin = CURRENT_ROLE === "super_admin";

  function handleSave() {
    if (!form.name.trim() || !form.password.trim()) return;
    setRows((p) => [{
      id: Date.now(), name: form.name.trim(), phone: form.phone.trim(),
      role: "admin", created: "١٣ أبريل ٢٠٢٦",
    }, ...p]);
    setForm(emptyForm);
    setModal(false);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {isSuperAdmin && (
          <div className="flex justify-start">
            <button onClick={() => { setForm(emptyForm); setModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: C.orange, color: "#fff" }}>
              <span className="text-base leading-none">+</span> إضافة مدير
            </button>
          </div>
        )}

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
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: r.role === "super_admin" ? `${C.orange}30` : `${C.teal}30`, color: r.role === "super_admin" ? C.orange : C.teal }}>
                          {r.name[0]}
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.role === "super_admin" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{ background: `${C.green}22`, color: C.green }}>المدير الأساسي</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{ background: `${C.teal}22`, color: C.teal }}>مدير</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: `${C.green}22`, color: C.green }}>نشط</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.created}
                    </td>
                    <td className="px-4 py-3">
                      {r.role !== "super_admin" && isSuperAdmin ? (
                        <button onClick={() => setDeleteId(r.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                      ) : (
                        <span className="text-xs" style={{ color: C.muted }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {rows.length} مدير
          </div>
        </div>
      </div>

      <TeamModal open={modal} title="إضافة مدير جديد" isEdit={false} showStatus={false}
        form={form} setForm={setForm} onSave={handleSave} onClose={() => setModal(false)} />
      <DeleteModal open={deleteId !== null}
        onConfirm={() => { setRows((p) => p.filter((r) => r.id !== deleteId)); setDeleteId(null); }}
        onClose={() => setDeleteId(null)} />
    </>
  );
}

/* ══════════════════════════════════════════
   Shared TAB 2 & 3
══════════════════════════════════════════ */

type Member = { id: number; name: string; phone: string; password: string; active: boolean; created: string };

function MemberTab({ seed, addLabel, entityLabel }: {
  seed: Member[]; addLabel: string; entityLabel: string;
}) {
  const [rows,     setRows]     = useState<Member[]>(seed);
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter((r) => !search.trim() || r.name.includes(search) || r.phone.includes(search));

  function openAdd()    { setForm(emptyForm); setModal({ open: true }); }
  function openEdit(r: Member) {
    setForm({ name: r.name, phone: r.phone, password: "", active: r.active });
    setModal({ open: true, id: r.id });
  }
  function closeModal() { setModal({ open: false }); }

  function handleSave() {
    if (!form.name.trim()) return;
    if (!isEdit && !form.password.trim()) return;
    if (!isEdit) {
      setRows((p) => [{
        id: Date.now(), name: form.name.trim(), phone: form.phone.trim(),
        password: form.password, active: form.active, created: "١٣ أبريل ٢٠٢٦",
      }, ...p]);
    } else {
      setRows((p) => p.map((r) => r.id === modal.id ? {
        ...r,
        name:   form.name.trim(),
        phone:  form.phone.trim(),
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      } : r));
    }
    closeModal();
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
              placeholder={`ابحث عن ${entityLabel}...`}
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: C.text }} />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">{addLabel}</span>
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
                    <td className="hidden md:table-cell px-4 py-3 text-sm tracking-widest" style={{ color: C.muted }}>
                      ••••••••
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: r.active ? `${C.green}22` : `${C.red}22`, color: r.active ? C.green : C.red }}>
                        {r.active ? "نشط" : "مش نشط"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.created}
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
            {filtered.length} {entityLabel}
          </div>
        </div>
      </div>

      <TeamModal open={modal.open} title={isEdit ? `تعديل ${entityLabel}` : `إضافة ${entityLabel} جديد`}
        isEdit={isEdit} showStatus={true} form={form} setForm={setForm}
        onSave={handleSave} onClose={closeModal} />
      <DeleteModal open={deleteId !== null}
        onConfirm={() => { setRows((p) => p.filter((r) => r.id !== deleteId)); setDeleteId(null); }}
        onClose={() => setDeleteId(null)} />
    </>
  );
}

/* ── Seed data ── */

const seedStaff: Member[] = [
  { id: 1, name: "نور المشرفة", phone: "0100-111-1001", password: "staff111", active: true,  created: "١٥ يناير ٢٠٢٦" },
  { id: 2, name: "طارق الدعم",  phone: "0101-222-1002", password: "staff222", active: true,  created: "١ فبراير ٢٠٢٦" },
  { id: 3, name: "منى خدمة",    phone: "0102-333-1003", password: "staff333", active: false, created: "١٠ مارس ٢٠٢٦"  },
];

const seedDrivers: Member[] = [
  { id: 1, name: "كريم سعد",    phone: "0100-111-2001", password: "drv111", active: true,  created: "١٠ يناير ٢٠٢٦"  },
  { id: 2, name: "مصطفى علي",   phone: "0101-222-2002", password: "drv222", active: true,  created: "٢٠ يناير ٢٠٢٦"  },
  { id: 3, name: "عمر حسين",    phone: "0102-333-2003", password: "drv333", active: true,  created: "١ فبراير ٢٠٢٦"  },
  { id: 4, name: "يوسف أحمد",   phone: "0103-444-2004", password: "drv444", active: false, created: "١٥ فبراير ٢٠٢٦" },
  { id: 5, name: "إبراهيم رضا", phone: "0104-555-2005", password: "drv555", active: false, created: "١ مارس ٢٠٢٦"    },
];

/* ══════════════════════════════════════════
   Page
══════════════════════════════════════════ */

const TABS = ["المدراء", "الموظفين", "الدلفري"] as const;
type Tab = typeof TABS[number];

export default function AdminTeamPage() {
  const [tab, setTab] = useState<Tab>("المدراء");

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

      {tab === "المدراء"  && <AdminsTab />}
      {tab === "الموظفين" && <MemberTab seed={seedStaff}   addLabel="إضافة موظف"  entityLabel="موظف"  />}
      {tab === "الدلفري"  && <MemberTab seed={seedDrivers} addLabel="إضافة دلفري" entityLabel="دلفري" />}
    </div>
  );
}
