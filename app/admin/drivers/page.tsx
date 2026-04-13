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

/* ─────────────────────── Types ─────────────────────── */

type Driver = {
  id: number;
  name: string;
  phone: string;
  moto: string;
  shifts: string[];
  active: boolean;
};

type Moto = {
  id: number;
  name: string;
  active: boolean;
};

/* ─────────────────────── Seed data ─────────────────── */

const SHIFT_OPTIONS = ["الوردية ١", "الوردية ٢", "الوردية ٣"];

const seedDrivers: Driver[] = [
  { id: 1, name: "كريم سعد",    phone: "0100-111-2233", moto: "ياماها ٢٠٢٣ - XR150",  shifts: ["الوردية ١", "الوردية ٢"], active: true  },
  { id: 2, name: "مصطفى علي",   phone: "0101-222-3344", moto: "هوندا ٢٠٢٢ - CB125",   shifts: ["الوردية ١"],               active: true  },
  { id: 3, name: "عمر حسين",    phone: "0102-333-4455", moto: "سوزوكي ٢٠٢٣ - GD110",  shifts: ["الوردية ٢"],               active: true  },
  { id: 4, name: "يوسف أحمد",   phone: "0103-444-5566", moto: "كيمكو ٢٠٢١ - Super 8", shifts: ["الوردية ٢", "الوردية ٣"], active: false },
  { id: 5, name: "إبراهيم رضا", phone: "0104-555-6677", moto: "TVS ٢٠٢٢ - Metro 110",  shifts: ["الوردية ٣"],               active: false },
];

const seedMotos: Moto[] = [
  { id: 1, name: "ياماها ٢٠٢٣ - XR150",   active: true  },
  { id: 2, name: "هوندا ٢٠٢٢ - CB125",    active: true  },
  { id: 3, name: "سوزوكي ٢٠٢٣ - GD110",   active: false },
];

/* ─────────────────────── Helpers ───────────────────── */

function StatusBadge({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
      style={{
        background: active ? `${C.green}22` : `${C.red}22`,
        color:      active ? C.green : C.red,
      }}
    >
      {active ? "نشط" : "مش نشط"}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-transparent outline-none"
        style={{ color: C.text }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ color: C.muted }}>✕</button>
      )}
    </div>
  );
}

function Modal({ open, title, onClose, onSave, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
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
        <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
    />
  );
}

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold" style={{ color: C.muted }}>الحالة</span>
      <button
        onClick={() => onChange(!active)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{ background: active ? `${C.green}22` : `${C.red}22`, color: active ? C.green : C.red }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: active ? C.green : C.red }} />
        {active ? "نشط" : "مش نشط"}
      </button>
    </div>
  );
}

/* ─────────────────────── Tab 1: Drivers ────────────── */

function DriversTab() {
  const [rows,   setRows]   = useState<Driver[]>(seedDrivers);
  const [search, setSearch] = useState("");
  const [modal,  setModal]  = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,   setForm]   = useState({ name: "", phone: "", moto: "", shifts: [] as string[], active: true });

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter(
    (r) => !search.trim() || r.name.includes(search) || r.phone.includes(search)
  );

  function openAdd() {
    setForm({ name: "", phone: "", moto: "", shifts: [], active: true });
    setModal({ open: true });
  }
  function openEdit(d: Driver) {
    setForm({ name: d.name, phone: d.phone, moto: d.moto, shifts: d.shifts, active: d.active });
    setModal({ open: true, id: d.id });
  }
  function close() { setModal({ open: false }); }

  function save() {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (!isEdit) {
      setRows((p) => [{ id: Date.now(), name: form.name.trim(), phone: form.phone.trim(), moto: form.moto, shifts: form.shifts, active: form.active }, ...p]);
    } else {
      setRows((p) => p.map((r) => r.id === modal.id ? { ...r, ...form, name: form.name.trim(), phone: form.phone.trim() } : r));
    }
    close();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* top bar */}
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن دلفري..." />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة دلفري</span>
          </button>
        </div>

        {/* table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "الاسم",     hide: ""                      },
                    { label: "الموبايل",  hide: " hidden sm:table-cell" },
                    { label: "الموتسكل", hide: " hidden md:table-cell" },
                    { label: "الورديات",  hide: " hidden lg:table-cell" },
                    { label: "الحالة",    hide: ""                      },
                    { label: "إجراءات",   hide: ""                      },
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
                ) : filtered.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>{d.name[0]}</div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{d.name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>{d.phone}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      🛵 {d.moto || "—"}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.shifts.length === 0 ? (
                          <span style={{ color: C.muted }}>—</span>
                        ) : d.shifts.map((s) => (
                          <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: `${C.teal}20`, color: C.teal }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={d.active} onToggle={() => setRows((p) => p.map((r) => r.id === d.id ? { ...r, active: !r.active } : r))} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(d)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.teal}22`, color: C.teal }}>
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} سائق
          </div>
        </div>
      </div>

      <Modal open={modal.open} title={isEdit ? "تعديل السائق" : "إضافة سائق جديد"} onClose={close} onSave={save}>
        <Field label="الاسم" required>
          <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="مثال: كريم سعد" />
        </Field>
        <Field label="الموبايل" required>
          <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="01XX-XXX-XXXX" type="tel" />
        </Field>
        <Field label="الموتسكل">
          <select value={form.moto} onChange={(e) => setForm({ ...form, moto: e.target.value })}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: form.moto ? C.text : C.muted, colorScheme: "dark" }}>
            <option value="">اختار موتسكل...</option>
            {seedMotos.map((m) => <option key={m.id} value={m.name}>🛵 {m.name}</option>)}
          </select>
        </Field>
        <Field label="الورديات">
          <div className="flex flex-col gap-2 rounded-xl px-3 py-3"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            {SHIFT_OPTIONS.map((s) => {
              const checked = form.shifts.includes(s);
              return (
                <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setForm({ ...form, shifts: checked ? form.shifts.filter((x) => x !== s) : [...form.shifts, s] })}
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: checked ? C.teal : "transparent", border: `1.5px solid ${checked ? C.teal : C.border}` }}
                  >
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: C.text }}>{s}</span>
                </label>
              );
            })}
          </div>
        </Field>
        <ActiveToggle active={form.active} onChange={(v) => setForm({ ...form, active: v })} />
      </Modal>
    </>
  );
}

/* ─────────────────────── Tab 2: Motorcycles ────────── */

function MotosTab() {
  const [rows,   setRows]   = useState<Moto[]>(seedMotos);
  const [search, setSearch] = useState("");
  const [modal,  setModal]  = useState<{ open: boolean; id?: number }>({ open: false });
  const [form,   setForm]   = useState({ name: "", active: true });

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter((r) => !search.trim() || r.name.includes(search));

  function openAdd() {
    setForm({ name: "", active: true });
    setModal({ open: true });
  }
  function openEdit(m: Moto) {
    setForm({ name: m.name, active: m.active });
    setModal({ open: true, id: m.id });
  }
  function close() { setModal({ open: false }); }

  function save() {
    if (!form.name.trim()) return;
    if (!isEdit) {
      setRows((p) => [{ id: Date.now(), name: form.name.trim(), active: form.active }, ...p]);
    } else {
      setRows((p) => p.map((r) => r.id === modal.id ? { ...r, name: form.name.trim(), active: form.active } : r));
    }
    close();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* top bar */}
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن موتسكل..." />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة موتسكل</span>
          </button>
        </div>

        {/* table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["اسم الموتسكل", "الحالة", "إجراءات"].map((col) => (
                    <th key={col} className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap"
                      style={{ color: C.muted }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا توجد نتائج</td></tr>
                ) : filtered.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛵</span>
                        <p className="text-sm font-semibold" style={{ color: C.text }}>{m.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={m.active} onToggle={() => setRows((p) => p.map((r) => r.id === m.id ? { ...r, active: !r.active } : r))} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(m)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.teal}22`, color: C.teal }}>
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {filtered.length} موتسكل
          </div>
        </div>
      </div>

      <Modal open={modal.open} title={isEdit ? "تعديل الموتسكل" : "إضافة موتسكل جديد"} onClose={close} onSave={save}>
        <Field label="اسم الموتسكل" required>
          <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="مثال: ياماها ٢٠٢٣ - XR150" />
        </Field>
        <ActiveToggle active={form.active} onChange={(v) => setForm({ ...form, active: v })} />
      </Modal>
    </>
  );
}

/* ─────────────────────── Page ──────────────────────── */

const TABS = ["الدلفري", "الموتسكلات"] as const;
type Tab = typeof TABS[number];

export default function AdminDriversPage() {
  const [tab, setTab] = useState<Tab>("الدلفري");

  return (
    <div className="flex flex-col gap-5">

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl self-start"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: tab === t ? C.teal : "transparent",
              color:      tab === t ? "#fff" : C.muted,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "الدلفري"     && <DriversTab />}
      {tab === "الموتسكلات"  && <MotosTab  />}

    </div>
  );
}
