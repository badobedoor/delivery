"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCairoDate, formatCairoTime } from "@/lib/dateTime";
import { todayCairoDate } from "@/lib/cairoTime";

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

/* ── DB Type — shape returned by GET /api/admin/delivery-requests (server API).
     Browser anon clients stay RLS-blocked on delivery_requests. ── */
type DBRequest = {
  id:                string;
  restaurant_name:   string | null;
  entity_id:         string | null;
  customer_phone:    string | null;
  area_id:           string | null;
  delivery_address:  string | null;
  notes:             string | null;
  price:             number | null;
  delivery_fee:      number | null;
  status:            string;
  delivery_id:       string | null;
  delivery_shift_id: string | null;
  created_at:        string;
  approved_at:       string | null;
  accepted_at:       string | null;
  on_the_way_at:     string | null;
  delivered_at:      string | null;
  cancelled_at:      string | null;
  areas:             { name: string; delivery_fee: number } | null;
  driver_name:       string | null;
};

/* ── Status helpers — SAME labels/badges as /admin/orders (source of truth).
     No new badges invented. ── */
const STATUS_AR: Record<string, string> = {
  new:        "جديد",
  accepted:   "قبله الدرايفر",
  pending:    "قيد التنفيذ",
  on_the_way: "في الطريق",
  delivered:  "تم التوصيل",
  cancelled:  "ملغي",
};

function statusColor(s: string) {
  if (s === "new"        || s === "جديد")        return { bg: `${C.orange}22`, color: C.orange };
  if (s === "delivered"  || s === "تم التوصيل")  return { bg: `${C.green}22`,  color: C.green  };
  if (s === "on_the_way" || s === "في الطريق")   return { bg: `${C.blue}22`,   color: C.blue   };
  if (s === "pending"    || s === "قيد التنفيذ") return { bg: `${C.yellow}22`, color: C.yellow };
  return                                                  { bg: `${C.red}22`,    color: C.red    };
}

function formatTime(iso: string) {
  return formatCairoTime(iso);
}

function formatDate(iso: string) {
  return formatCairoDate(iso, { year: false });
}

/* ── Tabs — SAME as /admin/orders ── */
const tabs: { label: string; value: string }[] = [
  { label: "الكل",         value: "الكل"        },
  { label: "قيد التنفيذ", value: "قيد التنفيذ" },
  { label: "في الطريق",   value: "في الطريق"   },
  { label: "تم التوصيل",  value: "تم التوصيل"  },
  { label: "ملغي",         value: "ملغي"        },
];

export default function AdminDeliveryRequestsPage() {
  const [newRequestsList, setNewRequestsList] = useState<DBRequest[]>([]);
  const [allRequestsList, setAllRequestsList] = useState<DBRequest[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState("الكل");
  const [search,          setSearch]          = useState("");
  const [confirmingId,    setConfirmingId]    = useState<string | null>(null);
  const [confirmError,    setConfirmError]    = useState<string | null>(null);
  const [noShiftModal,    setNoShiftModal]    = useState<{ message: string } | null>(null);
  const [shiftTimeModal,  setShiftTimeModal]  = useState<{ message: string } | null>(null);
  const [activeShiftLabel,setActiveShiftLabel]= useState<string | null>(null);
  const [currentPage,     setCurrentPage]     = useState(0);
  const PAGE_SIZE = 20;
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<DBRequest | null>(null);
  const [newOrderBanner,  setNewOrderBanner]  = useState(false);
  const [soundBlocked,    setSoundBlocked]    = useState(false);
  const [notifBlocked,    setNotifBlocked]    = useState(false);
  /* IDs of "new" requests already seen — polling stands in for realtime
     (RLS blocks browser realtime on delivery_requests). When a fresh ID
     appears, fire the same banner / sound / browser-notification as orders. */
  const seenNewIdsRef = useRef<Set<string>>(new Set());
  const deliveryRequestsInitRef = useRef(false);

  /* ── Shift time validation (same logic as /admin/orders, handles overnight) ── */
  function isShiftActiveNow(shift: { start_time: string; end_time: string }): boolean {
    const now            = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH,   endM]   = shift.end_time.split(":").map(Number);
    const startMinutes     = startH * 60 + startM;
    const endMinutes       = endH   * 60 + endM;
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  /* ── Load data: active shifts (label), drivers (name map), and requests
        via the guarded server API. New requests → cards; others → table. ── */
  async function loadData() {
    const [shiftRes, driversRes] = await Promise.all([
      supabase
        .from("shifts")
        .select("id, num, start_time, end_time")
        .eq("is_active", true)
        .eq("started_date", todayCairoDate()),
      fetch("/api/admin/drivers", { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) { console.error("fetchDrivers:", res.statusText); return { data: [] }; }
          return { data: await res.json() };
        })
        .catch((err) => { console.error("fetchDrivers:", err); return { data: [] }; }),
    ]);

    const shiftsData = shiftRes.data ?? [];

    if (shiftsData.length > 0) {
      const fmt = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`;
      };
      const first = shiftsData[0];
      setActiveShiftLabel(
        shiftsData.length === 1
          ? `الوردية ${first.num} — ${fmt(first.start_time)} إلى ${fmt(first.end_time)}`
          : `${shiftsData.length} ورديات نشطة`
      );
    } else {
      setActiveShiftLabel(null);
    }

    const driverNameMap = new Map<string, string>();
    ((driversRes as { data?: unknown }).data as { id: string; name?: string }[] | undefined)?.forEach((d) => {
      driverNameMap.set(String(d.id), d.name ?? "");
    });

    let all: DBRequest[] = [];
    try {
      const res = await fetch("/api/admin/delivery-requests", { credentials: "include" });
      if (!res.ok) {
        console.error("fetchDeliveryRequests:", res.statusText);
      } else {
        const data = await res.json();
        all = (Array.isArray(data) ? data : []).map((r: DBRequest) => ({
          ...r,
          driver_name: r.delivery_id ? (driverNameMap.get(String(r.delivery_id)) ?? null) : null,
        }));
      }
    } catch (err) {
      console.error("fetchDeliveryRequests:", err);
    }

    const newList = all.filter((r) => r.status === "new");
    const rest    = all.filter((r) => r.status !== "new").slice(0, 60);

    setNewRequestsList(newList);
    setAllRequestsList(rest);

    /* Detect NEW "new" requests for banner / sound / browser notification.
       The first load is a silent prime (pre-existing requests never replay);
       every later load fires on any previously-unseen "new" id — including
       the 0→1 first arrival, exactly like an orders INSERT. */
    const newIds = new Set(newList.map((r) => r.id));
    const appeared = [...newIds].filter((id) => !seenNewIdsRef.current.has(id));
    const isInitialPrime = !deliveryRequestsInitRef.current;
    deliveryRequestsInitRef.current = true;
    seenNewIdsRef.current = newIds;

    if (!isInitialPrime && appeared.length > 0) {
      /* Same visual banner as /admin/orders. The SOUND is played globally by
         AdminShell's poll (same /sounds/new-order.mp3) — the page itself does
         NOT play sound, exactly like the orders page. */
      setNewOrderBanner(true);
      setTimeout(() => setNewOrderBanner(false), 5000);
      if (Notification.permission === "granted") {
        new Notification("🔔 طلب جديد وصل!", {
          body: "يوجد طلب جديد يحتاج مراجعة",
          icon: "/icon.png",
        });
      }
    }
  }

  /* ── Initial load + polling every ~10s (realtime is RLS-blocked on
        delivery_requests, so polling is the safe equivalent). The initial
        call is deferred inside setTimeout (like the driver page's polling
        pattern) so the effect body has no synchronous setState. ── */
  useEffect(() => {
    const t = setTimeout(() => {
      loadData().finally(() => setLoading(false));
    }, 0);
    const id = setInterval(loadData, 10_000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  /* ── Notification permission + service worker (same as /admin/orders) ── */
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "denied") setNotifBlocked(true);
      });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  /* ── Unblock sound after a user interaction (same as /admin/orders) ── */
  useEffect(() => {
    if (!soundBlocked) return;
    function handleClick() {
      setSoundBlocked(false);
    }
    document.addEventListener("click", handleClick, { once: true });
    return () => document.removeEventListener("click", handleClick);
  }, [soundBlocked]);
  /* ── Confirm (تأكيد الطلب): new → pending.
        Same UX as orders — validates an active shift & drivers first — then
        calls the guarded approve API (server-side atomic, RLS-safe). No
        "تعيين سائق" anywhere; the request is picked by drivers automatically. ── */
  async function confirmRequest(id: string) {
    setConfirmError(null);

    const request = newRequestsList.find((r) => r.id === id);
    if (!request) {
      setConfirmError("تم تحديث الطلب بالفعل");
      return;
    }
    setConfirmingId(id);

    const { data: shift } = await supabase
      .from("shifts")
      .select("id, start_time, end_time")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!shift) {
      setNoShiftModal({ message: "يجب تشغيل وردية واحدة على الأقل قبل تأكيد الطلبات وتوزيعها على السائقين." });
      setConfirmingId(null);
      return;
    }

    if (!isShiftActiveNow(shift)) {
      setShiftTimeModal({ message: "هذه الوردية خارج وقت التشغيل، يرجى إنهاءها وفتح وردية مناسبة للوقت الحالي" });
      setConfirmingId(null);
      return;
    }

    const { count } = await supabase
      .from("delivery_shifts")
      .select("*", { count: "exact", head: true })
      .eq("shift_id", shift.id)
      .eq("is_active", true);

    if (!count) {
      setNoShiftModal({ message: "لا يوجد سائقون متاحون على هذه الوردية. يجب أن يبدأ السائقون ورديتهم أولاً قبل توزيع الطلبات." });
      setConfirmingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/delivery-requests/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setConfirmError(data.error ?? "فشل تأكيد الطلب");
        setConfirmingId(null);
        return;
      }
    } catch (err) {
      console.error("confirmRequest:", err);
      setConfirmError("تعذر الاتصال بالخادم");
      setConfirmingId(null);
      return;
    }

    /* Optimistic UI update */
    setNewRequestsList((prev) => prev.filter((r) => r.id !== id));
    setAllRequestsList((prev) => [{ ...request, status: "pending", driver_name: null }, ...prev]);
    setConfirmingId(null);
  }

  /* ── Cancel (إلغاء): new/pending/accepted/on_the_way → cancelled.
        The guarded API is server-side (RLS-safe); this just mirrors the result. ── */
  async function cancelRequest(id: string) {
    const newReq   = newRequestsList.find((r) => r.id === id);
    const tableReq = allRequestsList.find((r) => r.id === id);
    setNewRequestsList((prev) => prev.filter((r) => r.id !== id));
    if (newReq) {
      setAllRequestsList((prev) => [{ ...newReq, status: "cancelled", driver_name: null }, ...prev]);
    } else if (tableReq) {
      setAllRequestsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "cancelled", driver_name: null } : r)),
      );
    }
    try {
      await fetch(`/api/admin/delivery-requests/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("cancelRequest:", err);
    }
  }

  const countByStatus = (s: string) => {
    if (s === "الكل") return allRequestsList.length;
    const enStatus = Object.entries(STATUS_AR).find(([, ar]) => ar === s)?.[0];
    if (enStatus === "pending") {
      return allRequestsList.filter((r) => r.status === "pending" || r.status === "accepted").length;
    }
    return allRequestsList.filter((r) => r.status === enStatus).length;
  };

  const filtered = allRequestsList.filter((r) => {
    const arStatus = STATUS_AR[r.status] ?? r.status;
    const matchTab = activeTab === "الكل" || arStatus === activeTab;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (r.restaurant_name  ?? "").toLowerCase().includes(q) ||
      (r.customer_phone   ?? "").includes(q) ||
      (r.areas?.name      ?? "").toLowerCase().includes(q) ||
      (r.delivery_address ?? "").toLowerCase().includes(q) ||
      (r.notes            ?? "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const totalPages = Math.min(Math.ceil(filtered.length / PAGE_SIZE), 3);
  const paginatedRequests = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const arabicDate = new Date().toLocaleDateString("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5" dir="rtl">

      {/* ── New request banner ── */}
      {newOrderBanner && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-black"
          style={{ background: C.green, color: "#fff", whiteSpace: "nowrap" }}
        >
          🔔 طلب جديد وصل!
        </div>
      )}

      {/* ── Notification permission denied banner ── */}
      {notifBlocked && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold cursor-pointer"
          style={{ background: C.card, border: `1px solid ${C.orange}55`, color: C.muted, whiteSpace: "nowrap" }}
          onClick={() => setNotifBlocked(false)}
        >
          <span style={{ color: C.orange }}>🔕</span>
          الإشعارات مرفوضة — فعّلها من إعدادات المتصفح
          <span style={{ color: C.muted, fontSize: 10 }}>✕</span>
        </div>
      )}

      {/* ── Sound blocked banner ── */}
      {soundBlocked && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold cursor-pointer"
          style={{ background: C.orange, color: "#fff", whiteSpace: "nowrap" }}
          onClick={() => setSoundBlocked(false)}
        >
          ⚠️ المتصفح منع الصوت — اضغط في أي مكان لتفعيله
        </div>
      )}

      {/* ── Top info bar ── */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: C.teal, fontSize: 16 }}>📅</span>
          <span className="text-sm font-semibold" style={{ color: C.text }}>{arabicDate}</span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{
            background: activeShiftLabel ? `${C.teal}18` : `${C.red}18`,
            border:     activeShiftLabel ? `1px solid ${C.teal}44` : `1px solid ${C.red}44`,
          }}
        >
          <span style={{ color: activeShiftLabel ? C.teal : C.red, fontSize: 14 }}>🕐</span>
          <span className="text-sm font-bold" style={{ color: activeShiftLabel ? C.teal : C.red }}>
            {activeShiftLabel ?? "لا توجد وردية نشطة"}
          </span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "جديد",         value: newRequestsList.length,        color: C.orange, icon: "🆕" },
          { label: "قيد التنفيذ", value: countByStatus("قيد التنفيذ"),  color: C.yellow, icon: "⏳" },
          { label: "في الطريق",   value: countByStatus("في الطريق"),    color: C.blue,   icon: "🚀" },
          { label: "تم التوصيل",  value: countByStatus("تم التوصيل"),   color: C.green,  icon: "✅" },
          { label: "ملغي",         value: countByStatus("ملغي"),         color: C.red,    icon: "❌" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>
      {/* ── New Requests Section (طلبات جديدة) — same red section as orders ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#1a1033", border: `2px solid ${C.red}55` }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${C.red}33`, background: `${C.red}0d` }}
        >
          <span className="relative flex h-3 w-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: C.red }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: C.red }}
            />
          </span>
          <h2 className="text-base font-black" style={{ color: C.text }}>
            🔴 طلبات جديدة
          </h2>
          <span
            className="mr-auto px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: `${C.red}33`, color: C.red }}
          >
            {newRequestsList.length}
          </span>
        </div>

        {/* Error banner */}
        {confirmError && (
          <div
            className="mx-4 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${C.red}18`, border: `1px solid ${C.red}44` }}
          >
            <p className="text-sm font-semibold" style={{ color: C.red }}>{confirmError}</p>
            <button
              onClick={() => setConfirmError(null)}
              className="flex-shrink-0 text-xs hover:opacity-70"
              style={{ color: C.red }}
            >✕</button>
          </div>
        )}

        {/* Cards */}
        <div className="p-4">
          {newRequestsList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <span style={{ fontSize: 36 }}>🎉</span>
              <p className="text-sm" style={{ color: C.muted }}>لا يوجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {newRequestsList.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                  onClick={() => setSelectedRequest(request)}
                >
                  {/* Request header */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#7C3AED22", color: "#7C3AED" }}>
                          🏢 طلب منشأة
                        </span>
                        <span className="text-sm font-black" style={{ color: C.text }}>
                          {request.restaurant_name ?? "منشأة"}
                        </span>
                        {request.customer_phone && (
                          <span className="text-sm font-semibold" style={{ color: C.muted }}>
                            — {request.customer_phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                        <span>📍 {request.areas?.name ?? "—"}</span>
                        <span>•</span>
                        <span>🕐 {formatTime(request.created_at)}</span>
                      </div>
                      {request.notes && (
                        <p className="text-xs mt-0.5" style={{ color: C.yellow }}>
                          📝 {request.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-black" style={{ color: C.green }}>
                      {(request.price ?? 0) + (request.delivery_fee ?? request.areas?.delivery_fee ?? 0)} ج.م
                    </span>
                  </div>

                  {/* Details box (mirrors the items box of orders) */}
                  <div
                    className="rounded-lg px-3 py-2 flex flex-col gap-1"
                    style={{ background: C.bg }}
                  >
                    {request.delivery_address && (
                      <div className="flex justify-between text-xs gap-3">
                        <span style={{ color: C.muted }}>🏠 العنوان</span>
                        <span style={{ color: C.text }}>{request.delivery_address}</span>
                      </div>
                    )}
                    {request.price != null && (
                      <div className="flex justify-between text-xs gap-3">
                        <span style={{ color: C.muted }}>💵 سعر الطلب</span>
                        <span style={{ color: C.text }}>{request.price} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs gap-3">
                      <span style={{ color: C.muted }}>🚚 رسوم التوصيل</span>
                      <span style={{ color: C.text }}>{request.delivery_fee ?? request.areas?.delivery_fee ?? 0} ج.م</span>
                    </div>
                  </div>

                  {/* Action buttons — confirm / cancel only (no assign driver) */}
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => confirmRequest(request.id)}
                      disabled={confirmingId === request.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px] disabled:opacity-60 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}
                    >
                      <span>✅</span>
                      {confirmingId === request.id ? "جارٍ التأكيد..." : "تأكيد الطلب"}
                    </button>
                    <button
                      onClick={() => cancelRequest(request.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[80px]"
                      style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55` }}
                    >
                      <span>✕</span> إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── All Requests Table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* ── Toolbar ── */}
        <div className="px-4 py-3 border-b flex flex-col gap-3" style={{ borderColor: C.border }}>
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
              placeholder="بحث بالمنشأة، الهاتف، المنطقة أو العنوان..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: C.text }}
              dir="rtl"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {tabs.map((t) => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => { setActiveTab(t.value); setCurrentPage(0); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                  style={{
                    background: active ? C.teal : "transparent",
                    color:      active ? "#fff" : C.muted,
                    border:     active ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  {t.label}
                  <span className="text-[10px] opacity-80">
                    ({countByStatus(t.value)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { col: "المنشأة",     hide: "" },
                  { col: "رقم الهاتف",  hide: " hidden sm:table-cell" },
                  { col: "الحي",        hide: " hidden md:table-cell" },
                  { col: "السعر",       hide: "" },
                  { col: "السائق",      hide: " hidden lg:table-cell" },
                  { col: "الحالة",      hide: "" },
                  { col: "الوقت",       hide: "" },
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
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد طلبات مطابقة
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request, i) => {
                  const sc = statusColor(request.status);
                  return (
                    <tr key={request.id}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      style={{ borderBottom: i < paginatedRequests.length - 1 ? `1px solid ${C.border}` : "none" }}
                      onClick={() => setSelectedRequest(request)}>
                      <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{ color: C.teal }}>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          🏢 {request.restaurant_name ?? "منشأة"}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {request.customer_phone ?? "—"}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {request.areas?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: C.text }}>
                        <div className="flex flex-col gap-0.5">
                          <span>💵 {request.price ?? 0} ج.م</span>
                          <span className="text-[10px] font-normal" style={{ color: C.muted }}>
                            🚚 {request.delivery_fee ?? request.areas?.delivery_fee ?? 0} ج.م
                          </span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                        {request.driver_name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {STATUS_AR[request.status] ?? request.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] whitespace-nowrap" style={{ color: C.muted }}>
                        <p>{formatTime(request.created_at)}</p>
                        <p style={{ color: C.muted }}>{formatDate(request.created_at)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer with pagination ── */}
        <div className="px-4 py-3 border-t text-xs flex items-center justify-between" style={{ borderColor: C.border, color: C.muted }}>
          <span>إجمالي {allRequestsList.length} طلب</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="px-2.5 py-1 rounded-md text-xs font-bold transition-colors"
                style={{
                  background: currentPage === i ? C.teal : "transparent",
                  color:      currentPage === i ? "#fff" : C.muted,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ── Request Detail Modal ── */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="w-full sm:max-w-md flex flex-col gap-4 rounded-t-2xl sm:rounded-2xl p-5"
            style={{ background: C.card, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black" style={{ color: C.text }}>
                تفاصيل طلب منشأة
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}
              >
                ✕
              </button>
            </div>

            {/* Entity info — prominent */}
            <div className="rounded-xl p-3.5 flex items-center gap-3"
              style={{ background: `${C.teal}15`, border: `1px solid ${C.teal}33` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                style={{ background: `${C.teal}30`, color: C.teal }}>
                {selectedRequest.restaurant_name?.[0] ?? "🏢"}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-black" style={{ color: C.text }}>
                  {selectedRequest.restaurant_name ?? "منشأة"}
                </p>
                {selectedRequest.customer_phone && (
                  <p className="text-xs font-bold" style={{ color: C.teal }}>
                    📞 {selectedRequest.customer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Section: معلومات الطلب */}
            <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: C.bg }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.muted }}>الحالة</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: statusColor(selectedRequest.status).bg,
                    color:      statusColor(selectedRequest.status).color,
                  }}
                >
                  {STATUS_AR[selectedRequest.status] ?? selectedRequest.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.muted }}>المنطقة</span>
                <span className="text-xs font-semibold" style={{ color: C.text }}>
                  📍 {selectedRequest.areas?.name ?? "—"}
                </span>
              </div>
              {selectedRequest.delivery_address && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>العنوان</span>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>
                    🏠 {selectedRequest.delivery_address}
                  </span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: C.border }} />
            {/* Section: الملاحظات */}
            {selectedRequest.notes && (
              <>
                <div
                  className="rounded-xl px-3 py-2.5 flex gap-2"
                  style={{ background: `${C.yellow}0f`, border: `1px solid ${C.yellow}33` }}
                >
                  <span className="text-sm flex-shrink-0">📝</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold" style={{ color: C.yellow }}>تفاصيل الطلب</p>
                    <p className="text-xs" style={{ color: C.text }}>{selectedRequest.notes}</p>
                  </div>
                </div>
                <div style={{ height: 1, background: C.border }} />
              </>
            )}

            {/* Section: الحساب */}
            <div className="flex flex-col gap-2">
              {selectedRequest.price != null && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: C.muted }}>سعر الطلب</span>
                  <span style={{ color: C.text }}>{selectedRequest.price} ج.م</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: C.muted }}>رسوم التوصيل</span>
                <span style={{ color: C.text }}>{selectedRequest.delivery_fee ?? selectedRequest.areas?.delivery_fee ?? 0} ج.م</span>
              </div>
              <div
                className="flex items-center justify-between pt-2 mt-0.5"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <span className="text-sm font-bold" style={{ color: C.text }}>الإجمالي</span>
                <span className="text-lg font-black" style={{ color: C.green }}>
                  {(selectedRequest.price ?? 0) + (selectedRequest.delivery_fee ?? selectedRequest.areas?.delivery_fee ?? 0)} ج.م
                </span>
              </div>
            </div>

            {/* Section: أزرار التحكم — تأكيد للجديد فقط، إلغاء للجديد/المعلق/المقبول/في الطريق */}
            {( ["new", "pending", "accepted", "on_the_way"] as string[] ).includes(selectedRequest.status) && (
              <>
                <div style={{ height: 1, background: C.border }} />
                <div className="flex gap-2 flex-wrap">
                  {selectedRequest.status === "new" && (
                    <button
                      onClick={() => { confirmRequest(selectedRequest.id); setSelectedRequest(null); }}
                      disabled={confirmingId === selectedRequest.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[100px] disabled:opacity-60 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}
                    >
                      <span>✅</span>
                      {confirmingId === selectedRequest.id ? "جارٍ التأكيد..." : "تأكيد الطلب"}
                    </button>
                  )}
                  <button
                    onClick={() => { cancelRequest(selectedRequest.id); setSelectedRequest(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-w-[80px]"
                    style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55` }}
                  >
                    <span>✕</span> إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Shift-Time Modal (same as orders) ── */}
      {shiftTimeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShiftTimeModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h2 className="text-base font-black" style={{ color: C.yellow }}>تحذير</h2>
              </div>
              <button
                onClick={() => setShiftTimeModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}
              >✕</button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-center" style={{ color: C.muted }}>
                {shiftTimeModal.message}
              </p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button
                onClick={() => { setShiftTimeModal(null); router.push("/admin/drivers"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.teal, color: "#fff" }}
              >
                إدارة الورديات
              </button>
              <button
                onClick={() => setShiftTimeModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Shift Modal (same as orders) ── */}
      {noShiftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setNoShiftModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <h2 className="text-base font-black" style={{ color: C.text }}>لا توجد وردية مفعلة</h2>
              </div>
              <button
                onClick={() => setNoShiftModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: "#0F172A", color: C.muted }}
              >✕</button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-center" style={{ color: C.muted }}>
                {noShiftModal.message}
              </p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button
                onClick={() => { setNoShiftModal(null); router.push("/admin/drivers"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: C.teal, color: "#fff" }}
              >
                الانتقال إلى الورديات
              </button>
              <button
                onClick={() => setNoShiftModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: "#0F172A", color: C.muted, border: `1px solid ${C.border}` }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}