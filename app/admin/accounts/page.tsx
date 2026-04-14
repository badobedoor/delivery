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

/* ─────────────────────────────────────────────
   EXISTING — Account management (unchanged)
───────────────────────────────────────────── */

type Account = {
  id:      number;
  name:    string;
  password: string;
  active:  boolean;
  created: string;
};

const emptyForm = { name: "", password: "", active: true };

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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              الاسم <span style={{ color: C.red }}>*</span>
            </label>
            <input type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="الاسم الكامل"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              الباسورد {!isEdit && <span style={{ color: C.red }}>*</span>}
              {isEdit && <span style={{ color: C.muted }}> (اتركه فارغاً للإبقاء عليه)</span>}
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? "••••••••" : "أدخل كلمة المرور"}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none pr-10"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-xs"
                style={{ color: C.muted }}>
                {showPw ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: C.muted }}>الحالة</span>
            <button onClick={() => setForm({ ...form, active: !form.active })}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: form.active ? `${C.green}22` : `${C.red}22`,
                color:      form.active ? C.green : C.red,
              }}>
              <span className="w-2 h-2 rounded-full" style={{ background: form.active ? C.green : C.red }} />
              {form.active ? "نشط" : "مش نشط"}
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
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

  function openAdd()           { setForm(emptyForm); setModal({ open: true }); }
  function openEdit(r: Account){ setForm({ name: r.name, password: "", active: r.active }); setModal({ open: true, id: r.id }); }
  function closeModal()         { setModal({ open: false }); }

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

  function handleDelete() { setRows((p) => p.filter((r) => r.id !== deleteId)); setDeleteId(null); }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
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
                    { label: "الباسورد",      hide: " hidden sm:table-cell" },
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا توجد نتائج</td>
                  </tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>{r.name[0]}</div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm tracking-widest" style={{ color: C.muted }}>••••••••</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: r.active ? `${C.green}22` : `${C.red}22`, color: r.active ? C.green : C.red }}>
                        {r.active ? "نشط" : "مش نشط"}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>{r.created}</td>
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

      <AccountModal open={modal.open} title={isEdit ? `تعديل ${entityLabel}` : `إضافة ${entityLabel} جديد`}
        isEdit={isEdit} form={form} setForm={setForm} onSave={handleSave} onClose={closeModal} />

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

/* ── TAB: ملخص (unchanged) ── */
function SummaryTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء",  value: "1,284",      color: C.teal   },
          { label: "إجمالي الطلبات", value: "8,740",      color: C.orange },
          { label: "إيرادات الشهر",  value: "94,320 ج.م", color: C.green  },
          { label: "عملاء محظورين",  value: "3",          color: C.red    },
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

/* ── TAB: فريق العمل (unchanged) ── */
const seedStaff: Account[] = [
  { id: 1, name: "أحمد الإداري", password: "pass123", active: true,  created: "١ يناير ٢٠٢٦"  },
  { id: 2, name: "نور المشرفة",  password: "pass456", active: true,  created: "١٥ يناير ٢٠٢٦" },
  { id: 3, name: "طارق الدعم",   password: "pass789", active: false, created: "١ فبراير ٢٠٢٦" },
];
function StaffTab() {
  const [rows, setRows] = useState<Account[]>(seedStaff);
  return <AccountTable rows={rows} setRows={setRows} addLabel="إضافة عضو" entityLabel="عضو" />;
}

/* ─────────────────────────────────────────────
   NEW — Wallet types & seed data
───────────────────────────────────────────── */

type DriverWallet = { id: number; name: string; phone: string; balance: number };
type MotoWallet   = { id: number; name: string; plate: string; balance: number };
type Transaction  = {
  id: number; date: string;
  type: "إضافة" | "خصم" | "تحويل";
  amount: number; from: string; to: string; note: string;
};

const seedDriverWallets: DriverWallet[] = [
  { id: 1, name: "كريم سعد",   phone: "0100-111-2233", balance: 1200 },
  { id: 2, name: "مصطفى علي",  phone: "0101-222-3344", balance: 850  },
  { id: 3, name: "عمر حسين",   phone: "0102-333-4455", balance: 2300 },
];

const seedMotoWallets: MotoWallet[] = [
  { id: 1, name: "موتوسيكل #1", plate: "أ ب ج 1234",  balance: 500  },
  { id: 2, name: "موتوسيكل #2", plate: "د ه و 5678",  balance: 1200 },
  { id: 3, name: "موتوسيكل #3", plate: "ز ح ط 9012",  balance: 300  },
];

const seedTransactions: Transaction[] = [
  { id: 1, date: "١٤ أبريل ٢٠٢٦", type: "إضافة", amount: 10000, from: "خزنة المكتب", to: "—",          note: "إيرادات الأسبوع"  },
  { id: 2, date: "١٣ أبريل ٢٠٢٦", type: "تحويل", amount: 1200,  from: "خزنة المكتب", to: "كريم سعد",   note: "راتب"             },
  { id: 3, date: "١٣ أبريل ٢٠٢٦", type: "خصم",   amount: 200,   from: "خزنة المكتب", to: "—",          note: "بنزين"            },
  { id: 4, date: "١٢ أبريل ٢٠٢٦", type: "تحويل", amount: 850,   from: "خزنة المكتب", to: "مصطفى علي",  note: "راتب"             },
  { id: 5, date: "١٢ أبريل ٢٠٢٦", type: "خصم",   amount: 150,   from: "موتوسيكل #1", to: "—",          note: "صيانة"            },
];

function fmtAmt(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

/* ─────────────────────────────────────────────
   NEW — Unified Financial Modal
───────────────────────────────────────────── */
const OP_TYPES = ["إضافة", "خصم", "تحويل"] as const;
type OpType = typeof OP_TYPES[number];

function FinancialModal({
  preFrom, driverWallets, motoWallets, onSubmit, onClose,
}: {
  preFrom: string;
  driverWallets: DriverWallet[];
  motoWallets: MotoWallet[];
  onSubmit: (type: OpType, from: string, to: string, amount: number, note: string) => void;
  onClose: () => void;
}) {
  const walletOptions = [
    { value: "office", label: "خزنة المكتب" },
    ...driverWallets.map((d) => ({ value: `driver-${d.id}`, label: `${d.name} — دلفري` })),
    ...motoWallets.map((m)   => ({ value: `moto-${m.id}`,   label: m.name })),
  ];

  const defaultTo = preFrom === "office"
    ? (driverWallets[0] ? `driver-${driverWallets[0].id}` : `moto-${motoWallets[0]?.id ?? 1}`)
    : "office";

  const [opType, setOpType] = useState<OpType>("إضافة");
  const [from,   setFrom]   = useState(preFrom || "office");
  const [to,     setTo]     = useState(defaultTo);
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");

  const toOptions = walletOptions.filter((o) => o.value !== from);

  function handleSubmit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onSubmit(opType, from, to, n, note.trim());
  }

  const opColor = opType === "إضافة" ? C.green : opType === "خصم" ? C.red : C.teal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>عملية مالية</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Op type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>نوع العملية</label>
            <div className="flex gap-2">
              {OP_TYPES.map((op) => {
                const col = op === "إضافة" ? C.green : op === "خصم" ? C.red : C.teal;
                const active = opType === op;
                return (
                  <button key={op} onClick={() => setOpType(op)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? col : `${col}18`,
                      color:      active ? "#fff" : col,
                      border:     `1px solid ${active ? col : `${col}44`}`,
                    }}>
                    {op}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${opColor}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {/* From wallet */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              {opType === "تحويل" ? "من خزنة" : "الخزنة"}
            </label>
            <select value={from}
              onChange={(e) => { setFrom(e.target.value); if (e.target.value === to) setTo(walletOptions.find(o => o.value !== e.target.value)?.value ?? "office"); }}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}>
              {walletOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* To wallet — only for تحويل */}
          {opType === "تحويل" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.muted }}>إلى خزنة</label>
              <select value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}>
                {toOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: راتب، مكافأة، بنزين، صيانة..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
            style={{ background: opColor, color: "#fff" }}>تأكيد العملية</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NEW — خزنة المكتب Tab
───────────────────────────────────────────── */
function OfficeWalletTab({ balance, transactions, onOpenModal }: {
  balance: number;
  transactions: Transaction[];
  onOpenModal: (pre?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">

      {/* Balance card */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة المكتب</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(balance)}</p>
        </div>
        <span style={{ fontSize: 40 }}>🏦</span>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button onClick={() => onOpenModal("office")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
          style={{ background: C.teal, color: "#fff" }}>
          <span>+</span> عملية جديدة
        </button>
      </div>

      {/* Transactions table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "التاريخ",  hide: "" },
                  { label: "النوع",    hide: "" },
                  { label: "المبلغ",   hide: "" },
                  { label: "من / إلى", hide: " hidden sm:table-cell" },
                  { label: "البيان",   hide: " hidden md:table-cell" },
                ].map(({ label, hide }) => (
                  <th key={label}
                    className={`px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد عمليات بعد
                  </td>
                </tr>
              ) : transactions.map((t, i) => {
                const col = t.type === "إضافة" ? C.green : t.type === "خصم" ? C.red : C.teal;
                return (
                  <tr key={t.id} style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>{t.date}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                        style={{ background: `${col}22`, color: col }}>{t.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>
                      {fmtAmt(t.amount)}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {t.from}
                      {t.to !== "—" && (
                        <span style={{ color: C.teal }}> ← {t.to}</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-2.5 text-xs" style={{ color: C.muted }}>
                      {t.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {transactions.length} عملية مسجلة
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NEW — خزنة الدلفري Tab
───────────────────────────────────────────── */
function DeliveryWalletTab({ drivers, onOpenModal }: {
  drivers: DriverWallet[];
  onOpenModal: (pre: string) => void;
}) {
  const total = drivers.reduce((s, d) => s + d.balance, 0);
  return (
    <div className="flex flex-col gap-4">

      {/* Total card */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة الدلفري</p>
          <p className="text-3xl font-black" style={{ color: C.orange }}>{fmtAmt(total)}</p>
        </div>
        <span style={{ fontSize: 40 }}>🛵</span>
      </div>

      {/* Drivers table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الاسم",       hide: "" },
                  { label: "رقم الهاتف", hide: " hidden sm:table-cell" },
                  { label: "الرصيد",      hide: "" },
                  { label: "إجراءات",    hide: "" },
                ].map(({ label, hide }) => (
                  <th key={label}
                    className={`px-4 py-3 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < drivers.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: `${C.orange}28`, color: C.orange }}>{d.name[0]}</div>
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{d.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {d.phone}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: d.balance >= 0 ? C.green : C.red }}>
                      {fmtAmt(d.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpenModal(`driver-${d.id}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal }}>إدارة</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {drivers.length} سائق
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NEW — خزنة الموتسكلات Tab
───────────────────────────────────────────── */
function MotoWalletTab({ motos, onOpenModal }: {
  motos: MotoWallet[];
  onOpenModal: (pre: string) => void;
}) {
  const total = motos.reduce((s, m) => s + m.balance, 0);
  return (
    <div className="flex flex-col gap-4">

      {/* Total card */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة الموتوسيكلات</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(total)}</p>
        </div>
        <span style={{ fontSize: 40 }}>🛵</span>
      </div>

      {/* Motos table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الموتوسيكل", hide: "" },
                  { label: "رقم اللوحة", hide: " hidden sm:table-cell" },
                  { label: "الرصيد",     hide: "" },
                  { label: "إجراءات",   hide: "" },
                ].map(({ label, hide }) => (
                  <th key={label}
                    className={`px-4 py-3 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {motos.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < motos.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: `${C.teal}20` }}>🛵</div>
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {m.plate}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: m.balance >= 0 ? C.green : C.red }}>
                      {fmtAmt(m.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpenModal(`moto-${m.id}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal }}>إدارة</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {motos.length} موتوسيكل
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

const TABS = ["ملخص", "فريق العمل", "خزنة الدلفري", "خزنة المكتب", "خزنة الموتسكلات"] as const;
type Tab = typeof TABS[number];

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<Tab>("ملخص");

  /* shared wallet state */
  const [officeBalance, setOfficeBalance] = useState(50000);
  const [driverWallets, setDriverWallets] = useState<DriverWallet[]>(seedDriverWallets);
  const [motoWallets,   setMotoWallets]   = useState<MotoWallet[]>(seedMotoWallets);
  const [transactions,  setTransactions]  = useState<Transaction[]>(seedTransactions);

  /* modal state — key forces re-mount & state reset on each open */
  const [modalKey,    setModalKey]    = useState(0);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalPreFrom, setModalPreFrom] = useState("office");

  function openModal(pre = "office") {
    setModalPreFrom(pre);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function getLabel(key: string): string {
    if (key === "office") return "خزنة المكتب";
    if (key.startsWith("driver-")) {
      const id = parseInt(key.split("-")[1]);
      return driverWallets.find((d) => d.id === id)?.name ?? key;
    }
    if (key.startsWith("moto-")) {
      const id = parseInt(key.split("-")[1]);
      return motoWallets.find((m) => m.id === id)?.name ?? key;
    }
    return key;
  }

  function adjustBalance(key: string, delta: number) {
    if (key === "office") {
      setOfficeBalance((b) => b + delta);
    } else if (key.startsWith("driver-")) {
      const id = parseInt(key.split("-")[1]);
      setDriverWallets((p) => p.map((d) => d.id === id ? { ...d, balance: d.balance + delta } : d));
    } else if (key.startsWith("moto-")) {
      const id = parseInt(key.split("-")[1]);
      setMotoWallets((p) => p.map((m) => m.id === id ? { ...m, balance: m.balance + delta } : m));
    }
  }

  function handleTransaction(type: OpType, from: string, to: string, amount: number, note: string) {
    if (type === "إضافة") adjustBalance(from, +amount);
    if (type === "خصم")   adjustBalance(from, -amount);
    if (type === "تحويل") { adjustBalance(from, -amount); adjustBalance(to, +amount); }

    const date = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    setTransactions((p) => [{
      id: Date.now(), date, type, amount,
      from: getLabel(from),
      to:   type === "تحويل" ? getLabel(to) : "—",
      note,
    }, ...p]);

    setModalOpen(false);
  }

  return (
    <>
      <div className="flex flex-col gap-5" dir="rtl">

        {/* Tabs */}
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

        {tab === "ملخص"             && <SummaryTab />}
        {tab === "فريق العمل"       && <StaffTab />}
        {tab === "خزنة الدلفري"     && <DeliveryWalletTab drivers={driverWallets} onOpenModal={openModal} />}
        {tab === "خزنة المكتب"      && <OfficeWalletTab balance={officeBalance} transactions={transactions} onOpenModal={openModal} />}
        {tab === "خزنة الموتسكلات"  && <MotoWalletTab motos={motoWallets} onOpenModal={openModal} />}

      </div>

      {/* Unified financial modal */}
      {modalOpen && (
        <FinancialModal
          key={modalKey}
          preFrom={modalPreFrom}
          driverWallets={driverWallets}
          motoWallets={motoWallets}
          onSubmit={handleTransaction}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
