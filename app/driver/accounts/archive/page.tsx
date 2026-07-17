"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  red:    "#EF4444",
  blue:   "#3B82F6",
};

/* ── Helpers ── */
function fmtAmt(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function fmtDateAr(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

/*
  Direction logic for delivery_accounts:
  - "صرف"           → money FROM source TO driver's wallet  → INCOMING (+, green)
  - "تحصيل"         → money FROM driver TO office           → OUTGOING (-, red)
  - "return_advance" → driver returns advance to office      → OUTGOING (-, red)
  - "تحويل"         → depends on from_wallet:
      from_wallet = "delivery" → leaving driver's wallet    → OUTGOING (-, red)
      otherwise               → entering driver's wallet    → INCOMING (+, green)

  NOTE: officeAdvance / custody / operational cash are NOT transactions in delivery_accounts.
  They update wallet_balance directly without a delivery_accounts row, so they cannot
  accidentally appear here. wallet_balance is the authoritative current balance.
*/
function entryIsIncoming(type: string, fromWallet: string): boolean {
  if (type === "صرف")            return true;
  if (type === "تحصيل")          return false;
  if (type === "return_advance") return false;
  if (type === "تحويل")          return fromWallet !== "delivery";
  return true;
}

function entryLabel(type: string, reason: string | null): string {
  if (reason) return reason;
  if (type === "صرف")            return "دفع من المكتب";
  if (type === "تحصيل")          return "تحصيل من المكتب";
  if (type === "return_advance") return "رد سلفة";
  if (type === "تحويل")          return "تحويل رصيد";
  return type;
}

/* ── Types ── */
type ArchiveEntry = {
  id:           string;
  createdAt:    string;
  dateLabel:    string;
  label:        string;
  amount:       number;
  isIncoming:   boolean;
  isSettlement: boolean;
};

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function DriverArchivePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useCurrentUser();

  const [loading,             setLoading]             = useState(true);
  const [driverId,            setDriverId]            = useState<string | null>(null);
  const [driverInitial,       setDriverInitial]       = useState("م");
  const [driverName,          setDriverName]          = useState("");
  const [walletBalance,       setWalletBalance]       = useState(0);
  const [totalReceived,       setTotalReceived]       = useState(0);
  const [totalCurrentEarnings, setTotalCurrentEarnings] = useState(0);
  const [entries,             setEntries]             = useState<ArchiveEntry[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 7;

  const loadData = useCallback(async (did: string) => {
    const [
      { data: staffData },
      { data: txData },
      { data: settlementData },
      { data: allTxs },
    ] = await Promise.all([
      fetch("/api/driver/me/wallet", { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? res.statusText); }
          const data = await res.json();
          return { data };
        })
        .catch((err) => {
          console.error("driver-wallet fetch:", err);
          return { data: null };
        }),
      supabase
        .from("delivery_accounts")
        .select("id, type, amount, reason, from_wallet, created_at")
        .eq("delivery_id", did)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("shift_settlement_requests")
        .select("id, shift_id, created_at, shifts!shift_id(num)")
        .eq("delivery_id", did)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_accounts")
        .select("type, amount")
        .eq("delivery_id", did)
        .in("type", ["commission", "إضافة", "صرف"]),
    ]);

    /* ── Wallet balance (current) ── */
    setWalletBalance(staffData?.wallet_balance ?? 0);

    const totalCE = Math.round(
      allTxs?.reduce((s: number, tx: any) => {
        if (tx.type === "commission") return s + tx.amount;
        if (tx.type === "إضافة")     return s + tx.amount;
        if (tx.type === "صرف")       return s - tx.amount;
        return s;
      }, 0) ?? 0
    );
    setTotalCurrentEarnings(totalCE);

    /* ── Build transaction entries ── */
    const txEntries: ArchiveEntry[] = (txData ?? []).map((row: any) => {
      const incoming =
        row.type === "commission" ? true  :
        row.type === "صرف"       ? false :
        row.type === "خصم"       ? false :
        entryIsIncoming(row.type, row.from_wallet ?? "");
      const label =
        row.type === "commission"
          ? `أرباح وردية — ${fmtDateAr(row.created_at)}`
          : row.reason || row.type;
      return {
        id:           `tx-${row.id}`,
        createdAt:    row.created_at,
        dateLabel:    fmtDateAr(row.created_at),
        label,
        amount:       row.amount ?? 0,
        isIncoming:   incoming,
        isSettlement: false,
      };
    });

    /* إجمالي الأرباح المستلمة = مجموع صرف فقط */
    const received = Math.round(
      allTxs?.reduce((s: number, tx: any) => {
        if (tx.type === "صرف") return s + tx.amount;
        return s;
      }, 0) ?? 0
    );
    setTotalReceived(received);

    /* ── Settlement entries: fetch delivery fees per shift (display only) ── */
    // TODO: store driver's exact earnings share per settlement in a DB column when available.
    // Currently approximated using sum of delivery_fee for orders in that shift.
    const shiftIds = (settlementData ?? [])
      .map((s: any) => s.shift_id)
      .filter(Boolean) as string[];

    const feesByShift: Record<string, number> = {};
    if (shiftIds.length > 0) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("shift_id, delivery_fee")
        .eq("delivery_id", did)
        .eq("status", "delivered")
        .in("shift_id", shiftIds);
      (ordersData ?? []).forEach((o: any) => {
        if (o.shift_id) {
          feesByShift[o.shift_id] = (feesByShift[o.shift_id] ?? 0) + (o.delivery_fee ?? 0);
        }
      });
    }

    const settlementEntries: ArchiveEntry[] = (settlementData ?? []).map((s: any) => {
      const shiftNum = (s.shifts as any)?.num ?? "—";
      return {
        id:           `st-${s.id}`,
        createdAt:    s.created_at,
        dateLabel:    fmtDateAr(s.created_at),
        label:        `وردية ${shiftNum}`,
        amount:       feesByShift[s.shift_id] ?? 0,
        isIncoming:   true,
        isSettlement: true,
      };
    });

    /* ── Merge and sort chronologically (newest first) ── */
    const all = [...txEntries, ...settlementEntries].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    setEntries(all);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    async function init() {
      const did = authUser?.id;
      if (!did) { setLoading(false); return; }
      setDriverId(did);
      setDriverInitial((authUser?.name ?? "م")[0] ?? "م");
      setDriverName(authUser?.name ?? "");
      await loadData(did);
      setLoading(false);
    }
    init();
  }, [authLoading, authUser, loadData]);

  useEffect(() => { setPage(0); }, [fromDate, toDate]);

  /* ── Smart auto-refresh — must be before any early returns ── */
  const refreshFnRef   = useRef<(() => void) | null>(null);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    refreshFnRef.current = () => { if (driverId) loadData(driverId); };
  }, [driverId, loadData]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = now;
      refreshFnRef.current?.();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    let r = entries;
    if (fromDate) r = r.filter((e) => e.createdAt >= fromDate);
    if (toDate)   r = r.filter((e) => e.createdAt <= toDate + "T23:59:59");
    return r;
  }, [entries, fromDate, toDate]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginated  = filteredEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal}44`, borderTopColor: C.teal }} />
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!driverId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: C.bg, direction: "rtl", fontFamily: "var(--font-cairo), Arial, sans-serif" }}>
        <span className="text-5xl">🔒</span>
        <p className="text-base font-bold" style={{ color: C.text }}>يجب تسجيل الدخول أولاً</p>
        <button onClick={() => (window.location.href = "/driver/login")}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: C.teal, color: "#fff" }}>
          تسجيل الدخول
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}>
        <p className="text-lg font-black" style={{ color: C.text }}>حساباتي</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: `${C.teal}30`, color: C.teal }}>
            {driverInitial}
          </div>
          {driverName && (
            <p className="text-sm font-semibold hidden sm:block" style={{ color: C.muted }}>{driverName}</p>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <button
          onClick={() => router.push("/driver/accounts")}
          className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
          style={{ background: "transparent", color: C.muted }}>
          الوردية الحالية
        </button>
        <button
          disabled
          className="flex-1 py-2 rounded-xl text-sm font-bold"
          style={{ background: C.teal, color: "#fff" }}>
          الأرشيف المالي
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 pb-28">

        {/* Stats card */}
        <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <p className="text-xs" style={{ color: C.muted }}>إجمالي الأرباح المستلمة</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: C.teal }}>{fmtAmt(totalReceived)}</p>
          </div>
          <div className="text-left">
            <p className="text-xs" style={{ color: C.muted }}>أرباحك الحالية</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: C.green }}>{fmtAmt(totalCurrentEarnings)}</p>
          </div>
        </div>

        {/* Archive list */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <span style={{ fontSize: 48 }}>📭</span>
            <p className="text-sm font-semibold" style={{ color: C.muted }}>لا يوجد سجل مالي بعد</p>
          </div>
        ) : (
          <>
            {/* Date filter */}
            <div className="rounded-2xl p-3 flex flex-col gap-2"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-semibold" style={{ color: C.muted }}>من تاريخ</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-xs outline-none w-full"
                    dir="ltr" lang="en-US"
                    onFocus={(e) => { e.currentTarget.style.color = C.text; }}
                    onBlur={(e)  => { if (!e.currentTarget.value) e.currentTarget.style.color = "transparent"; }}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: fromDate ? C.text : "transparent", colorScheme: "dark" as const, direction: "ltr", unicodeBidi: "embed" }} />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-semibold" style={{ color: C.muted }}>إلى تاريخ</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-xs outline-none w-full"
                    dir="ltr" lang="en-US"
                    onFocus={(e) => { e.currentTarget.style.color = C.text; }}
                    onBlur={(e)  => { if (!e.currentTarget.value) e.currentTarget.style.color = "transparent"; }}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: toDate ? C.text : "transparent", colorScheme: "dark" as const, direction: "ltr", unicodeBidi: "embed" }} />
                </div>
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(""); setToDate(""); }}
                  className="self-start py-1 px-2.5 rounded-lg text-[11px] font-bold"
                  style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
                  مسح الفلتر
                </button>
              )}
            </div>

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span style={{ fontSize: 36 }}>🔍</span>
                <p className="text-sm font-semibold" style={{ color: C.muted }}>لا توجد نتائج لهذا النطاق</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                {paginated.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none" }}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <p className="text-xs" style={{ color: C.muted }}>{entry.dateLabel}</p>
                      <div className="flex items-center gap-1.5">
                        {entry.isSettlement && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                            style={{ background: `${C.teal}20`, color: C.teal }}
                          >
                            وردية
                          </span>
                        )}
                        <p className="text-sm font-bold truncate" style={{ color: C.text }}>
                          {entry.label}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-sm font-black flex-shrink-0"
                      style={{ color: entry.isIncoming ? C.green : C.red }}
                    >
                      {entry.isIncoming ? "+" : "−"}{fmtAmt(entry.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ background: `${C.teal}18`, color: C.teal }}>السابق</button>
                <span className="text-xs" style={{ color: C.muted }}>
                  صفحة {page + 1} من {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ background: `${C.teal}18`, color: C.teal }}>التالي</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
