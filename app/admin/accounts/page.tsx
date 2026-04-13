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

/* ─── Shared account row type ─── */
type Account = {
  id:      number;
  name:    string;
  password: string;
  active:  boolean;
  created: string;
};

const emptyForm = { name: "", password: "", active: true };

/* ─── Shared modal ─── */
function AccountModal({
  open, title, isEdit, form, setForm, onSave, onClose,
}: {
  open: boolean;
  title: string;
  isEdit: boolean;
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">

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

          {/* الباسورد */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              الباسورد {!isEdit && <span style={{ color: C.red }}>*</span>}
              {isEdit && <span style={{ color: C.muted }}> (اتركه فارغاً للإبقاء عليه)</span>}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? "••••••••" : "أدخل كلمة المرور"}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none pr-10"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-xs"
                style={{ color: C.muted }}
              >
                {showPw ? "إخفاء" : "إظهار"}
              </button>
            </div>
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
              <span className="w-2 h-2 rounded-full" style={{ background: form.active ? C.green : C.red }} />
              {form.active ? "نشط" : "مش نشط"}
            </button>
          </div>

        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={onSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            حفظ
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── Shared account table ─── */
function AccountTable({
  rows, setRows, addLabel, entityLabel,
}: {
  rows: Account[];
  setRows: React.Dispatch<React.SetStateAction<Account[]>>;
  addLabel: string;
  entityLabel: string;
}) {
  const [modal,    setModal]    = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,     setForm]     = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter((r) => !search.trim() || r.name.includes(search));

  function openAdd() {
    setForm(emptyForm);
    setModal({ open: true });
  }
  function openEdit(r: Account) {
    setForm({ name: r.name, password: "", active: r.active });
    setModal({ open: true, id: r.id });
  }
  function closeModal() { setModal({ open: false }); }

  function handleSave() {
    if (!form.name.trim()) return;
    if (!isEdit && !form.password.trim()) return;
    const now = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    if (!isEdit) {
      setRows((p) => [{ id: Date.now(), name: form.name.trim(), password: form.password, active: form.active, created: now }, ...p]);
    } else {
      setRows((p) => p.map((r) => r.id === modal.id
        ? { ...r, name: form.name.trim(), active: form.active, ...(form.password ? { password: form.password } : {}) }
        : r));
    }
    closeModal();
  }

  function handleDelete() {
    setRows((p) => p.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* top bar */}
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
              placeholder={`ابحث عن ${entityLabel}...`}
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
            />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">{addLabel}</span>
          </button>
        </div>

        {/* table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "الاسم",         hide: "" },
                    { label: "الباسورد",      hide: " hidden sm:table-cell" },
                    { label: "الحالة",         hide: "" },
                    { label: "تاريخ الإنشاء", hide: " hidden md:table-cell" },
                    { label: "إجراءات",        hide: "" },
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                    {/* الاسم */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>{r.name[0]}</div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>

                    {/* الباسورد */}
                    <td className="hidden sm:table-cell px-4 py-3 text-sm tracking-widest" style={{ color: C.muted }}>
                      ••••••••
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{
                          background: r.active ? `${C.green}22` : `${C.red}22`,
                          color:      r.active ? C.green : C.red,
                        }}>
                        {r.active ? "نشط" : "مش نشط"}
                      </span>
                    </td>

                    {/* تاريخ الإنشاء */}
                    <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.created}
                    </td>

                    {/* إجراءات */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ background: `${C.teal}22`, color: C.teal }}>
                          تعديل
                        </button>
                        <button onClick={() => setDeleteId(r.id)}
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
            {filtered.length} {entityLabel}
          </div>
        </div>
      </div>

      <AccountModal
        open={modal.open}
        title={isEdit ? `تعديل ${entityLabel}` : `إضافة ${entityLabel} جديد`}
        isEdit={isEdit}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="w-full max-w-xs rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🗑️</span>
              <p className="text-base font-black" style={{ color: C.text }}>تأكيد الحذف</p>
              <p className="text-sm" style={{ color: C.muted }}>هل أنت متأكد؟ لا يمكن التراجع.</p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.red, color: "#fff" }}>حذف</button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════
   TAB 1 — ملخص
══════════════════════════════════════════ */

function SummaryTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء",   value: "1,284",      color: C.teal   },
          { label: "إجمالي الطلبات",  value: "8,740",      color: C.orange },
          { label: "إيرادات الشهر",   value: "94,320 ج.م", color: C.green  },
          { label: "عملاء محظورين",   value: "3",          color: C.red    },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs"             style={{ color: C.muted  }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-4" style={{ color: C.text }}>أكثر العملاء طلباً 🏆</h3>
        <div className="flex flex-col gap-3">
          {[
            { name: "أحمد محمد",  orders: 48, total: "3,840 ج.م" },
            { name: "سارة علي",   orders: 36, total: "2,910 ج.م" },
            { name: "محمود خالد", orders: 31, total: "2,480 ج.م" },
          ].map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: C.teal }}>{i + 1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: `${C.teal}30`, color: C.teal }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.text }}>{c.name}</p>
                <p className="text-xs" style={{ color: C.muted }}>{c.orders} طلب</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: C.teal }}>{c.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 2 — فريق العمل
══════════════════════════════════════════ */

const seedStaff: Account[] = [
  { id: 1, name: "أحمد الإداري",  password: "pass123", active: true,  created: "١ يناير ٢٠٢٦"   },
  { id: 2, name: "نور المشرفة",   password: "pass456", active: true,  created: "١٥ يناير ٢٠٢٦"  },
  { id: 3, name: "طارق الدعم",    password: "pass789", active: false, created: "١ فبراير ٢٠٢٦"  },
];

function StaffTab() {
  const [rows, setRows] = useState<Account[]>(seedStaff);
  return <AccountTable rows={rows} setRows={setRows} addLabel="إضافة عضو" entityLabel="عضو" />;
}

/* ══════════════════════════════════════════
   TAB 3 — الدلفري
══════════════════════════════════════════ */

const seedDriverAccounts: Account[] = [
  { id: 1, name: "كريم سعد",    password: "drv111", active: true,  created: "١٠ يناير ٢٠٢٦"  },
  { id: 2, name: "مصطفى علي",   password: "drv222", active: true,  created: "٢٠ يناير ٢٠٢٦"  },
  { id: 3, name: "عمر حسين",    password: "drv333", active: true,  created: "١ فبراير ٢٠٢٦"  },
  { id: 4, name: "يوسف أحمد",   password: "drv444", active: false, created: "١٥ فبراير ٢٠٢٦" },
  { id: 5, name: "إبراهيم رضا", password: "drv555", active: false, created: "١ مارس ٢٠٢٦"    },
];

function DriversAccountsTab() {
  const [rows, setRows] = useState<Account[]>(seedDriverAccounts);
  return <AccountTable rows={rows} setRows={setRows} addLabel="إضافة دلفري" entityLabel="دلفري" />;
}

/* ══════════════════════════════════════════
   Page
══════════════════════════════════════════ */

const TABS = ["ملخص", "فريق العمل", "الدلفري"] as const;
type Tab = typeof TABS[number];

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<Tab>("ملخص");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 p-1 rounded-xl self-start overflow-x-auto max-w-full"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
            style={{
              background: tab === t ? C.teal : "transparent",
              color:      tab === t ? "#fff" : C.muted,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "ملخص"       && <SummaryTab          />}
      {tab === "فريق العمل" && <StaffTab            />}
      {tab === "الدلفري"    && <DriversAccountsTab  />}
    </div>
  );
}
