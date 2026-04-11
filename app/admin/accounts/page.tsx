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

/* ══════════════════════════════════════════
   TAB 1 — ملخص
══════════════════════════════════════════ */

function SummaryTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء",    value: "1,284",    color: C.teal   },
          { label: "إجمالي الطلبات",   value: "8,740",    color: C.orange },
          { label: "إيرادات الشهر",    value: "94,320 ج.م", color: C.green },
          { label: "عملاء محظورين",    value: "3",         color: C.red    },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs"             style={{ color: C.muted  }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* top customers */}
      <div className="rounded-2xl p-5"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-4" style={{ color: C.text }}>أكثر العملاء طلباً 🏆</h3>
        <div className="flex flex-col gap-3">
          {[
            { name: "أحمد محمد",   orders: 48, total: "3,840 ج.م" },
            { name: "سارة علي",    orders: 36, total: "2,910 ج.م" },
            { name: "محمود خالد",  orders: 31, total: "2,480 ج.م" },
          ].map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-xs font-black w-5 text-center flex-shrink-0"
                style={{ color: C.teal }}>{i + 1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: `${C.teal}30`, color: C.teal }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.text }}>{c.name}</p>
                <p className="text-xs"               style={{ color: C.muted }}>{c.orders} طلب</p>
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

type Staff = { id: number; name: string; role: string; phone: string; active: boolean };

const seedStaff: Staff[] = [
  { id: 1, name: "أحمد الإداري",  role: "مدير النظام",   phone: "0100-111-2233", active: true  },
  { id: 2, name: "نور المشرفة",   role: "مشرفة طلبات",   phone: "0101-222-3344", active: true  },
  { id: 3, name: "طارق الدعم",    role: "دعم فني",        phone: "0102-333-4455", active: false },
];

function StaffTab() {
  const [rows, setRows] = useState<Staff[]>(seedStaff);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["الاسم", "الدور", "الموبايل", "الحالة", "إجراءات"].map((col, i) => (
                <th key={col}
                  className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${i === 2 ? " hidden sm:table-cell" : ""}`}
                  style={{ color: C.muted }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id}
                style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: `${C.teal}30`, color: C.teal }}>{s.name[0]}</div>
                    <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{s.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>{s.role}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>{s.phone}</td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={{
                      background: s.active ? `${C.green}22` : `${C.red}22`,
                      color:      s.active ? C.green : C.red,
                    }}>
                    {s.active ? "نشط" : "مش نشط"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setRows((p) => p.map((r) => r.id === s.id ? { ...r, active: !r.active } : r))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                    style={{
                      background: s.active ? `${C.red}22` : `${C.green}22`,
                      color:      s.active ? C.red : C.green,
                    }}>
                    {s.active ? "إيقاف" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
        {rows.length} أعضاء
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 3 — المستخدمين
══════════════════════════════════════════ */

type User = {
  id:       number;
  name:     string;
  email:    string;
  phone:    string;
  joined:   string;
  orders:   number;
  banned:   boolean;
};

const seedUsers: User[] = [
  { id: 1, name: "أحمد محمد",    email: "ahmed@example.com",   phone: "0100-123-4567", joined: "١٠ يناير ٢٠٢٦",  orders: 48, banned: false },
  { id: 2, name: "سارة علي",     email: "sara@example.com",    phone: "0101-234-5678", joined: "١٥ يناير ٢٠٢٦",  orders: 36, banned: false },
  { id: 3, name: "محمود خالد",   email: "mahmoud@example.com", phone: "0102-345-6789", joined: "٢٠ فبراير ٢٠٢٦", orders: 31, banned: false },
  { id: 4, name: "نور حسن",      email: "nour@example.com",    phone: "0103-456-7890", joined: "٥ مارس ٢٠٢٦",    orders: 12, banned: true  },
  { id: 5, name: "عمر إبراهيم",  email: "omar@example.com",    phone: "0104-567-8901", joined: "١٢ مارس ٢٠٢٦",   orders: 7,  banned: false },
  { id: 6, name: "ريم عبدالله",  email: "reem@example.com",    phone: "0105-678-9012", joined: "١ أبريل ٢٠٢٦",   orders: 3,  banned: true  },
];

function UsersTab() {
  const [rows,   setRows]   = useState<User[]>(seedUsers);
  const [search, setSearch] = useState("");

  const filtered = rows.filter(
    (r) =>
      !search.trim() ||
      r.name.includes(search)  ||
      r.email.includes(search) ||
      r.phone.includes(search)
  );

  function toggleBan(id: number) {
    setRows((p) => p.map((r) => r.id === id ? { ...r, banned: !r.banned } : r));
  }

  return (
    <div className="flex flex-col gap-4">

      {/* search */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن عميل..."
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: C.text }}
        />
        {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
      </div>

      {/* table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الاسم",            hide: ""                       },
                  { label: "الإيميل",           hide: " hidden lg:table-cell"  },
                  { label: "الموبايل",          hide: " hidden sm:table-cell"  },
                  { label: "تاريخ التسجيل",    hide: " hidden xl:table-cell"  },
                  { label: "عدد الطلبات",      hide: " hidden md:table-cell"  },
                  { label: "الحالة",            hide: ""                       },
                  { label: "إجراءات",           hide: ""                       },
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
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد نتائج مطابقة
                  </td>
                </tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id}
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                  {/* الاسم */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: u.banned ? `${C.red}25` : `${C.teal}30`, color: u.banned ? C.red : C.teal }}>
                        {u.name[0]}
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{u.name}</p>
                    </div>
                  </td>

                  {/* الإيميل */}
                  <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {u.email}
                  </td>

                  {/* الموبايل */}
                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {u.phone}
                  </td>

                  {/* تاريخ التسجيل */}
                  <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {u.joined}
                  </td>

                  {/* عدد الطلبات */}
                  <td className="hidden md:table-cell px-4 py-3 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${C.teal}20`, color: C.teal }}>
                      {u.orders}
                    </span>
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{
                        background: u.banned ? `${C.red}22`   : `${C.green}22`,
                        color:      u.banned ? C.red : C.green,
                      }}>
                      {u.banned ? "محظور" : "نشط"}
                    </span>
                  </td>

                  {/* إجراءات */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleBan(u.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
                      style={{
                        background: u.banned ? `${C.green}22` : `${C.red}22`,
                        color:      u.banned ? C.green : C.red,
                      }}>
                      {u.banned ? "رفع الحظر" : "حظر"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {filtered.length} عميل
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Page
══════════════════════════════════════════ */

const TABS = ["ملخص", "فريق العمل", "المستخدمين"] as const;
type Tab = typeof TABS[number];

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<Tab>("ملخص");

  return (
    <div className="flex flex-col gap-5">

      {/* ── Tabs ── */}
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

      {tab === "ملخص"       && <SummaryTab />}
      {tab === "فريق العمل" && <StaffTab   />}
      {tab === "المستخدمين" && <UsersTab   />}

    </div>
  );
}
