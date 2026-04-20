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
};

type User = {
  id:           string;
  name:         string | null;
  email:        string | null;
  phone:        string | null;
  total_orders: number;
  created_at:   string | null;
  is_blocked:   boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  });
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  async function fetchUsers() {
    setLoading(true);

    const { data, error } = await supabasePublic
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("USERS ERROR:", error.message, error);
    if (data) setUsers(data);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleToggleBlock(userId: string, currentStatus: boolean) {
    const { error } = await supabasePublic
      .from("users")
      .update({ is_blocked: !currentStatus })
      .eq("id", userId);

    if (error) {
      console.error("BLOCK TOGGLE ERROR:", error.message, error);
      return;
    }

    fetchUsers();
  }

  const filtered = users.filter(
    (u) =>
      !search.trim() ||
      (u.name  ?? "").includes(search) ||
      (u.email ?? "").includes(search) ||
      (u.phone ?? "").includes(search),
  );

  const activeCount = users.filter((u) => !u.is_blocked).length;
  const bannedCount = users.filter((u) =>  u.is_blocked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي العملاء", value: users.length, color: C.teal  },
          { label: "نشط",            value: activeCount,  color: C.green },
          { label: "محظور",          value: bannedCount,  color: C.red   },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs"             style={{ color: C.muted  }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
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

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الاسم",          hide: ""                      },
                  { label: "الإيميل",         hide: " hidden lg:table-cell" },
                  { label: "الموبايل",        hide: " hidden sm:table-cell" },
                  { label: "تاريخ التسجيل",  hide: " hidden xl:table-cell" },
                  { label: "عدد الطلبات",    hide: " hidden md:table-cell" },
                  { label: "الحالة",          hide: ""                      },
                  { label: "إجراءات",         hide: ""                      },
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

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: u.is_blocked ? `${C.red}25` : `${C.teal}30`, color: u.is_blocked ? C.red : C.teal }}>
                        {(u.name ?? "؟")[0]}
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{u.name ?? "—"}</p>
                    </div>
                  </td>

                  <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {u.email ?? "—"}
                  </td>

                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {u.phone ?? "—"}
                  </td>

                  <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {formatDate(u.created_at)}
                  </td>

                  <td className="hidden md:table-cell px-4 py-3 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${C.teal}20`, color: C.teal }}>
                      {u.total_orders}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{
                        background: u.is_blocked ? `${C.red}22`   : `${C.green}22`,
                        color:      u.is_blocked ? C.red : C.green,
                      }}>
                      {u.is_blocked ? "محظور" : "نشط"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
                      style={{
                        background: u.is_blocked ? `${C.green}22` : `${C.red}22`,
                        color:      u.is_blocked ? C.green : C.red,
                      }}>
                      {u.is_blocked ? "إلغاء الحظر" : "حظر"}
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
