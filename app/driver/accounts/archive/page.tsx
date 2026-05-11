"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const [loading,       setLoading]       = useState(true);
  const [driverId,      setDriverId]      = useState<string | null>(null);
  const [driverInitial, setDriverInitial] = useState("م");
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [entries,       setEntries]       = useState<ArchiveEntry[]>([]);

  const loadData = useCallback(async (did: string) => {
    const [
      { data: staffData },
      { data: txData },
      { data: settlementData },
    ] = await Promise.all([
      supabase
        .from("delivery_staff")
        .select("wallet_balance")
        .eq("id", did)
        .maybeSingle(),
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
    ]);

    /* ── Wallet balance (current) ── */
    setWalletBalance(staffData?.wallet_balance ?? 0);

    /* ── Build transaction entries ── */
    const txEntries: ArchiveEntry[] = (txData ?? []).map((row: any) => {
      const incoming = entryIsIncoming(row.type, row.from_wallet ?? "");
      return {
        id:           `tx-${row.id}`,
        createdAt:    row.created_at,
        dateLabel:    fmtDateAr(row.created_at),
        label:        entryLabel(row.type, row.reason),
        amount:       row.amount ?? 0,
        isIncoming:   incoming,
        isSettlement: false,
      };
    });

    /* إجمالي الأرباح المستلمة = مجموع المعاملات الواردة فقط (لا تشمل العهدة) */
    const received = txEntries
      .filter((e) => e.isIncoming)
      .reduce((s, e) => s + e.amount, 0);
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
      await loadData(did);
      setLoading(false);
    }
    init();
  }, [authLoading, authUser, loadData]);

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

  /* ── Smart auto-refresh ── */
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

  /* ── Main render ── */
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}>

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}>
        <p className="text-lg font-black" style={{ color: C.text }}>حساباتي</p>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: `${C.teal}30`, color: C.teal }}>
          {driverInitial}
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
            <p className="text-2xl font-black mt-0.5" style={{ color: C.green }}>{fmtAmt(walletBalance)}</p>
          </div>
        </div>

        {/* Archive list */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <span style={{ fontSize: 48 }}>📭</span>
            <p className="text-sm font-semibold" style={{ color: C.muted }}>لا يوجد سجل مالي بعد</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5"
                style={{ borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none" }}
              >
                {/* Right: date + label */}
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

                {/* Left: amount */}
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
      </div>
    </div>
  );
}
