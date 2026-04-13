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

/* ── Seed data ── */
const seedMain: MainSection[] = [
  { id: 1, name: "مطاعم",          icon: "🍔", order: 1, active: true  },
  { id: 2, name: "بقالة",           icon: "🛒", order: 2, active: true  },
  { id: 3, name: "لحوم ودواجن",    icon: "🥩", order: 3, active: true  },
  { id: 4, name: "خضار",            icon: "🥦", order: 4, active: true  },
  { id: 5, name: "صيدلية",          icon: "💊", order: 5, active: true  },
  { id: 6, name: "خدمات وتموين",   icon: "🔧", order: 6, active: true  },
  { id: 7, name: "طلب مخصص",        icon: "📝", order: 7, active: false },
];

const seedQuick: QuickSection[] = [
  { id: 1, name: "طلباتك السابقة",  icon: "🕐", link: "/orders/history",  order: 1, active: true  },
  { id: 2, name: "اطلب واكسب",      icon: "🎁", link: "/rewards",          order: 2, active: true  },
  { id: 3, name: "الحلويات",         icon: "🍰", link: "/category/sweets",  order: 3, active: true  },
  { id: 4, name: "وجبة اليوم",       icon: "⭐", link: "/meal-of-day",      order: 4, active: false },
];

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
  title, form, onChange, onSave, onClose,
}: {
  title: string; form: MainForm;
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>اسم القسم</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="اسم القسم" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>الأيقونة (emoji)</label>
              <input type="text" value={form.icon} onChange={(e) => set("icon", e.target.value)}
                placeholder="🍔" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center text-lg" style={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>الترتيب</label>
              <input type="number" min="1" value={form.order} onChange={(e) => set("order", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: C.muted }}>الحالة</span>
            <Toggle on={form.active} onChange={(v) => set("active", v)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onSave}  className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.orange, color: "#fff" }}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

/* ── Quick sections modal ── */
function QuickModal({
  title, form, onChange, onSave, onClose,
}: {
  title: string; form: QuickForm;
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>اسم القسم</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="اسم القسم" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>الأيقونة (emoji)</label>
              <input type="text" value={form.icon} onChange={(e) => set("icon", e.target.value)}
                placeholder="🎁" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center text-lg" style={inp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: C.muted }}>الترتيب</label>
              <input type="number" min="1" value={form.order} onChange={(e) => set("order", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
            </div>
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.bg, color: C.muted }}>إلغاء</button>
          <button onClick={onSave}  className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.orange, color: "#fff" }}>حفظ</button>
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
let nextMainId  = seedMain.length  + 1;
let nextQuickId = seedQuick.length + 1;

export default function AdminSectionsPage() {
  const [tab,        setTab]        = useState<TabId>("main");

  /* Main sections state */
  const [mainRows,   setMainRows]   = useState<MainSection[]>(seedMain);
  const [mainModal,  setMainModal]  = useState<"add" | "edit" | null>(null);
  const [mainForm,   setMainForm]   = useState<MainForm>(emptyMain);
  const [mainEditId, setMainEditId] = useState<number | null>(null);
  const [mainDelId,  setMainDelId]  = useState<number | null>(null);

  /* Quick sections state */
  const [quickRows,   setQuickRows]   = useState<QuickSection[]>(seedQuick);
  const [quickModal,  setQuickModal]  = useState<"add" | "edit" | null>(null);
  const [quickForm,   setQuickForm]   = useState<QuickForm>(emptyQuick);
  const [quickEditId, setQuickEditId] = useState<number | null>(null);
  const [quickDelId,  setQuickDelId]  = useState<number | null>(null);

  /* ── Main handlers ── */
  function openAddMain()  { setMainForm(emptyMain); setMainEditId(null); setMainModal("add"); }
  function openEditMain(r: MainSection) {
    setMainForm({ name: r.name, icon: r.icon, order: String(r.order), active: r.active });
    setMainEditId(r.id); setMainModal("edit");
  }
  function saveMain() {
    if (mainModal === "add") {
      setMainRows((p) => [...p, { id: nextMainId++, name: mainForm.name, icon: mainForm.icon, order: Number(mainForm.order) || 1, active: mainForm.active }]);
    } else if (mainEditId !== null) {
      setMainRows((p) => p.map((r) => r.id === mainEditId ? { ...r, name: mainForm.name, icon: mainForm.icon, order: Number(mainForm.order) || 1, active: mainForm.active } : r));
    }
    setMainModal(null);
  }
  function deleteMain() { setMainRows((p) => p.filter((r) => r.id !== mainDelId)); setMainDelId(null); }

  /* ── Quick handlers ── */
  function openAddQuick() { setQuickForm(emptyQuick); setQuickEditId(null); setQuickModal("add"); }
  function openEditQuick(r: QuickSection) {
    setQuickForm({ name: r.name, icon: r.icon, link: r.link, order: String(r.order), active: r.active });
    setQuickEditId(r.id); setQuickModal("edit");
  }
  function saveQuick() {
    if (quickModal === "add") {
      setQuickRows((p) => [...p, { id: nextQuickId++, name: quickForm.name, icon: quickForm.icon, link: quickForm.link, order: Number(quickForm.order) || 1, active: quickForm.active }]);
    } else if (quickEditId !== null) {
      setQuickRows((p) => p.map((r) => r.id === quickEditId ? { ...r, name: quickForm.name, icon: quickForm.icon, link: quickForm.link, order: Number(quickForm.order) || 1, active: quickForm.active } : r));
    }
    setQuickModal(null);
  }
  function deleteQuick() { setQuickRows((p) => p.filter((r) => r.id !== quickDelId)); setQuickDelId(null); }

  const mainDelTarget  = mainRows.find((r)  => r.id === mainDelId);
  const quickDelTarget = quickRows.find((r) => r.id === quickDelId);

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
            onToggle={(id) => setMainRows((p) => p.map((r) => r.id === id ? { ...r, active: !r.active } : r))}
            onEdit={openEditMain}
            onDelete={setMainDelId}
          />
          {(mainModal === "add" || mainModal === "edit") && (
            <MainModal
              title={mainModal === "add" ? "إضافة قسم رئيسي" : "تعديل قسم رئيسي"}
              form={mainForm} onChange={setMainForm} onSave={saveMain} onClose={() => setMainModal(null)}
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
            onToggle={(id) => setQuickRows((p) => p.map((r) => r.id === id ? { ...r, active: !r.active } : r))}
            onEdit={openEditQuick as (r: { id: number; name: string; icon: string; order: number; active: boolean }) => void}
            onDelete={setQuickDelId}
          />
          {(quickModal === "add" || quickModal === "edit") && (
            <QuickModal
              title={quickModal === "add" ? "إضافة قسم سريع" : "تعديل قسم سريع"}
              form={quickForm} onChange={setQuickForm} onSave={saveQuick} onClose={() => setQuickModal(null)}
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
