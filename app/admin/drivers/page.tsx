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

/* ─────────────────────── Types ─────────────────────── */

type Assignment = {
  id:              number;
  driver_id:       number;
  driver_name:     string;
  motorcycle_id:   string;
  motorcycle_name: string;
  shift_id:        number;
  shift_num:       number;
  is_active:       boolean;
};

type StaffMember = { id: number; name: string };
type Moto        = { id: string; name: string; active: boolean };
type Shift       = { id: number; num: number };

type AssignForm = {
  driver_id:     string;
  motorcycle_id: string;
  shift_ids:     number[];
  is_active:     boolean;
};
type AssignFormErrs = Partial<Record<"driver_id" | "motorcycle_id" | "shift_ids", string>>;

const emptyAssignForm: AssignForm = { driver_id: "", motorcycle_id: "", shift_ids: [], is_active: true };

/* ─────────────────────── Row mappers ───────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromAssignmentRow(r: any): Assignment {
  return {
    id:              r.id,
    driver_id:       r.delivery_id,
    driver_name:     r.delivery_staff?.name || "—",
    motorcycle_id:   r.motorcycle_id ?? "",
    motorcycle_name: (r.motorcycles   as { name: string } | null)?.name ?? "—",
    shift_id:        r.shift_id,
    shift_num:       (r.shifts as { num: number } | null)?.num ?? 0,
    is_active:       r.is_active ?? true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromMotoRow(r: any): Moto {
  return { id: r.id, name: r.name ?? "", active: r.is_active ?? true };
}

/* ─────────────────────── Shared UI ─────────────────── */

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold"
      style={{ background: `${C.red}22`, color: C.red }}>
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-3 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

function StatusBadge({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
      style={{ background: active ? `${C.green}22` : `${C.red}22`, color: active ? C.green : C.red }}
    >
      {active ? "نشط" : "مش نشط"}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-transparent outline-none"
        style={{ color: C.text }}
      />
      {value && <button onClick={() => onChange("")} style={{ color: C.muted }}>✕</button>}
    </div>
  );
}

function Modal({ open, title, onClose, onSave, saving = false, children }: {
  open: boolean; title: string; onClose: () => void; onSave: () => void;
  saving?: boolean; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (!saving && e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>{title}</h2>
          <button onClick={onClose} disabled={saving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70 disabled:opacity-40"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: C.orange, color: "#fff" }}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity disabled:opacity-40"
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

function TextInput({ value, onChange, placeholder, type = "text", hasError = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hasError?: boolean;
}) {
  return (
    <input
      type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{ background: C.bg, border: `1px solid ${hasError ? C.red : C.border}`, color: C.text }}
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

/* ─────────────────────── Tab 1: Assignments ────────── */

function DriversTab({ staffList, motos, shifts }: {
  staffList: StaffMember[]; motos: Moto[]; shifts: Shift[];
}) {
  const [rows,     setRows]     = useState<Assignment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [opErr,    setOpErr]    = useState<string | null>(null);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<AssignForm>(emptyAssignForm);
  const [formErrs, setFormErrs] = useState<AssignFormErrs>({});

  useEffect(() => { fetchAssignments(); }, []);

  async function fetchAssignments() {
    setLoading(true);
    setOpErr(null);
    try {
      const { data, error } = await supabase
        .from("delivery_shifts")
        .select(`
          id, delivery_id, motorcycle_id, shift_id, is_active,
          delivery_staff ( name ),
          motorcycles ( name ),
          shifts ( num )
        `)
        .order("delivery_id");
      if (error) throw error;
      setRows((data ?? []).map(fromAssignmentRow));
    } catch (err) {
      console.error("fetchAssignments:", err);
      setOpErr("تعذّر تحميل التعيينات");
    } finally {
      setLoading(false);
    }
  }

  const filtered = rows.filter(
    (r) => !search.trim() || r.driver_name.includes(search) || r.motorcycle_name.includes(search)
  );

  function openModal() { setForm(emptyAssignForm); setFormErrs({}); setSaveErr(null); setModal(true); }
  function close()     { if (saving) return; setModal(false); setFormErrs({}); setSaveErr(null); }

  function validate(): boolean {
    const errs: AssignFormErrs = {};
    if (!form.driver_id)             errs.driver_id    = "يجب اختيار سائق";
    if (!form.motorcycle_id) {
      errs.motorcycle_id = "يجب اختيار موتوسيكل";
    } else {
      const conflict = rows.some((r) =>
        r.motorcycle_id === form.motorcycle_id &&
        r.is_active &&
        form.shift_ids.includes(r.shift_id)
      );
      if (conflict) errs.motorcycle_id = "هذا الموتوسيكل مستخدم في نفس الوردية";
    }
    if (form.shift_ids.length === 0) {
      errs.shift_ids = "اختر وردية واحدة على الأقل";
    } else {
      const duplicate = rows.some((r) =>
        r.driver_id === Number(form.driver_id) &&
        form.shift_ids.includes(r.shift_id)
      );
      if (duplicate) errs.shift_ids = "هذا السائق يعمل بالفعل في هذه الوردية";
    }
    setFormErrs(errs);
    return Object.keys(errs).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const { error } = await supabase.from("delivery_shifts").insert(
        form.shift_ids.map((sid) => ({
          delivery_id:   form.driver_id,
          motorcycle_id: form.motorcycle_id,
          shift_id:      sid,
          is_active:     form.is_active,
        }))
      );
      if (error) throw error;
      await fetchAssignments();
      close();
    } catch (err: unknown) {
      console.error("saveAssign:", err);
      const msg = err instanceof Error ? err.message : null;
      setSaveErr(msg || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: Assignment) {
    const snapshot = rows;
    const next = !a.is_active;
    setOpErr(null);
    setRows((p) => p.map((r) => r.id === a.id ? { ...r, is_active: next } : r));
    try {
      const { error } = await supabase
        .from("delivery_shifts")
        .update({ is_active: next })
        .eq("id", a.id);
      if (error) throw error;
    } catch (err) {
      console.error("toggleAssign:", err);
      setRows(snapshot);
      setOpErr("فشل تغيير الحالة، حاول مرة أخرى");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {opErr && <ErrorBanner msg={opErr} onDismiss={() => setOpErr(null)} />}

        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن سائق أو موتسكل..." />
          <button onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">تشغيل سائق</span>
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    { label: "السائق",    hide: ""                      },
                    { label: "الموتسكل", hide: " hidden sm:table-cell" },
                    { label: "الوردية",   hide: " hidden md:table-cell" },
                    { label: "الحالة",    hide: ""                      },
                  ].map(({ label, hide }) => (
                    <th key={label}
                      className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                      style={{ color: C.muted }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>لا توجد تعيينات</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: `${C.teal}30`, color: C.teal }}>
                          {a.driver_name[0]}
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{a.driver_name}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      🛵 {a.motorcycle_name}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: `${C.teal}20`, color: C.teal }}>
                        الوردية {a.shift_num}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={a.is_active} onToggle={() => toggleActive(a)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
            {loading ? "..." : `${filtered.length} تعيين`}
          </div>
        </div>
      </div>

      <Modal open={modal} title="تشغيل سائق" onClose={close} onSave={save} saving={saving}>
        {saveErr && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold text-center"
            style={{ background: `${C.red}22`, color: C.red }}>
            {saveErr}
          </div>
        )}

        <Field label="السائق" required>
          <select
            value={form.driver_id}
            onChange={(e) => { setForm({ ...form, driver_id: e.target.value }); setFormErrs((p) => ({ ...p, driver_id: undefined })); }}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: C.bg,
              border: `1px solid ${formErrs.driver_id ? C.red : C.border}`,
              color: form.driver_id ? C.text : C.muted,
              colorScheme: "dark",
            }}
          >
            <option value="">اختار سائق...</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {formErrs.driver_id && <p className="text-xs font-semibold" style={{ color: C.red }}>{formErrs.driver_id}</p>}
        </Field>

        <Field label="الموتسكل" required>
          <select
            value={form.motorcycle_id}
            onChange={(e) => { setForm({ ...form, motorcycle_id: e.target.value }); setFormErrs((p) => ({ ...p, motorcycle_id: undefined })); }}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: C.bg,
              border: `1px solid ${formErrs.motorcycle_id ? C.red : C.border}`,
              color: form.motorcycle_id ? C.text : C.muted,
              colorScheme: "dark",
            }}
          >
            <option value="">اختار موتسكل...</option>
            {motos.filter((m) => m.active).map((m) => (
              <option key={m.id} value={m.id}>🛵 {m.name}</option>
            ))}
          </select>
          {formErrs.motorcycle_id && <p className="text-xs font-semibold" style={{ color: C.red }}>{formErrs.motorcycle_id}</p>}
        </Field>

        <Field label="الورديات" required>
          <div className="flex flex-col gap-2 rounded-xl px-3 py-3"
            style={{ background: C.bg, border: `1px solid ${formErrs.shift_ids ? C.red : C.border}` }}>
            {shifts.length === 0 ? (
              <p className="text-xs" style={{ color: C.muted }}>لا توجد ورديات</p>
            ) : shifts.map((s) => {
              const checked = form.shift_ids.includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => {
                      setForm({ ...form, shift_ids: checked ? form.shift_ids.filter((x) => x !== s.id) : [...form.shift_ids, s.id] });
                      setFormErrs((p) => ({ ...p, shift_ids: undefined }));
                    }}
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: checked ? C.teal : "transparent", border: `1.5px solid ${checked ? C.teal : C.border}` }}
                  >
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: C.text }}>الوردية {s.num}</span>
                </label>
              );
            })}
          </div>
          {formErrs.shift_ids && <p className="text-xs font-semibold" style={{ color: C.red }}>{formErrs.shift_ids}</p>}
        </Field>

        <ActiveToggle active={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
      </Modal>
    </>
  );
}

/* ─────────────────────── Tab 2: Motorcycles ────────── */

function MotosTab({ onRefresh }: { onRefresh: () => void }) {
  const [rows,    setRows]    = useState<Moto[]>([]);
  const [loading, setLoading] = useState(true);
  const [opErr,   setOpErr]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState<{ open: boolean; id?: string }>({ open: false });
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name: "", active: true });
  const [nameErr, setNameErr] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => { fetchMotos(); }, []);

  async function fetchMotos() {
    setLoading(true);
    setOpErr(null);
    try {
      const { data, error } = await supabase
        .from("motorcycles")
        .select("id, name, is_active")
        .order("name");
      if (error) throw error;
      setRows((data ?? []).map(fromMotoRow));
    } catch (err) {
      console.error("fetchMotos:", err);
      setOpErr("تعذّر تحميل الموتسكلات");
    } finally {
      setLoading(false);
    }
  }

  const isEdit   = modal.id !== undefined;
  const filtered = rows.filter((r) => !search.trim() || r.name.includes(search));

  function openAdd()         { setForm({ name: "", active: true }); setNameErr(""); setSaveErr(null); setModal({ open: true }); }
  function openEdit(m: Moto) { setForm({ name: m.name, active: m.active }); setNameErr(""); setSaveErr(null); setModal({ open: true, id: m.id }); }
  function close()           { if (saving) return; setModal({ open: false }); setNameErr(""); setSaveErr(null); }

  async function save() {
    if (!form.name.trim()) { setNameErr("اسم الموتسكل مطلوب"); return; }
    setSaving(true);
    setSaveErr(null);
    setNameErr("");
    try {
      if (!isEdit) {
        const { error } = await supabase.from("motorcycles")
          .insert({ name: form.name.trim(), is_active: form.active });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("motorcycles")
          .update({ name: form.name.trim(), is_active: form.active })
          .eq("id", modal.id);
        if (error) throw error;
      }
      await fetchMotos();
      onRefresh();
      close();
    } catch (err) {
      console.error("saveMoto:", err);
      setSaveErr("فشل الحفظ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: Moto) {
    const snapshot = rows;
    const next = !m.active;
    setOpErr(null);
    setRows((p) => p.map((r) => r.id === m.id ? { ...r, active: next } : r));
    try {
      const { error } = await supabase.from("motorcycles").update({ is_active: next }).eq("id", m.id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error("toggleMoto:", err);
      setRows(snapshot);
      setOpErr("فشل تغيير الحالة، حاول مرة أخرى");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {opErr && <ErrorBanner msg={opErr} onDismiss={() => setOpErr(null)} />}

        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن موتسكل..." />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.orange, color: "#fff" }}>
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">إضافة موتسكل</span>
          </button>
        </div>

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
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-12 text-center text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
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
                      <StatusBadge active={m.active} onToggle={() => toggleActive(m)} />
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
            {loading ? "..." : `${filtered.length} موتسكل`}
          </div>
        </div>
      </div>

      <Modal open={modal.open} title={isEdit ? "تعديل الموتسكل" : "إضافة موتسكل جديد"}
        onClose={close} onSave={save} saving={saving}>
        {saveErr && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold text-center"
            style={{ background: `${C.red}22`, color: C.red }}>
            {saveErr}
          </div>
        )}
        <Field label="اسم الموتسكل" required>
          <TextInput
            value={form.name}
            onChange={(v) => { setForm({ ...form, name: v }); setNameErr(""); }}
            placeholder="مثال: ياماها ٢٠٢٣ - XR150"
            hasError={!!nameErr}
          />
          {nameErr && <p className="text-xs font-semibold" style={{ color: C.red }}>{nameErr}</p>}
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
  const [tab,       setTab]       = useState<Tab>("الدلفري");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [motos,     setMotos]     = useState<Moto[]>([]);
  const [shifts,    setShifts]    = useState<Shift[]>([]);

  useEffect(() => { fetchShared(); }, []);

  async function fetchShared() {
    try {
      const [staffRes, motosRes, shiftsRes] = await Promise.all([
        supabase.from("delivery_staff").select("id, name").eq("is_active", true).order("name"),
        supabase.from("motorcycles").select("id, name, is_active").order("name"),
        supabase.from("shifts").select("id, num").eq("is_active", true).order("num"),
      ]);
      if (staffRes.error)  console.error("fetchStaff:",  staffRes.error);
      if (motosRes.error)  console.error("fetchMotos:",  motosRes.error);
      if (shiftsRes.error) console.error("fetchShifts:", shiftsRes.error);
      setStaffList((staffRes.data  ?? []).map((r) => ({ id: r.id, name: r.name ?? "" })));
      setMotos((motosRes.data  ?? []).map(fromMotoRow));
      setShifts((shiftsRes.data ?? []).map((r) => ({ id: r.id, num: r.num })));
    } catch (err) {
      console.error("fetchShared:", err);
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <div className="flex gap-1 p-1 rounded-xl self-start"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "الدلفري"     && <DriversTab staffList={staffList} motos={motos} shifts={shifts} />}
      {tab === "الموتسكلات"  && <MotosTab   onRefresh={fetchShared} />}

    </div>
  );
}
