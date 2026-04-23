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

/* ── Types ── */
type MainSection = {
  id:     number;
  name:   string;
  icon:   string;
  order:  number;
  active: boolean;
};

type QuickSection = {
  id:     number;
  name:   string;
  icon:   string;
  link:   string;
  order:  number;
  active: boolean;
};

type MainForm  = { name: string; icon: string; order: string; active: boolean };
type QuickForm = { name: string; icon: string; link: string; order: string; active: boolean };


const emptyMain:  MainForm  = { name: "", icon: "", order: "1", active: true };
const emptyQuick: QuickForm = { name: "", icon: "", link: "", order: "1", active: true };

/* ── Delete modal ── */
function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-base font-black text-center" style={{ color: C.text }}>حذف القسم</p>
        <p className="text-sm text-center" style={{ color: C.muted }}>
          هل تريد حذف قسم <span style={{ color: C.red }}>{name}</span>؟ لا يمكن التراجع.
        </p>
        <div className="flex gap-3 mt-1">
          <button onClick={onClose}   className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.red, color: "#fff" }}>حذف</button>
        </div>
      </div>
    </div>
  );
}

/* ── Status toggle ── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? C.teal : C.border }}
    >
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ right: on ? "2px" : "auto", left: on ? "auto" : "2px" }} />
    </button>
  );
}

/* ── Main sections modal ── */
function MainModal({
  title, form, onChange, onSave, onClose, formErr, saving,
}: {
  title: string; form: MainForm; formErr: string | null; saving: boolean;
  onChange: (f: MainForm) => void; onSave: () => void; onClose: () => void;
}) {
  function set<K extends keyof MainForm>(k: K, v: MainForm[K]) { onChange({ ...form, [k]: v }); }
  const inp = { background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: C.border }}>
          <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: C.muted }}>✕</button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {formErr && (
            <p className="text-xs font-semibold text-center py-1.5 rounded-lg"
              style={{ background: `${C.red}22`, color: C.red }}>{formErr}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>اسم القسم</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="اسم القسم" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الأيقونة (emoji)</label>
            <div className="flex items-center gap-2">
              <input type="text" value={form.icon} onChange={(e) => set("icon", e.target.value)}
                placeholder="انسخ إيموجي والصقه هنا" className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none text-center text-lg" style={inp} />
              <a href="https://getemoji.com" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap hover:opacity-80 transition-opacity"
                style={{ background: `${C.teal}22`, color: C.teal }}>
                اختيار أيقونة
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-1/2">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الترتيب</label>
            <input type="number" min="1" value={form.order} onChange={(e) => set("order", e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: C.muted }}>الحالة</span>
            <Toggle on={form.active} onChange={(v) => set("active", v)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t" style={{ borderColor: C.border }}>
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onSave}  disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: C.orange, color: "#fff" }}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quick sections modal ── */
function QuickModal({
  title, form, onChange, onSave, onClose, formErr, saving,
}: {
  title: string; form: QuickForm; formErr: string | null; saving: boolean;
  onChange: (f: QuickForm) => void; onSave: () => void; onClose: () => void;
}) {
  function set<K extends keyof QuickForm>(k: K, v: QuickForm[K]) { onChange({ ...form, [k]: v }); }
  const inp = { background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: C.border }}>
          <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: C.muted }}>✕</button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {formErr && (
            <p className="text-xs font-semibold text-center py-1.5 rounded-lg"
              style={{ background: `${C.red}22`, color: C.red }}>{formErr}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>اسم القسم</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="اسم القسم" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الأيقونة (emoji)</label>
            <div className="flex items-center gap-2">
              <input type="text" value={form.icon} onChange={(e) => set("icon", e.target.value)}
                placeholder="انسخ إيموجي والصقه هنا" className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none text-center text-lg" style={inp} />
              <a href="https://getemoji.com" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap hover:opacity-80 transition-opacity"
                style={{ background: `${C.teal}22`, color: C.teal }}>
                اختيار أيقونة
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-1/2">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الترتيب</label>
            <input type="number" min="1" value={form.order} onChange={(e) => set("order", e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>الرابط</label>
            <input type="text" value={form.link} onChange={(e) => set("link", e.target.value)}
              placeholder="/category/sweets" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: C.muted }}>الحالة</span>
            <Toggle on={form.active} onChange={(v) => set("active", v)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t" style={{ borderColor: C.border }}>
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onSave}  disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: C.orange, color: "#fff" }}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared table ── */
function SectionTable<T extends { id: number; name: string; icon: string; order: number; active: boolean }>({
  rows, extraCol, onToggle, onEdit, onDelete,
}: {
  rows:     T[];
  extraCol: { label: string; render: (r: T) => React.ReactNode } | null;
  onToggle: (id: number) => void;
  onEdit:   (r: T) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: "الاسم",    hide: ""                      },
                { label: "الأيقونة", hide: ""                      },
                ...(extraCol ? [{ label: extraCol.label, hide: " hidden sm:table-cell" }] : []),
                { label: "الترتيب", hide: " hidden sm:table-cell" },
                { label: "الحالة",  hide: ""                      },
                { label: "إجراءات", hide: ""                      },
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
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>

                <td className="px-4 py-3">
                  <span className="text-sm font-semibold" style={{ color: C.text }}>{r.name}</span>
                </td>

                <td className="px-4 py-3 text-center text-xl">{r.icon}</td>

                {extraCol && (
                  <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: C.muted }}>
                    {extraCol.render(r)}
                  </td>
                )}

                <td className="hidden sm:table-cell px-4 py-3 text-center">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${C.teal}20`, color: C.teal }}>
                    {r.order}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <Toggle on={r.active} onChange={() => onToggle(r.id)} />
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(r)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal }}>
                      تعديل
                    </button>
                    <button onClick={() => onDelete(r.id)}
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
        {rows.length} أقسام
      </div>
    </div>
  );
}

type TabId = "main" | "quick";

export default function AdminSectionsPage() {
  const [tab,        setTab]        = useState<TabId>("main");
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* Main sections state */
  const [mainRows,    setMainRows]    = useState<MainSection[]>([]);
  const [mainModal,   setMainModal]   = useState<"add" | "edit" | null>(null);
  const [mainForm,    setMainForm]    = useState<MainForm>(emptyMain);
  const [mainEditId,  setMainEditId]  = useState<number | null>(null);
  const [mainDelId,   setMainDelId]   = useState<number | null>(null);
  const [mainFormErr, setMainFormErr] = useState<string | null>(null);
  const [mainSaving,  setMainSaving]  = useState(false);
  const [mainOpErr,   setMainOpErr]   = useState<string | null>(null);

  /* Quick sections state */
  const [quickRows,    setQuickRows]    = useState<QuickSection[]>([]);
  const [quickModal,   setQuickModal]   = useState<"add" | "edit" | null>(null);
  const [quickForm,    setQuickForm]    = useState<QuickForm>(emptyQuick);
  const [quickEditId,  setQuickEditId]  = useState<number | null>(null);
  const [quickDelId,   setQuickDelId]   = useState<number | null>(null);
  const [quickFormErr, setQuickFormErr] = useState<string | null>(null);
  const [quickSaving,  setQuickSaving]  = useState(false);
  const [quickOpErr,   setQuickOpErr]   = useState<string | null>(null);

  /* ── Fetch ── */
  useEffect(() => { fetchSections(); }, []);

  async function fetchSections() {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("app_sections")
      .select("id, name, icon, sort_order, is_active, type, link")
      .order("sort_order", { ascending: true });

    if (error) { setFetchError("تعذّر تحميل الأقسام"); setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const main: MainSection[]  = (data ?? []).filter((r: any) => r.type === "main").map((r: any) => ({
      id: r.id, name: r.name, icon: r.icon ?? "", order: r.sort_order, active: r.is_active,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quick: QuickSection[] = (data ?? []).filter((r: any) => r.type === "quick").map((r: any) => ({
      id: r.id, name: r.name, icon: r.icon ?? "", link: r.link ?? "", order: r.sort_order, active: r.is_active,
    }));

    setMainRows(main);
    setQuickRows(quick);
    setLoading(false);
  }

  /* ── Sequential shift: processes rows one-by-one to avoid unique-constraint conflicts ──
       delta=-1 (moving down): ascending order — lowest slot freed first
       delta=+1 (moving up):   descending order — highest slot freed first          ── */
  async function seqShift(rows: { id: number; order: number }[], delta: number): Promise<boolean> {
    const sorted = [...rows].sort((a, b) => delta === -1 ? a.order - b.order : b.order - a.order);
    for (const r of sorted) {
      const { error } = await supabase.from("app_sections").update({ sort_order: r.order + delta }).eq("id", r.id);
      if (error) { console.error("seqShift error:", error); return false; }
    }
    return true;
  }

  /* ── Main handlers ── */
  function openAddMain() {
    setMainForm({ ...emptyMain, order: String(mainRows.length + 1) });
    setMainEditId(null); setMainFormErr(null); setMainModal("add");
  }
  function openEditMain(r: MainSection) {
    setMainForm({ name: r.name, icon: r.icon, order: String(r.order), active: r.active });
    setMainEditId(r.id); setMainFormErr(null); setMainModal("edit");
  }
  async function saveMain() {
    const pos = Number(mainForm.order);

    /* ── Validation (sync) ── */
    if (mainModal === "add") {
      if (!mainForm.name.trim()) { setMainFormErr("اسم القسم مطلوب"); return; }
      if (!mainForm.icon.trim()) { setMainFormErr("الأيقونة مطلوبة"); return; }
      const max = mainRows.length + 1;
      if (!pos || pos < 1 || pos > max) { setMainFormErr(`الترتيب يجب أن يكون بين 1 و ${max}`); return; }
    } else if (mainEditId !== null) {
      if (!mainForm.name.trim()) { setMainFormErr("اسم القسم مطلوب"); return; }
      if (!mainForm.icon.trim()) { setMainFormErr("الأيقونة مطلوبة"); return; }
      const max = mainRows.length;
      if (!pos || pos < 1 || pos > max) { setMainFormErr(`الترتيب يجب أن يكون بين 1 و ${max}`); return; }
    }

    const snapshot = mainRows;
    setMainSaving(true);
    setMainFormErr(null);

    try {
      if (mainModal === "add") {
        // Shift rows >= pos up by +1 — descending so each slot is free before the next moves in
        const toShift = mainRows.filter((r) => r.order >= pos);
        if (toShift.length) {
          const ok = await seqShift(toShift, +1);
          if (!ok) { setMainFormErr("فشل الحفظ، حاول مرة أخرى"); return; }
        }

        const { data, error } = await supabase
          .from("app_sections")
          .insert({ name: mainForm.name.trim(), icon: mainForm.icon.trim(), type: "main", sort_order: pos, is_active: mainForm.active })
          .select("id, name, icon, sort_order, is_active")
          .single();
        if (error) { console.error(error); setMainFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

        const shifted = mainRows.map((r) => r.order >= pos ? { ...r, order: r.order + 1 } : r);
        setMainRows([...shifted, { id: data.id, name: data.name, icon: data.icon ?? "", order: data.sort_order, active: data.is_active }]
          .sort((a, b) => a.order - b.order));
        setMainModal(null);

      } else if (mainEditId !== null) {
        const oldPos = mainRows.find((r) => r.id === mainEditId)!.order;

        if (pos !== oldPos) {
          // Step 1: park target at a safe temp value to free its current slot
          const tempOrder = mainRows.length + 100;
          const { error: tempErr } = await supabase.from("app_sections")
            .update({ sort_order: tempOrder }).eq("id", mainEditId);
          if (tempErr) { console.error(tempErr); setMainFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

          // Step 2: shift affected rows sequentially into the freed slot
          const [lo, hi, delta] = pos > oldPos
            ? [oldPos + 1, pos,      -1]   // moving down → ascending, gap propagates upward
            : [pos,        oldPos - 1, +1]; // moving up   → descending, gap propagates downward
          const toShift = mainRows.filter((r) => r.id !== mainEditId && r.order >= lo && r.order <= hi);
          if (toShift.length) {
            const ok = await seqShift(toShift, delta);
            if (!ok) { setMainFormErr("فشل الحفظ، حاول مرة أخرى"); return; }
          }
        }

        // Step 3: update target row (sort_order + fields) — slot at pos is now free
        const { error } = await supabase.from("app_sections")
          .update({ name: mainForm.name.trim(), icon: mainForm.icon.trim(), sort_order: pos, is_active: mainForm.active })
          .eq("id", mainEditId);
        if (error) { console.error(error); setMainFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

        setMainRows((prev) => {
          const [lo, hi, delta] = pos > oldPos
            ? [oldPos + 1, pos,      -1]
            : [pos,        oldPos - 1, +1];
          return prev.map((r) => {
            if (r.id === mainEditId) return { ...r, name: mainForm.name.trim(), icon: mainForm.icon.trim(), order: pos, active: mainForm.active };
            if (pos !== oldPos && r.order >= lo && r.order <= hi) return { ...r, order: r.order + delta };
            return r;
          }).sort((a, b) => a.order - b.order);
        });
        setMainModal(null);
      }
    } catch (err) {
      console.error("saveMain error:", err);
      setMainRows(snapshot);
      setMainFormErr("حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setMainSaving(false);
    }
  }
  async function toggleMain(id: number) {
    const snapshot = mainRows;
    const row = mainRows.find((r) => r.id === id)!;
    const next = !row.active;
    setMainOpErr(null);
    setMainRows((p) => p.map((r) => r.id === id ? { ...r, active: next } : r));
    try {
      const { error } = await supabase.from("app_sections").update({ is_active: next }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("toggleMain error:", err);
      setMainRows(snapshot);
      setMainOpErr("فشل تغيير الحالة، حاول مرة أخرى");
    }
  }

  async function deleteMain() {
    const snapshot = mainRows;
    const row = mainRows.find((r) => r.id === mainDelId)!;
    setMainDelId(null);
    setMainOpErr(null);
    try {
      const { error } = await supabase.from("app_sections").update({ is_active: false }).eq("id", row.id);
      if (error) throw error;
      // Compact: shift rows after deleted position down by 1, ascending order
      const toShift = snapshot.filter((r) => r.id !== row.id && r.order > row.order);
      if (toShift.length) {
        const ok = await seqShift(toShift, -1);
        if (!ok) throw new Error("compact failed");
      }
      setMainRows(
        snapshot.filter((r) => r.id !== row.id)
                .map((r) => r.order > row.order ? { ...r, order: r.order - 1 } : r)
      );
    } catch (err) {
      console.error("deleteMain error:", err);
      setMainRows(snapshot);
      setMainOpErr("فشل الحذف، حاول مرة أخرى");
    }
  }

  /* ── Quick handlers ── */
  function openAddQuick() {
    setQuickForm({ ...emptyQuick, order: String(quickRows.length + 1) });
    setQuickEditId(null); setQuickFormErr(null); setQuickModal("add");
  }
  function openEditQuick(r: QuickSection) {
    setQuickForm({ name: r.name, icon: r.icon, link: r.link, order: String(r.order), active: r.active });
    setQuickEditId(r.id); setQuickFormErr(null); setQuickModal("edit");
  }
  async function saveQuick() {
    const pos = Number(quickForm.order);

    /* ── Validation (sync) ── */
    if (quickModal === "add") {
      if (!quickForm.name.trim())  { setQuickFormErr("اسم القسم مطلوب"); return; }
      if (!quickForm.icon.trim())  { setQuickFormErr("الأيقونة مطلوبة"); return; }
      if (!quickForm.link.trim())  { setQuickFormErr("الرابط مطلوب"); return; }
      if (!quickForm.link.startsWith("/")) { setQuickFormErr("يجب أن يبدأ الرابط بـ /"); return; }
      const max = quickRows.length + 1;
      if (!pos || pos < 1 || pos > max) { setQuickFormErr(`الترتيب يجب أن يكون بين 1 و ${max}`); return; }
    } else if (quickEditId !== null) {
      if (!quickForm.name.trim())  { setQuickFormErr("اسم القسم مطلوب"); return; }
      if (!quickForm.icon.trim())  { setQuickFormErr("الأيقونة مطلوبة"); return; }
      if (!quickForm.link.trim())  { setQuickFormErr("الرابط مطلوب"); return; }
      if (!quickForm.link.startsWith("/")) { setQuickFormErr("يجب أن يبدأ الرابط بـ /"); return; }
      const max = quickRows.length;
      if (!pos || pos < 1 || pos > max) { setQuickFormErr(`الترتيب يجب أن يكون بين 1 و ${max}`); return; }
    }

    const snapshot = quickRows;
    setQuickSaving(true);
    setQuickFormErr(null);

    try {
      if (quickModal === "add") {
        const toShift = quickRows.filter((r) => r.order >= pos);
        if (toShift.length) {
          const ok = await seqShift(toShift, +1);
          if (!ok) { setQuickFormErr("فشل الحفظ، حاول مرة أخرى"); return; }
        }

        const { data, error } = await supabase
          .from("app_sections")
          .insert({ name: quickForm.name.trim(), icon: quickForm.icon.trim(), type: "quick", link: quickForm.link.trim(), sort_order: pos, is_active: quickForm.active })
          .select("id, name, icon, link, sort_order, is_active")
          .single();
        if (error) { console.error(error); setQuickFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

        const shifted = quickRows.map((r) => r.order >= pos ? { ...r, order: r.order + 1 } : r);
        setQuickRows([...shifted, { id: data.id, name: data.name, icon: data.icon ?? "", link: data.link ?? "", order: data.sort_order, active: data.is_active }]
          .sort((a, b) => a.order - b.order));
        setQuickModal(null);

      } else if (quickEditId !== null) {
        const oldPos = quickRows.find((r) => r.id === quickEditId)!.order;

        if (pos !== oldPos) {
          // Step 1: park target at a safe temp value to free its current slot
          const tempOrder = quickRows.length + 100;
          const { error: tempErr } = await supabase.from("app_sections")
            .update({ sort_order: tempOrder }).eq("id", quickEditId);
          if (tempErr) { console.error(tempErr); setQuickFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

          // Step 2: shift affected rows sequentially into the freed slot
          const [lo, hi, delta] = pos > oldPos
            ? [oldPos + 1, pos,      -1]
            : [pos,        oldPos - 1, +1];
          const toShift = quickRows.filter((r) => r.id !== quickEditId && r.order >= lo && r.order <= hi);
          if (toShift.length) {
            const ok = await seqShift(toShift, delta);
            if (!ok) { setQuickFormErr("فشل الحفظ، حاول مرة أخرى"); return; }
          }
        }

        // Step 3: update target row — slot at pos is now free
        const { error } = await supabase.from("app_sections")
          .update({ name: quickForm.name.trim(), icon: quickForm.icon.trim(), link: quickForm.link.trim(), sort_order: pos, is_active: quickForm.active })
          .eq("id", quickEditId);
        if (error) { console.error(error); setQuickFormErr("فشل الحفظ، حاول مرة أخرى"); return; }

        setQuickRows((prev) => {
          const [lo, hi, delta] = pos > oldPos
            ? [oldPos + 1, pos,      -1]
            : [pos,        oldPos - 1, +1];
          return prev.map((r) => {
            if (r.id === quickEditId) return { ...r, name: quickForm.name.trim(), icon: quickForm.icon.trim(), link: quickForm.link.trim(), order: pos, active: quickForm.active };
            if (pos !== oldPos && r.order >= lo && r.order <= hi) return { ...r, order: r.order + delta };
            return r;
          }).sort((a, b) => a.order - b.order);
        });
        setQuickModal(null);
      }
    } catch (err) {
      console.error("saveQuick error:", err);
      setQuickRows(snapshot);
      setQuickFormErr("حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setQuickSaving(false);
    }
  }
  async function toggleQuick(id: number) {
    const snapshot = quickRows;
    const row = quickRows.find((r) => r.id === id)!;
    const next = !row.active;
    setQuickOpErr(null);
    setQuickRows((p) => p.map((r) => r.id === id ? { ...r, active: next } : r));
    try {
      const { error } = await supabase.from("app_sections").update({ is_active: next }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("toggleQuick error:", err);
      setQuickRows(snapshot);
      setQuickOpErr("فشل تغيير الحالة، حاول مرة أخرى");
    }
  }

  async function deleteQuick() {
    const snapshot = quickRows;
    const row = quickRows.find((r) => r.id === quickDelId)!;
    setQuickDelId(null);
    setQuickOpErr(null);
    try {
      const { error } = await supabase.from("app_sections").update({ is_active: false }).eq("id", row.id);
      if (error) throw error;
      const toShift = snapshot.filter((r) => r.id !== row.id && r.order > row.order);
      if (toShift.length) {
        const ok = await seqShift(toShift, -1);
        if (!ok) throw new Error("compact failed");
      }
      setQuickRows(
        snapshot.filter((r) => r.id !== row.id)
                .map((r) => r.order > row.order ? { ...r, order: r.order - 1 } : r)
      );
    } catch (err) {
      console.error("deleteQuick error:", err);
      setQuickRows(snapshot);
      setQuickOpErr("فشل الحذف، حاول مرة أخرى");
    }
  }

  const mainDelTarget  = mainRows.find((r)  => r.id === mainDelId);
  const quickDelTarget = quickRows.find((r) => r.id === quickDelId);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</p>
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-sm" style={{ color: C.red }}>{fetchError}</p>
      <button onClick={fetchSections} className="text-sm underline" style={{ color: C.teal }}>إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {(["main", "quick"] as TabId[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{ background: tab === t ? C.teal : "transparent", color: tab === t ? "#fff" : C.muted }}>
            {t === "main" ? "الأقسام الرئيسية" : "الأقسام السريعة"}
          </button>
        ))}
      </div>

      {/* ── TAB: الأقسام الرئيسية ── */}
      {tab === "main" && (
        <>
          {mainOpErr && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: `${C.red}22`, color: C.red }}>
              <span>{mainOpErr}</span>
              <button onClick={() => setMainOpErr(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={openAddMain}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: C.orange, color: "#fff" }}>
              <span>+</span> إضافة قسم
            </button>
          </div>
          <SectionTable
            rows={mainRows}
            extraCol={null}
            onToggle={toggleMain}
            onEdit={openEditMain}
            onDelete={setMainDelId}
          />
          {(mainModal === "add" || mainModal === "edit") && (
            <MainModal
              title={mainModal === "add" ? "إضافة قسم رئيسي" : "تعديل قسم رئيسي"}
              form={mainForm} onChange={setMainForm} onSave={saveMain} onClose={() => setMainModal(null)}
              formErr={mainFormErr} saving={mainSaving}
            />
          )}
          {mainDelId !== null && mainDelTarget && (
            <DeleteModal name={mainDelTarget.name} onConfirm={deleteMain} onClose={() => setMainDelId(null)} />
          )}
        </>
      )}

      {/* ── TAB: الأقسام السريعة ── */}
      {tab === "quick" && (
        <>
          {quickOpErr && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: `${C.red}22`, color: C.red }}>
              <span>{quickOpErr}</span>
              <button onClick={() => setQuickOpErr(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={openAddQuick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: C.orange, color: "#fff" }}>
              <span>+</span> إضافة قسم
            </button>
          </div>
          <SectionTable
            rows={quickRows}
            extraCol={{ label: "الرابط", render: (r) => (r as QuickSection).link }}
            onToggle={toggleQuick}
            onEdit={openEditQuick as (r: { id: number; name: string; icon: string; order: number; active: boolean }) => void}
            onDelete={setQuickDelId}
          />
          {(quickModal === "add" || quickModal === "edit") && (
            <QuickModal
              title={quickModal === "add" ? "إضافة قسم سريع" : "تعديل قسم سريع"}
              form={quickForm} onChange={setQuickForm} onSave={saveQuick} onClose={() => setQuickModal(null)}
              formErr={quickFormErr} saving={quickSaving}
            />
          )}
          {quickDelId !== null && quickDelTarget && (
            <DeleteModal name={quickDelTarget.name} onConfirm={deleteQuick} onClose={() => setQuickDelId(null)} />
          )}
        </>
      )}

    </div>
  );
}
