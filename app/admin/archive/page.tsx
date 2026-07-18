"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatCairoDate, formatCairoTime } from "@/lib/dateTime";
import { startOfCairoDate, endOfCairoDate } from "@/lib/cairoTime";

const C = {
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  yellow: "#EAB308",
  red:    "#EF4444",
  blue:   "#3B82F6",
  orange: "#F97316",
  bg:     "#0F172A",
};

const PAGE_SIZE = 30;

const STATUS_AR: Record<string, string> = {
  new:        "جديد",
  accepted:   "قبله الدرايفر",
  pending:    "قيد التنفيذ",
  on_the_way: "في الطريق",
  delivered:  "تم التوصيل",
  cancelled:  "ملغي",
};

function statusColor(s: string) {
  if (s === "delivered"  || s === "تم التوصيل")  return { bg: `${C.green}22`,  color: C.green  };
  if (s === "on_the_way" || s === "في الطريق")   return { bg: `${C.blue}22`,   color: C.blue   };
  if (s === "pending"    || s === "قيد التنفيذ") return { bg: `${C.yellow}22`, color: C.yellow };
  return                                                  { bg: `${C.red}22`,    color: C.red    };
}

function formatTime(iso: string) {
  return formatCairoTime(iso);
}
function formatDate(iso: string) {
  return formatCairoDate(iso);
}
function formatDateShort(iso: string) {
  return formatCairoDate(iso, { year: false, month: "short" });
}

type ArchiveOrder = {
  id:                string;
  user_order_number: number | null;
  total:             number;
  status:            string;
  created_at:        string;
  restaurant:        string | null;
  area:              string | null;
  driverName:        string | null;
  shiftNum:          number | null;
  customerName:      string | null;
  customerPhone:     string | null;
};

type ModalItem = { name: string; quantity: number; price: number; extras: { name: string; price: number }[] };

type ModalData = {
  id:            string;
  number:        number | null;
  total:         number;
  subtotal:      number | null;
  delivery_fee:  number | null;
  status:        string;
  created_at:    string;
  restaurant:    string | null;
  area:          string | null;
  notes:         string | null;
  customerName:  string | null;
  customerPhone: string | null;
  shiftNum:      number | null;
};

export default function AdminArchivePage() {
  const [orders,       setOrders]       = useState<ArchiveOrder[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState("");
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  /* ── Modal ── */
  const [modal,        setModal]        = useState<ModalData | null>(null);
  const [modalItems,   setModalItems]   = useState<ModalItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    /* Active shift to exclude from archive */
    const { data: shiftRow } = await supabase
      .from("shifts").select("id").eq("is_active", true).limit(1).maybeSingle();
    setActiveShiftId(shiftRow?.id ?? null);

    /* Fetch drivers for name resolution */
    const driverRes = await fetch("/api/admin/drivers", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) { console.error("fetchDrivers:", res.statusText); return { data: [] }; }
        return { data: await res.json() };
      })
      .catch((err) => { console.error("fetchDrivers:", err); return { data: [] }; });

    const driverNameMap = new Map<string, string>();
    ((driverRes as any).data ?? []).forEach((d: any) => {
      driverNameMap.set(String(d.id), d.name ?? "");
    });

    let query = supabase
      .from("orders")
      .select(`
        id, total, status, created_at, user_order_number, delivery_id,
        restaurants!restaurant_id (name),
        addresses!address_id (areas(name)),
        users (name, phone),
        shifts!shift_id (num)
      `, { count: "exact" })
      .neq("status", "new")
      .order("created_at", { ascending: false });

    /* Exclude active shift orders */
    if (shiftRow?.id) {
      query = query.or(`shift_id.is.null,shift_id.neq.${shiftRow.id}`);
    }

    /* Date filter */
    if (dateFilter) {
      query = query
        .gte("created_at", startOfCairoDate(dateFilter))
        .lte("created_at", endOfCairoDate(dateFilter));
    }

    /* Pagination */
    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOrders((data ?? []).map((o: any) => ({
      id:                o.id,
      user_order_number: o.user_order_number,
      total:             o.total,
      status:            o.status,
      created_at:        o.created_at,
      restaurant:        (o.restaurants as { name: string } | null)?.name ?? null,
      area:              (o.addresses as { areas: { name: string } | null } | null)?.areas?.name ?? null,
      driverName:        o.delivery_id ? (driverNameMap.get(String(o.delivery_id)) ?? null) : null,
      shiftNum:          (o.shifts as { num: number } | null)?.num ?? null,
      customerName:      (o.users as { name: string | null; phone: string | null } | null)?.name ?? null,
      customerPhone:     (o.users as { name: string | null; phone: string | null } | null)?.phone ?? null,
    })));
    setTotalCount(count ?? 0);
  }, [page, dateFilter]);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);
  useAutoRefresh(fetchData);

  /* Client-side text search on current page */
  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.trim().toLowerCase();
        return (
          `#${o.user_order_number}`.includes(q) ||
          (o.customerName  ?? "").toLowerCase().includes(q) ||
          (o.customerPhone ?? "").includes(q) ||
          (o.restaurant    ?? "").toLowerCase().includes(q)
        );
      })
    : orders;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Open modal ── */
  async function openModal(o: ArchiveOrder) {
    setModal({
      id:            o.id,
      number:        o.user_order_number,
      total:         o.total,
      subtotal:      null,
      delivery_fee:  null,
      status:        o.status,
      created_at:    o.created_at,
      restaurant:    o.restaurant,
      area:          o.area,
      notes:         null,
      customerName:  o.customerName,
      customerPhone: o.customerPhone,
      shiftNum:      o.shiftNum,
    });
    setModalItems([]);
    setModalLoading(true);

    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders")
        .select("subtotal, delivery_fee, total, notes")
        .eq("id", o.id).single(),
      supabase.from("order_items")
        .select("quantity, price_at_order, extras, menu_items (name)")
        .eq("order_id", o.id),
    ]);

    if (orderRes.data) {
      const od = orderRes.data;
      setModal((prev) => prev ? {
        ...prev,
        subtotal:     od.subtotal     ?? null,
        delivery_fee: od.delivery_fee ?? null,
        notes:        od.notes        ?? null,
      } : null);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setModalItems((itemsRes.data ?? []).map((item: any) => ({
      name:     item.menu_items?.name ?? "—",
      quantity: item.quantity,
      price:    item.price_at_order   ?? 0,
      extras:   Array.isArray(item.extras) ? item.extras : [],
    })));
    setModalLoading(false);
  }

  function closeModal() { setModal(null); setModalItems([]); }

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-5" dir="rtl">

      {/* ── Toolbar ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row gap-3" style={{ borderColor: C.border }}>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، الهاتف، رقم الطلب أو المطعم..."
              className="flex-1 text-sm bg-transparent outline-none" style={{ color: C.text }} dir="rtl"
            />
            {search && <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>}
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <input
              type="date" value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}
            />
            {dateFilter && (
              <button onClick={() => { setDateFilter(""); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: `${C.red}22`, color: C.red }}>
                مسح التاريخ
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { col: "#",            hide: ""                       },
                  { col: "العميل",       hide: ""                       },
                  { col: "رقم الهاتف",   hide: " hidden sm:table-cell"  },
                  { col: "المطعم",       hide: " hidden sm:table-cell"  },
                  { col: "الحي",         hide: " hidden md:table-cell"  },
                  { col: "السائق",       hide: " hidden lg:table-cell"  },
                  { col: "الوردية",      hide: " hidden md:table-cell"  },
                  { col: "التاريخ",      hide: " hidden lg:table-cell"  },
                  { col: "الوقت",        hide: " hidden xl:table-cell"  },
                  { col: "الإجمالي",     hide: ""                       },
                  { col: "الحالة",       hide: ""                       },
                ].map(({ col, hide }) => (
                  <th key={col}
                    className={`px-3 py-2.5 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm animate-pulse" style={{ color: C.muted }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد طلبات في الأرشيف
                  </td>
                </tr>
              ) : filtered.map((o, i) => {
                const sc = statusColor(o.status);
                return (
                  <tr key={o.id}
                    className="cursor-pointer transition-colors hover:bg-white/5"
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}
                    onClick={() => openModal(o)}>
                    <td className="px-3 py-2.5 font-bold text-xs whitespace-nowrap" style={{ color: C.teal }}>
                      #{o.user_order_number ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: C.text }}>
                      {o.customerName ?? "—"}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {o.customerPhone ?? "—"}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {o.restaurant ?? "—"}
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {o.area ?? "—"}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {o.driverName ?? "—"}
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {o.shiftNum != null ? `الوردية ${o.shiftNum}` : "—"}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {formatDateShort(o.created_at)}
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {formatTime(o.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: C.text }}>
                      {o.total} ج.م
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block"
                        style={{ background: sc.bg, color: sc.color }}>
                        {STATUS_AR[o.status] ?? o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer + Pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between gap-3 flex-wrap"
          style={{ borderColor: C.border }}>
          <span className="text-xs" style={{ color: C.muted }}>
            {search ? `${filtered.length} نتيجة في الصفحة الحالية` : `${totalCount} طلب في الأرشيف`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                السابق
              </button>
              <span className="text-xs font-semibold" style={{ color: C.text }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                التالي
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Read-only Order Detail Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={closeModal}>
          <div
            className="w-full sm:max-w-md flex flex-col gap-4 rounded-t-2xl sm:rounded-2xl p-5"
            style={{ background: C.card, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black" style={{ color: C.text }}>
                تفاصيل الطلب #{modal.number ?? "—"}
              </h3>
              <button onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            {/* Customer info — prominent */}
            {(modal.customerName || modal.customerPhone) && (
              <div className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: `${C.teal}15`, border: `1px solid ${C.teal}33` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                  style={{ background: `${C.teal}30`, color: C.teal }}>
                  {modal.customerName?.[0] ?? "؟"}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-black" style={{ color: C.text }}>{modal.customerName ?? "—"}</p>
                  {modal.customerPhone && (
                    <p className="text-xs font-bold" style={{ color: C.teal }}>📞 {modal.customerPhone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Order info */}
            <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: C.bg }}>
              {[
                { label: "الحالة",   value: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusColor(modal.status).bg, color: statusColor(modal.status).color }}>{STATUS_AR[modal.status] ?? modal.status}</span> },
                { label: "المطعم",   value: modal.restaurant ? `🍽 ${modal.restaurant}` : null },
                { label: "المنطقة",  value: modal.area ? `📍 ${modal.area}` : null },
                { label: "الوردية",  value: modal.shiftNum != null ? `الوردية ${modal.shiftNum}` : null },
                { label: "التاريخ",  value: formatDate(modal.created_at) },
                { label: "الوقت",    value: formatTime(modal.created_at) },
              ].map(({ label, value }) => value == null ? null : (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: C.border }} />

            {/* Items */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold" style={{ color: C.muted }}>الأصناف</p>
              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
                </div>
              ) : modalItems.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: C.muted }}>لا توجد أصناف</p>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: C.bg }}>
                  {modalItems.map((item, i) => (
                    <div key={i} className="flex flex-col px-3 py-2.5 gap-1.5"
                      style={{ borderBottom: i < modalItems.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${C.teal}22`, color: C.teal }}>×{item.quantity}</span>
                          <span style={{ color: C.text }}>{item.name}</span>
                        </div>
                        <span style={{ color: C.muted }}>
                          {item.extras.length > 0 ? item.price - item.extras.reduce((s, e) => s + (e.price ?? 0), 0) : item.price} ج.م
                        </span>
                      </div>
                      {item.extras.length > 0 && (
                        <div className="flex flex-col gap-0.5 pr-8">
                          {item.extras.map((e, j) => (
                            <span key={j} className="text-[11px]" style={{ color: C.muted }}>
                              + {e.name} <span style={{ color: C.yellow }}>(+{e.price}ج)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {!modalLoading && modal.notes && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div className="rounded-xl px-3 py-2.5 flex gap-2"
                  style={{ background: `${C.yellow}0f`, border: `1px solid ${C.yellow}33` }}>
                  <span className="text-sm flex-shrink-0">📝</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold" style={{ color: C.yellow }}>ملاحظات</p>
                    <p className="text-xs" style={{ color: C.text }}>{modal.notes}</p>
                  </div>
                </div>
              </>
            )}

            {/* Totals */}
            {!modalLoading && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div className="flex flex-col gap-2">
                  {modal.subtotal != null && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: C.muted }}>قيمة الطلب للمطعم</span>
                      <span style={{ color: C.text }}>{modal.subtotal} ج.م</span>
                    </div>
                  )}
                  {modal.delivery_fee != null && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: C.muted }}>رسوم التوصيل</span>
                      <span style={{ color: C.text }}>{modal.delivery_fee} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-0.5" style={{ borderTop: `1px solid ${C.border}` }}>
                    <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
                    <span className="text-lg font-black" style={{ color: C.green }}>{modal.total} ج.م</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
