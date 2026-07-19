"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { supabase } from "@/lib/supabase";

/* ── Palette ── */
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
  blue:   "#3B82F6",
};

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type DriverWallet = { id: number; name: string; phone: string; balance: number };
type MotoWallet   = { id: number; name: string; plate: string;  balance: number };
type WalletCat    = "office" | "delivery" | "moto" | "custody";

type CustodyRecord = {
  id:          number;
  deliveryId:  string;
  driverName:  string;
  amount:      number;
  status:      "active" | "returned";
  createdAt:   string;
};

type CustodyTx = {
  id:        number;
  type:      string;
  amount:    number;
  reason:    string | null;
  createdAt: string;
  balance:   number;
};
type TxType       = "صرف" | "تحصيل" | "تحويل" | "إيداع" | "عهدة" | "إضافة" | "commission";

type Transaction = {
  id:          string;
  createdAt:   string;   /* ISO 8601 — formatted on display */
  type:        TxType;
  personName?: string;
  fromWallet:  string;
  toWallet:    string;
  amount:      number;
  description: string;
};

type SettlementRequest = {
  id:           number;
  deliveryId:   number;
  shiftId:      string;
  driverName:   string;
  totalOrders:  number;
  cashTotal:    number;
  vodafoneTotal: number;
  restaurantDebt: number;
  createdAt:    string;
};

type CloseRequest = {
  id:                number;
  deliveryId:        string;
  deliveryShiftId:   string;
  driverName:        string;
  amount:            number;
  totalAdvance:      number;
  totalDeliveryFees: number;
  createdAt:         string;
};

/* ── Helpers ── */
function roundEGP(n: number): number {
  return Math.round(n);
}

function fmtAmt(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function fmtDateAr(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    return `${date} — ${time}`;
  } catch {
    return iso;
  }
}

const WALLET_OPTIONS: { value: WalletCat; label: string; icon: string }[] = [
  { value: "office",   label: "خزنة المكتب",      icon: "🏦" },
  { value: "delivery", label: "خزنة الدلفري",     icon: "🛵" },
  { value: "moto",     label: "خزنة الموتسكلات",  icon: "🏍" },
  { value: "custody",  label: "خزنة العهدة",       icon: "🔐" },
];
const WALLET_LABELS: Record<WalletCat, string> = {
  office:   "خزنة المكتب",
  delivery: "خزنة الدلفري",
  moto:     "خزنة الموتسكلات",
  custody:  "خزنة العهدة",
};

const FROM_WALLET_LABEL: Record<string, string> = {
  office:   "خزنة المكتب",
  delivery: "خزنة الدلفري",
  moto:     "خزنة الموتسكلات",
  custody:  "خزنة العهدة",
};

const TX_META: Record<TxType, { icon: string; color: string; label: (t: Transaction) => string }> = {
  "صرف":    {
    icon:  "↑",
    color: C.red,
    label: (t) => `صرف ${fmtAmt(t.amount)}${t.personName ? ` لـ ${t.personName}` : ""}`,
  },
  "تحصيل": {
    icon:  "↓",
    color: C.green,
    label: (t) => `تحصيل ${fmtAmt(t.amount)}${t.personName ? ` من ${t.personName}` : ""}`,
  },
  "تحويل": {
    icon:  "⇄",
    color: C.green,
    label: (t) => `تحويل ${fmtAmt(t.amount)} من ${t.fromWallet} إلى ${t.toWallet}`,
  },
  "إضافة": {
    icon:  "↓",
    color: C.green,
    label: (t) => `إضافة ${fmtAmt(t.amount)}${t.personName ? ` لـ ${t.personName}` : ""}`,
  },
  "commission": {
    icon:  "★",
    color: C.teal,
    label: (t) => `حصة توصيل ${fmtAmt(t.amount)}${t.personName ? ` — ${t.personName}` : ""}`,
  },
  "إيداع": {
    icon:  "+",
    color: C.green,
    label: (t) => `إيداع ${fmtAmt(t.amount)} في خزنة المكتب`,
  },
  "عهدة": {
    icon:  "↑",
    color: C.green,
    label: (t) => `عهدة ${fmtAmt(t.amount)}${t.personName ? ` لـ ${t.personName}` : ""}`,
  },
};

/* ── Row mappers ── */

/* Driver name lookup map — built in loadData(), consumed by mappers */
const driverNameMap = new Map<number, string>();

/*
  Semantic conventions for display:
  - صرف  (payment to person):     fromWallet = source,          toWallet = "خزنة الدلفري"
  - تحصيل (collection from person): fromWallet = "خزنة الدلفري", toWallet = destination
  - تحويل (transfer):              direction derived from from_wallet
  This ensures every delivery_accounts row always matches the delivery tab filter.
*/
function mapDeliveryTx(row: any): Transaction {
  const fromLabel = FROM_WALLET_LABEL[row.from_wallet] ?? "خزنة الدلفري";
  let fromWallet: string;
  let toWallet: string;

  if (row.type === "تحويل") {
    fromWallet = fromLabel;
    toWallet   = row.from_wallet === "delivery" ? "خزنة المكتب" : "خزنة الدلفري";
  } else if (row.type === "صرف") {
    fromWallet = fromLabel;
    toWallet   = "خزنة الدلفري";
  } else {
    /* تحصيل */
    fromWallet = "خزنة الدلفري";
    toWallet   = fromLabel;
  }

  return {
    id:          `d-${row.id}`,
    createdAt:   row.created_at,
    type:        row.type as TxType,
    personName:  driverNameMap.get(row.delivery_id),
    fromWallet,
    toWallet,
    amount:      row.amount,
    description: row.reason ?? "",
  };
}

function mapMotoTx(row: any): Transaction {
  let fromWallet = "خزنة الموتسكلات";
  let toWallet   = "—";

  if (row.type === "تحويل") {
    toWallet = "خزنة المكتب";
  } else if (row.type === "صرف") {
    toWallet = "خزنة الموتسكلات";
  }

  return {
    id:          `m-${row.id}`,
    createdAt:   row.created_at,
    type:        row.type as TxType,
    personName:  (row.motorcycles as any)?.name,
    fromWallet,
    toWallet,
    amount:      row.amount,
    description: row.reason ?? "",
  };
}

function mapMainWalletTx(row: any): Transaction {
  return {
    id:          `mw-${row.id}`,
    createdAt:   row.created_at,
    type:        row.type as TxType,
    fromWallet:  "خزنة المكتب",
    toWallet:    "خزنة المكتب",
    amount:      row.amount,
    description: row.reason ?? "",
  };
}

/* ─────────────────────────────────────────────
   COMPONENT: TransactionActivity (reusable)
───────────────────────────────────────────── */

function TransactionActivity({
  walletKey,
  transactions,
}: {
  walletKey: WalletCat | "all";
  transactions: Transaction[];
}) {
  const [query,      setQuery]      = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [page,       setPage]       = useState(0);
  const PAGE_SIZE = 10;

  const walletLabel = walletKey === "all" ? null : WALLET_LABELS[walletKey];

  const walletFiltered = useMemo(() => {
    if (!walletLabel) return transactions;
    return transactions.filter(
      (t) => t.fromWallet === walletLabel || t.toWallet === walletLabel,
    );
  }, [transactions, walletLabel]);

  const typeFiltered = useMemo(() => {
    if (!typeFilter) return walletFiltered;
    return walletFiltered.filter((t) => t.type === typeFilter);
  }, [walletFiltered, typeFilter]);

  const dateFiltered = useMemo(() => {
    let r = typeFiltered;
    if (fromDate) r = r.filter((t) => t.createdAt >= fromDate);
    if (toDate)   r = r.filter((t) => t.createdAt <= toDate + "T23:59:59");
    return r;
  }, [typeFiltered, fromDate, toDate]);

  const displayed = useMemo(() => {
    if (!query.trim()) return dateFiltered;
    const q = query.trim().toLowerCase();
    return dateFiltered.filter(
      (t) =>
        (t.personName ?? "").toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
    );
  }, [dateFiltered, query]);

  useEffect(() => { setPage(0); }, [query, typeFilter, fromDate, toDate]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paginated  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilter  = !!(query || typeFilter || fromDate || toDate);

  function clearFilters() { setQuery(""); setTypeFilter(""); setFromDate(""); setToDate(""); setPage(0); }

  return (
    <div className="rounded-2xl flex flex-col gap-0 overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>

      <div className="flex flex-col gap-3 px-4 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${C.teal}22`, color: C.teal }}>
            {displayed.length} عملية
          </span>
        </div>

        {/* Date filter */}
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-semibold" style={{ color: C.muted }}>من تاريخ</label>
            <input type="date" value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              className="rounded-lg px-2 py-1.5 text-xs outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const }} />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-semibold" style={{ color: C.muted }}>إلى تاريخ</label>
            <input type="date" value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              className="rounded-lg px-2 py-1.5 text-xs outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const }} />
          </div>
          {(fromDate || toDate) && (
            <button onClick={clearFilters}
              className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold hover:opacity-70"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              مسح الفلتر
            </button>
          )}
        </div>

        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs" style={{ color: C.muted }}>
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الشخص أو البيان..."
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setPage(0); }}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-xs hover:opacity-70"
              style={{ color: C.muted }}>✕</button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {([
            { value: "",            label: "الكل"       },
            { value: "صرف",         label: "صرف"        },
            { value: "تحصيل",      label: "تحصيل"      },
            { value: "تحويل",      label: "تحويل"      },
            { value: "إيداع",      label: "إيداع"      },
            { value: "commission",  label: "حصة توصيل"  },
          ]).map(({ value, label }) => {
            const active = typeFilter === value;
            const col =
              value === "صرف"        ? C.red   :
              value === "تحصيل"     ? C.green :
              value === "تحويل"     ? C.blue  :
              value === "commission" ? C.teal  : C.teal;
            return (
              <button key={value || "all"}
                onClick={() => { setTypeFilter(value); setPage(0); }}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: active ? col : `${col}18`,
                  color:      active ? "#fff" : col,
                  border:     `1px solid ${active ? col : `${col}33`}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <span style={{ fontSize: 36 }}>📭</span>
            <p className="text-sm font-semibold" style={{ color: C.muted }}>
              {hasFilter ? "لا توجد نتائج للبحث" : "لا يوجد عمليات حتى الآن"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {paginated.map((t, i) => {
              const meta   = TX_META[t.type] ?? { icon: "•", color: C.muted, label: () => t.description || t.type };
              const isLast = i === paginated.length - 1;
              const amountColor = (() => {
                if (t.type !== "تحويل") return meta.color;
                if (walletKey === "all") {
                  if (t.fromWallet === "خزنة المكتب") return C.red;
                  if (t.toWallet   === "خزنة المكتب") return C.green;
                  return meta.color;
                }
                if (walletLabel && t.fromWallet === walletLabel) return C.red;
                if (walletLabel && t.toWallet   === walletLabel) return C.green;
                return meta.color;
              })();
              return (
                <div key={t.id}
                  className="flex items-start gap-4 px-4 py-3.5 transition-all"
                  style={{
                    borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                    animation:    i === 0 ? "txFadeIn 0.35s ease" : undefined,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 mt-0.5"
                    style={{ background: `${meta.color}20`, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug" style={{ color: C.text }}>
                      {meta.label(t)}
                    </p>
                    {t.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>
                        {t.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                        style={{ background: `${C.border}`, color: C.muted }}>
                        {t.fromWallet}
                      </span>
                      {t.toWallet !== "—" && (
                        <>
                          <span style={{ color: C.muted, fontSize: 10 }}>→</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                            style={{ background: `${C.border}`, color: C.muted }}>
                            {t.toWallet}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: `${C.muted}99` }}>
                      {fmtDateAr(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-base font-black" style={{ color: amountColor }}>
                      {fmtAmt(t.amount)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${amountColor}22`, color: amountColor }}>
                      {t.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {displayed.length > 0 && (
        <div className="px-4 py-2.5 border-t text-xs flex items-center justify-between gap-2"
          style={{ borderColor: C.border, color: C.muted }}>
          <span>
            {hasFilter
              ? `${displayed.length} نتيجة من ${walletFiltered.length}`
              : `${walletFiltered.length} عملية مسجلة`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40"
                style={{ background: `${C.teal}18`, color: C.teal }}>السابق</button>
              <span className="text-[11px]" style={{ color: C.muted }}>
                صفحة {page + 1} من {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40"
                style={{ background: `${C.teal}18`, color: C.teal }}>التالي</button>
            </div>
          )}
          {hasFilter && (
            <button onClick={clearFilters} className="text-[11px] hover:opacity-70"
              style={{ color: C.teal }}>مسح البحث</button>
          )}
        </div>
      )}

      <style>{`
        @keyframes txFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SettlementModal — تصفية الوردية
───────────────────────────────────────────── */

function SettlementModal({
  req,
  motos,
  onConfirm,
  onClose,
  submitting,
}: {
  req:        SettlementRequest;
  motos:      { id: number; name: string }[];
  onConfirm:  (advanceReturn: number, motoId: number | null) => void;
  onClose:    () => void;
  submitting: boolean;
}) {
  const [advReturn, setAdvReturn] = useState("");
  const [motoId,    setMotoId]    = useState<number | null>(null);
  const [error,     setError]     = useState("");

  const totalCollected = req.cashTotal + req.vodafoneTotal;
  const advReturnNum   = parseFloat(advReturn) || 0;
  const remaining      = totalCollected - advReturnNum;
  const share          = remaining > 0 ? Math.round(remaining / 3) : 0;

  function handleConfirm() {
    if (advReturnNum < 0) { setError("قيمة رد السلفة لا يمكن أن تكون سالبة"); return; }
    if (advReturnNum > totalCollected) { setError("قيمة رد السلفة أكبر من المبلغ المحصّل"); return; }
    onConfirm(advReturnNum, motoId);
  }

  const sel = { background: `${C.bg}`, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <div>
            <h2 className="text-base font-black" style={{ color: C.text }}>تصفية الوردية</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{req.driverName}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Summary */}
          <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: C.bg }}>
            {[
              { label: "أوردرات الوردية",  value: `${req.totalOrders} أوردر`,    color: C.text   },
              { label: "نقدي محصّل",       value: fmtAmt(req.cashTotal),          color: C.green  },
              { label: "فودافون محصّل",    value: fmtAmt(req.vodafoneTotal),      color: C.blue   },
              { label: "ديون مطاعم",       value: fmtAmt(req.restaurantDebt),     color: C.red    },
              { label: "إجمالي محصّل",    value: fmtAmt(totalCollected),          color: C.teal   },
            ].map((r) => (
              <div key={r.label} className="flex justify-between">
                <span className="text-xs" style={{ color: C.muted }}>{r.label}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Advance return input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>قيمة رد السلفة</label>
            <div className="relative">
              <input type="number" min="0" value={advReturn}
                onChange={(e) => { setAdvReturn(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.orange}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {/* Motorcycle selector */}
          {motos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.muted }}>موتوسيكل الوردية (اختياري)</label>
              <select value={motoId ?? ""} onChange={(e) => setMotoId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={sel}>
                <option value="">بدون موتوسيكل</option>
                {motos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {/* Settlement preview */}
          {remaining > 0 && (
            <div className="rounded-xl p-3 flex flex-col gap-1.5"
              style={{ background: `${C.teal}12`, border: `1px solid ${C.teal}33` }}>
              <p className="text-xs font-bold text-center mb-1" style={{ color: C.teal }}>
                توزيع المبلغ (المتبقي ÷ 3)
              </p>
              {[
                { label: "حصة السائق",     value: share },
                { label: "حصة الموتوسيكل", value: share },
                { label: "حصة المكتب",     value: share },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>{r.label}</span>
                  <span className="text-xs font-bold" style={{ color: C.teal }}>{fmtAmt(r.value)}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            {submitting ? "جارٍ التصفية..." : "تأكيد التصفية"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: ملخص — تصفية الورديات
───────────────────────────────────────────── */

function SummaryTab({
  closeRequests,
  settlementRequests,
  onApproveClose,
  onRejectClose,
  onSettle,
  closeProcessingIds,
  settlingId,
}: {
  closeRequests:      CloseRequest[];
  settlementRequests: SettlementRequest[];
  onApproveClose:     (req: CloseRequest) => void;
  onRejectClose:      (id: number) => void;
  onSettle:           (req: SettlementRequest) => void;
  closeProcessingIds: Set<number>;
  settlingId:         number | null;
}) {
  return (
    <div className="flex flex-col gap-5">

      {/* ── Close requests ── */}
      {closeRequests.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.teal}44` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: C.border }}>
            <h3 className="text-sm font-black" style={{ color: C.text }}>طلبات تقفيل الوردية</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${C.teal}22`, color: C.teal }}>
              {closeRequests.length} طلب
            </span>
          </div>

          <div className="flex flex-col">
            {closeRequests.map((req, i) => {
              const processing = closeProcessingIds.has(req.id);
              const isLast     = i === closeRequests.length - 1;
              return (
                <div key={req.id}
                  className="flex items-start gap-4 px-4 py-3.5"
                  style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ background: `${C.teal}20` }}>🔒</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: C.text }}>{req.driverName}</p>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      <div className="h-px" style={{ background: C.border }} />
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-xs" style={{ color: C.muted }}>🏦 العهدة</span>
                        <span className="text-xs font-semibold" style={{ color: C.text }}>{fmtAmt(req.totalAdvance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-xs" style={{ color: C.muted }}>💰 أرباح الوردية</span>
                        <span className="text-xs font-semibold" style={{ color: C.text }}>{fmtAmt(req.totalDeliveryFees)}</span>
                      </div>
                      <div className="h-px" style={{ background: C.border }} />
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-xs" style={{ color: C.muted }}>📦 الإجمالي</span>
                        <span className="text-xs font-black" style={{ color: C.teal }}>{fmtAmt(req.totalAdvance + req.totalDeliveryFees)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] mt-1.5" style={{ color: `${C.muted}99` }}>
                      {fmtDateAr(req.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => onApproveClose(req)}
                      disabled={processing}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
                      style={{ background: `${C.green}22`, color: C.green }}>
                      {processing ? "..." : "موافقة"}
                    </button>
                    <button
                      onClick={() => onRejectClose(req.id)}
                      disabled={processing}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
                      style={{ background: `${C.red}22`, color: C.red }}>
                      {processing ? "..." : "رفض"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Settlement requests ── */}
      {settlementRequests.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.teal}44` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: C.border }}>
            <h3 className="text-sm font-black" style={{ color: C.text }}>طلبات تصفية الورديات</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${C.teal}22`, color: C.teal }}>
              {settlementRequests.length} طلب
            </span>
          </div>

          <div className="flex flex-col">
            {settlementRequests.map((req, i) => {
              const settling = settlingId === req.id;
              const isLast   = i === settlementRequests.length - 1;
              const total    = req.cashTotal + req.vodafoneTotal;
              return (
                <div key={req.id}
                  className="flex items-start gap-4 px-4 py-3.5"
                  style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ background: `${C.teal}20` }}>🔒</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: C.text }}>{req.driverName}</p>
                    <p className="text-sm font-black mt-0.5" style={{ color: C.teal }}>
                      {fmtAmt(total)}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: C.muted }}>{req.totalOrders} أوردر</span>
                      {req.restaurantDebt > 0 && (
                        <span className="text-xs" style={{ color: C.red }}>دين مطاعم: {fmtAmt(req.restaurantDebt)}</span>
                      )}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: `${C.muted}99` }}>
                      {fmtDateAr(req.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onSettle(req)}
                    disabled={settling}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity flex-shrink-0 mt-0.5"
                    style={{ background: `${C.teal}22`, color: C.teal }}>
                    {settling ? "..." : "تصفية"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL A — إدارة (صرف / تحصيل)
───────────────────────────────────────────── */

function ManageModal({ target, officeBalance, deliveryBalance, motoBalance, custodyBalance, onSubmit, onClose, submitting }: {
  target: { type: "driver" | "moto"; id: number; name: string; balance: number };
  officeBalance:   number;
  deliveryBalance: number;
  motoBalance:     number;
  custodyBalance:  number;
  onSubmit: (op: "صرف" | "تحصيل", wallet: WalletCat, amount: number, note: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [op,     setOp]     = useState<"صرف" | "تحصيل">("صرف");
  const [wallet, setWallet] = useState<WalletCat>("office");
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  const icon = target.type === "driver" ? "🛵" : "🏍";

  function getWalletBalance(w: WalletCat): number {
    if (w === "office")   return officeBalance;
    if (w === "delivery") return deliveryBalance;
    if (w === "custody")  return custodyBalance;
    return motoBalance;
  }

  function handleSubmit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setError("أدخل مبلغاً أكبر من صفر"); return; }
    if (getWalletBalance(wallet) < n) {
      setError(`رصيد غير كافٍ في ${WALLET_LABELS[wallet]}`);
      return;
    }
    if (op === "تحصيل" && target.balance < n) {
      setError("رصيد الشخص غير كافٍ للتحصيل");
      return;
    }
    onSubmit(op, wallet, n, note.trim());
  }

  const opColor = op === "صرف" ? C.teal : C.orange;
  const sel = { background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <div>
            <h2 className="text-base font-black" style={{ color: C.text }}>إدارة الرصيد</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {icon} {target.name} — الرصيد: <span style={{ color: C.teal }}>{fmtAmt(target.balance)}</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>نوع العملية</label>
            <div className="flex gap-2">
              {([
                { v: "صرف",    label: "➖ صرف راتب / مكافأة", col: C.teal   },
                { v: "تحصيل", label: "➕ إضافة / تصحيح",   col: C.orange },
              ] as const).filter(({ v }) => wallet !== "custody" || v === "صرف").map(({ v, label, col }) => {
                const active = op === v;
                return (
                  <button key={v} onClick={() => { setOp(v); setError(""); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? col : `${col}18`,
                      color:      active ? "#fff" : col,
                      border:     `1px solid ${active ? col : `${col}44`}`,
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] px-1" style={{ color: C.muted }}>
              {op === "صرف"
                ? `سيُخصم من رصيد ${target.name}`
                : `سيُضاف لرصيد ${target.name}`}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              من خزنة <span style={{ color: C.red }}>*</span>
            </label>
            <select value={wallet} onChange={(e) => { const w = e.target.value as WalletCat; setWallet(w); setError(""); setNote(""); if (w === "custody") setOp("صرف"); }}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={sel}>
              {WALLET_OPTIONS.filter((o) => o.value !== "custody" || target.type === "driver").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.icon}  {o.label} — {fmtAmt(getWalletBalance(o.value))}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${opColor}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          {wallet !== "custody" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: راتب، مكافأة، خصم غياب، بنزين..."
                rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: opColor, color: "#fff" }}>
            {submitting ? "جارٍ المعالجة..." : "تأكيد"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL — إجراء بسيط (صرف / إضافة / عهدة)
───────────────────────────────────────────── */

function SimpleActionModal({
  title,
  targetName,
  withNote,
  accentColor,
  confirmLabel,
  onSubmit,
  onClose,
  submitting,
}: {
  title:        string;
  targetName:   string;
  withNote:     boolean;
  accentColor:  string;
  confirmLabel: string;
  onSubmit:     (amount: number, note: string) => void;
  onClose:      () => void;
  submitting:   boolean;
}) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  function handleConfirm() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setError("أدخل مبلغاً أكبر من صفر"); return; }
    onSubmit(n, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <div>
            <h2 className="text-base font-black" style={{ color: C.text }}>{title}</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{targetName}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${accentColor}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {withNote && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
              <input type="text" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: راتب، مكافأة..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
            </div>
          )}

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: accentColor, color: "#fff" }}>
            {submitting ? "جارٍ المعالجة..." : confirmLabel}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL B — تحويل بين الخزن
───────────────────────────────────────────── */

function TransferModal({ officeBalance, deliveryBalance, motoBalance, custodyBalance, onSubmit, onClose, submitting }: {
  officeBalance:   number;
  deliveryBalance: number;
  motoBalance:     number;
  custodyBalance:  number;
  onSubmit: (from: WalletCat, to: WalletCat, amount: number, note: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [from,   setFrom]   = useState<WalletCat>("office");
  const [to,     setTo]     = useState<WalletCat>("delivery");
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  function getBalance(cat: WalletCat): number {
    if (cat === "office")   return officeBalance;
    if (cat === "delivery") return deliveryBalance;
    if (cat === "custody")  return custodyBalance;
    return motoBalance;
  }

  function handleFromChange(val: WalletCat) {
    setFrom(val); setError("");
    if (val === to) setTo(val === "office" ? "delivery" : "office");
  }
  function handleToChange(val: WalletCat) {
    setTo(val); setError("");
    if (val === from) setFrom(val === "office" ? "delivery" : "office");
  }

  function handleSubmit() {
    const n = parseFloat(amount);
    if (!n || n <= 0)         { setError("أدخل مبلغاً أكبر من صفر");        return; }
    if (from === to)          { setError("❌ لا يمكن التحويل من خزنة إلى نفسها"); return; }
    if (getBalance(from) < n) { setError("رصيد غير كافٍ في الخزنة المصدر"); return; }
    onSubmit(from, to, n, note.trim());
  }

  const sel = { background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>⇄ تحويل بين الخزن</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>من خزنة</label>
            <select value={from} onChange={(e) => handleFromChange(e.target.value as WalletCat)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={sel}>
              {WALLET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.icon}  {o.label} — {fmtAmt(getBalance(o.value))}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center"><span className="text-xl" style={{ color: C.teal }}>↓</span></div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>إلى خزنة</label>
            <select value={to} onChange={(e) => handleToChange(e.target.value as WalletCat)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={sel}>
              {WALLET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.icon}  {o.label} — {fmtAmt(getBalance(o.value))}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.teal}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تحويل لصرف رواتب، تمويل بنزين..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            {submitting ? "جارٍ المعالجة..." : "تأكيد التحويل"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL C — إيداع رصيد في خزنة المكتب
───────────────────────────────────────────── */

function DepositModal({ onSubmit, onClose, submitting }: {
  onSubmit:   (amount: number, note: string) => void;
  onClose:    () => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  function handleConfirm() {
    const n = parseFloat(amount);
    if (!n || n <= 0)    { setError("أدخل مبلغاً أكبر من صفر"); return; }
    if (!note.trim())    { setError("البيان مطلوب");             return; }
    onSubmit(n, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>إيداع رصيد — خزنة المكتب</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.green}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              البيان <span style={{ color: C.red }}>*</span>
            </label>
            <input type="text" value={note}
              onChange={(e) => { setNote(e.target.value); setError(""); }}
              placeholder="مثال: رأس مال ابتدائي"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.green, color: "#fff" }}>
            {submitting ? "جارٍ الإيداع..." : "تأكيد"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL D — سحب رصيد من خزنة المكتب
───────────────────────────────────────────── */

function WithdrawModal({ officeBalance, onSubmit, onClose, submitting }: {
  officeBalance: number;
  onSubmit:      (amount: number, note: string) => void;
  onClose:       () => void;
  submitting:    boolean;
}) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");

  function handleConfirm() {
    const n = parseFloat(amount);
    if (!n || n <= 0)        { setError("أدخل مبلغاً أكبر من صفر"); return; }
    if (n > officeBalance)   { setError("رصيد غير كافٍ");           return; }
    onSubmit(n, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>سحب رصيد — خزنة المكتب</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="rounded-xl px-3 py-2 flex justify-between items-center"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <span className="text-xs" style={{ color: C.muted }}>الرصيد الحالي</span>
            <span className="text-sm font-black" style={{ color: C.teal }}>{fmtAmt(officeBalance)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              المبلغ <span style={{ color: C.red }}>*</span>
            </label>
            <div className="relative">
              <input type="number" min="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.red}55`, color: C.text }} />
              <span className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-bold"
                style={{ color: C.muted }}>ج.م</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <input type="text" value={note}
              onChange={(e) => { setNote(e.target.value); setError(""); }}
              placeholder="مثال: مصاريف تشغيل، إيجار..."
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>

          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: C.red, color: "#fff" }}>
            {submitting ? "جارٍ السحب..." : "تأكيد السحب"}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة المكتب
───────────────────────────────────────────── */

function OfficeWalletTab({ balance, transactions, onDeposit, onWithdraw }: {
  balance:      number;
  transactions: Transaction[];
  onDeposit:    () => void;
  onWithdraw:   () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة المكتب</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(balance)}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onDeposit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44` }}>
              <span>+</span>
              <span>إيداع رصيد</span>
            </button>
            <button
              onClick={onWithdraw}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}44` }}>
              <span>−</span>
              <span>سحب رصيد</span>
            </button>
          </div>
        </div>
        <span style={{ fontSize: 40 }}>🏦</span>
      </div>
      <TransactionActivity walletKey="all" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الدلفري
───────────────────────────────────────────── */

function DeliveryWalletTab({ poolBalance, totalCommission, drivers, transactions, onDriverPay, onDriverCustody, onDriverAdd }: {
  poolBalance:     number;
  totalCommission: number;
  drivers:         DriverWallet[];
  transactions:    Transaction[];
  onDriverPay:     (id: number) => void;
  onDriverCustody: (id: number) => void;
  onDriverAdd:     (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs mb-1" style={{ color: C.muted }}>رصيد الخزنة</p>
            <p className="text-3xl font-black" style={{ color: C.orange }}>{fmtAmt(poolBalance)}</p>
          </div>
          <div className="border-r pr-6" style={{ borderColor: C.border }}>
            <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي الحصص</p>
            <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(totalCommission)}</p>
          </div>
        </div>
        <span style={{ fontSize: 40 }}>🛵</span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-black" style={{ color: C.text }}>رصيد السائقين</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { col: "الاسم",       hide: "" },
                  { col: "رقم الهاتف", hide: " hidden sm:table-cell" },
                  { col: "الرصيد",     hide: "" },
                  { col: "إجراءات",   hide: "" },
                ].map(({ col, hide }) => (
                  <th key={col}
                    className={`px-4 py-3 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.id}
                  style={{ borderBottom: i < drivers.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: `${C.orange}28`, color: C.orange }}>{d.name[0]}</div>
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{d.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {d.phone}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold"
                      style={{ color: d.balance >= 0 ? C.green : C.red }}>{fmtAmt(d.balance)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => onDriverPay(d.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.teal}22`, color: C.teal }}>صرف راتب</button>
                      <button onClick={() => onDriverCustody(d.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.orange}22`, color: C.orange }}>عهدة</button>
                      <button onClick={() => onDriverAdd(d.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.green}22`, color: C.green }}>➕ إضافة</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {drivers.length} سائق
        </div>
      </div>

      <TransactionActivity walletKey="delivery" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الموتسكلات
───────────────────────────────────────────── */

function MotoWalletTab({ poolBalance, totalCommission, motos, transactions, onMotoPay, onMotoAdd }: {
  poolBalance:     number;
  totalCommission: number;
  motos:           MotoWallet[];
  transactions:    Transaction[];
  onMotoPay:       (id: number) => void;
  onMotoAdd:       (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs mb-1" style={{ color: C.muted }}>رصيد الخزنة</p>
            <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(poolBalance)}</p>
          </div>
          <div className="border-r pr-6" style={{ borderColor: C.border }}>
            <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي الحصص</p>
            <p className="text-3xl font-black" style={{ color: C.orange }}>{fmtAmt(totalCommission)}</p>
          </div>
        </div>
        <span style={{ fontSize: 40 }}>🏍</span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-black" style={{ color: C.text }}>رصيد الموتوسيكلات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { col: "الموتوسيكل", hide: "" },
                  { col: "رقم اللوحة", hide: " hidden sm:table-cell" },
                  { col: "الرصيد",    hide: "" },
                  { col: "إجراءات",  hide: "" },
                ].map(({ col, hide }) => (
                  <th key={col}
                    className={`px-4 py-3 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {motos.map((m, i) => (
                <tr key={m.id}
                  style={{ borderBottom: i < motos.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: `${C.teal}20` }}>🏍</div>
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                    {m.plate}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold"
                      style={{ color: m.balance >= 0 ? C.green : C.red }}>{fmtAmt(m.balance)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => onMotoPay(m.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.red}22`, color: C.red }}>صرف</button>
                      <button onClick={() => onMotoAdd(m.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.green}22`, color: C.green }}>إضافة</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {motos.length} موتوسيكل
        </div>
      </div>

      <TransactionActivity walletKey="moto" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة العهدة
───────────────────────────────────────────── */

function CustodyWalletTab({ balance, active, transactions }: {
  balance:      number;
  active:       CustodyRecord[];
  transactions: CustodyTx[];
}) {
  const [query,    setQuery]    = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 10;

  const dateFiltered = useMemo(() => {
    let r = transactions;
    if (fromDate) r = r.filter((t) => t.createdAt >= fromDate);
    if (toDate)   r = r.filter((t) => t.createdAt <= toDate + "T23:59:59");
    return r;
  }, [transactions, fromDate, toDate]);

  const displayed = useMemo(() => {
    if (!query.trim()) return dateFiltered;
    const q = query.trim().toLowerCase();
    return dateFiltered.filter(
      (t) =>
        t.type.includes(q) ||
        (t.reason ?? "").toLowerCase().includes(q),
    );
  }, [dateFiltered, query]);

  useEffect(() => { setPage(0); }, [query, fromDate, toDate]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paginated  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilter  = !!(query || fromDate || toDate);

  function clearFilters() { setQuery(""); setFromDate(""); setToDate(""); setPage(0); }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة العهدة</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(balance)}</p>
        </div>
        <span style={{ fontSize: 40 }}>🔐</span>
      </div>

      {/* العهد النشطة */}
      {active.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
            <h3 className="text-sm font-black" style={{ color: C.text }}>🟡 العهد النشطة</h3>
          </div>
          <div className="flex flex-col">
            {active.map((r, i) => (
              <div key={r.id}
                className="flex items-center gap-4 px-4 py-3"
                style={{ borderBottom: i < active.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${C.orange}18` }}>🛵</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{r.driverName}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: `${C.muted}99` }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </p>
                </div>
                <span className="text-sm font-black flex-shrink-0" style={{ color: C.orange }}>
                  {fmtAmt(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* سجل عمليات خزنة العهدة */}
      <div className="rounded-2xl flex flex-col gap-0 overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        <div className="flex flex-col gap-3 px-4 py-4 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${C.teal}22`, color: C.teal }}>
              {displayed.length} عملية
            </span>
          </div>

          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
              <label className="text-[10px] font-semibold" style={{ color: C.muted }}>من تاريخ</label>
              <input type="date" value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                className="rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const }} />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
              <label className="text-[10px] font-semibold" style={{ color: C.muted }}>إلى تاريخ</label>
              <input type="date" value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                className="rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" as const }} />
            </div>
            {(fromDate || toDate) && (
              <button onClick={clearFilters}
                className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold hover:opacity-70"
                style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
                مسح الفلتر
              </button>
            )}
          </div>

          <div className="relative">
            <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs" style={{ color: C.muted }}>🔍</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="ابحث في البيان أو نوع العملية..."
              className="w-full rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
            />
            {query && (
              <button onClick={() => { setQuery(""); setPage(0); }}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-xs hover:opacity-70"
                style={{ color: C.muted }}>✕</button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span style={{ fontSize: 36 }}>📭</span>
              <p className="text-sm font-semibold" style={{ color: C.muted }}>
                {hasFilter ? "لا توجد نتائج للبحث" : "لا توجد عمليات حتى الآن"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {paginated.map((tx, i) => {
                const isOut  = tx.type === "صرف" || tx.type === "تحويل";
                const col    = isOut ? C.red : C.green;
                const isLast = i === paginated.length - 1;
                return (
                  <div key={tx.id}
                    className="flex items-start gap-4 px-4 py-3.5"
                    style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 mt-0.5"
                      style={{ background: `${col}20`, color: col }}>
                      {isOut ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: C.text }}>
                        {isOut ? "صرف" : "تحصيل"} {fmtAmt(tx.amount)}
                      </p>
                      {tx.reason && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{tx.reason}</p>
                      )}
                      <p className="text-[10px] mt-1" style={{ color: `${C.muted}99` }}>{fmtDateAr(tx.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-black" style={{ color: col }}>{fmtAmt(tx.amount)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${C.teal}18`, color: C.teal }}>
                        رصيد: {fmtAmt(tx.balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {displayed.length > 0 && (
          <div className="px-4 py-2.5 border-t text-xs flex items-center justify-between gap-2"
            style={{ borderColor: C.border, color: C.muted }}>
            <span>
              {hasFilter
                ? `${displayed.length} نتيجة من ${transactions.length}`
                : `${transactions.length} عملية مسجلة`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40"
                  style={{ background: `${C.teal}18`, color: C.teal }}>السابق</button>
                <span className="text-[11px]" style={{ color: C.muted }}>
                  صفحة {page + 1} من {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40"
                  style={{ background: `${C.teal}18`, color: C.teal }}>التالي</button>
              </div>
            )}
            {hasFilter && (
              <button onClick={clearFilters} className="text-[11px] hover:opacity-70"
                style={{ color: C.teal }}>مسح البحث</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

const TABS = ["ملخص", "خزنة المكتب", "خزنة الدلفري", "خزنة الموتسكلات", "خزنة العهدة"] as const;
type Tab = (typeof TABS)[number];

export default function AdminAccountsPage() {
  const [tab,          setTab]          = useState<Tab>("ملخص");
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const [officeBalance,     setOfficeBalance]     = useState(0);
  const [custodyBalance,    setCustodyBalance]    = useState(0);
  const [custodyTxs,        setCustodyTxs]        = useState<CustodyTx[]>([]);
  const [activeCustody,     setActiveCustody]     = useState<CustodyRecord[]>([]);
  const [driverWallets,     setDriverWallets]     = useState<DriverWallet[]>([]);
  const [motoWallets,       setMotoWallets]       = useState<MotoWallet[]>([]);
  const [deliveryTxs,    setDeliveryTxs]    = useState<Transaction[]>([]);
  const [motoTxs,        setMotoTxs]        = useState<Transaction[]>([]);
  const [mainWalletTxs,  setMainWalletTxs]  = useState<Transaction[]>([]);
  const [showDeposit,    setShowDeposit]    = useState(false);
  const [showWithdraw,   setShowWithdraw]   = useState(false);

  const [settlementRequests, setSettlementRequests] = useState<SettlementRequest[]>([]);
  const [settleTarget,  setSettleTarget]  = useState<SettlementRequest | null>(null);
  const [settlingId,    setSettlingId]    = useState<number | null>(null);

  const [closeRequests,      setCloseRequests]      = useState<CloseRequest[]>([]);
  const [closeProcessingIds, setCloseProcessingIds] = useState<Set<number>>(new Set());
  const [approveCloseGuard,  setApproveCloseGuard]  = useState(false);

  const [manageTarget,  setManageTarget]  = useState<{ type: "driver" | "moto"; id: number; name: string } | null>(null);
  const [manageMode,    setManageMode]    = useState<"driver-pay" | "driver-custody" | "driver-add" | "moto-pay" | "moto-add" | null>(null);
  const [motoPoolBalance,     setMotoPoolBalance]     = useState(0);
  const [deliveryPoolBalance, setDeliveryPoolBalance] = useState(0);
  const [deliveryCommission,  setDeliveryCommission]  = useState(0);
  const [motoCommission,      setMotoCommission]      = useState(0);
  const [showTransfer,  setShowTransfer]  = useState(false);
  const [transferKey,   setTransferKey]   = useState(0);

  /* ── Derived balances ── */
  const deliveryBalance = useMemo(
    () => driverWallets.reduce((s, d) => s + d.balance, 0), [driverWallets]);
  const motoBalance = useMemo(
    () => motoWallets.reduce((s, m) => s + m.balance, 0), [motoWallets]);

  /* ── Merged + sorted transaction log ── */
  const allTransactions = useMemo(() =>
    [...deliveryTxs, ...motoTxs, ...mainWalletTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ), [deliveryTxs, motoTxs, mainWalletTxs]);

  /* ── Load all data in parallel ── */
  const loadData = useCallback(async () => {
    const [
      { data: walletData },
      { data: driversData },
      { data: motosData },
      { data: deliveryTxData },
      { data: motoTxData },
      { data: closeData },
      { data: custodyWalletData },
      { data: custodyRecordsData },
      { data: deliveryAllTxData },
      { data: motoAllTxData },
    ] = await Promise.all([
      supabase
        .from("main_wallet")
        .select("id, type, amount, reason, created_at, balance")
        .order("created_at", { ascending: false }),
      fetch("/api/admin/drivers", { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) { console.error("fetchDrivers:", res.statusText); return { data: null }; }
          return { data: await res.json() };
        })
        .catch((err) => {
          console.error("fetchDrivers:", err);
          return { data: null };
        }),
      supabase
        .from("motorcycles")
        .select("id, name, plate, wallet_balance")
        .eq("is_active", true),
      supabase
        .from("delivery_accounts")
        .select("id, delivery_id, type, amount, reason, from_wallet, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("motorcycle_accounts")
        .select("id, motorcycle_id, type, amount, reason, created_at, motorcycles(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("advance_requests")
        .select("id, delivery_id, delivery_shift_id, amount, created_at")
        .eq("status", "pending_close")
        .order("created_at", { ascending: false }),
      supabase
        .from("custody_wallet")
        .select("id, type, amount, reason, created_at, balance")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("custody_records")
        .select("id, delivery_id, amount, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_accounts")
        .select("type, amount")
        .in("type", ["تحويل", "إضافة", "صرف", "commission"]),
      supabase
        .from("motorcycle_accounts")
        .select("type, amount")
        .in("type", ["تحويل", "إضافة", "صرف", "commission"]),
    ]);

    if (walletData) {
      const rows = walletData as any[];
      setOfficeBalance(roundEGP(rows[0]?.balance ?? 0));
      setMainWalletTxs(rows.map(mapMainWalletTx));
    }
    if (driversData) {
      setDriverWallets(driversData.map((d: any) => ({
        id:      d.id,
        name:    d.name,
        phone:   d.phone,
        balance: roundEGP(d.wallet_balance),
      })));
      /* Populate driver name map for JOIN-free lookups */
      driverNameMap.clear();
      driversData.forEach((d: any) => driverNameMap.set(d.id, d.name));
    }
    if (motosData) {
      setMotoWallets(motosData.map((m: any) => ({
        id:      m.id,
        name:    m.name,
        plate:   m.plate,
        balance: roundEGP(m.wallet_balance),
      })));
    }
    if (deliveryTxData) setDeliveryTxs((deliveryTxData as any[]).map(mapDeliveryTx));
    if (motoTxData)     setMotoTxs((motoTxData as any[]).map(mapMotoTx));
    setDeliveryPoolBalance(Math.round(
      (deliveryAllTxData as any[] ?? []).reduce((s: number, tx: any) => {
        if (tx.type === "تحويل") return s + tx.amount;
        if (tx.type === "إضافة") return s - tx.amount;
        return s;
      }, 0)
    ));
    setDeliveryCommission(Math.round(
      (deliveryAllTxData as any[] ?? []).reduce((s: number, tx: any) => {
        if (tx.type === "commission") return s + tx.amount;
        if (tx.type === "إضافة")     return s + tx.amount;
        if (tx.type === "صرف")       return s - tx.amount;
        return s;
      }, 0)
    ));
    setMotoPoolBalance(Math.round(
      (motoAllTxData as any[] ?? []).reduce((s: number, tx: any) => {
        if (tx.type === "تحويل") return s + tx.amount;
        if (tx.type === "إضافة") return s - tx.amount;
        return s;
      }, 0)
    ));
    setMotoCommission(Math.round(
      (motoAllTxData as any[] ?? []).reduce((s: number, tx: any) => {
        if (tx.type === "commission") return s + tx.amount;
        if (tx.type === "إضافة")     return s + tx.amount;
        if (tx.type === "صرف")       return s - tx.amount;
        return s;
      }, 0)
    ));
    if (closeData && (closeData as any[]).length > 0) {
      const enriched = await Promise.all(
        (closeData as any[]).map(async (r) => {
          const [{ data: custodyData }, { data: ordersData }] = await Promise.all([
            supabase
              .from("custody_records")
              .select("amount")
              .eq("delivery_id", r.delivery_id)
              .eq("status", "active"),
            supabase
              .from("orders")
              .select("delivery_fee")
              .eq("delivery_id", r.delivery_id)
              .eq("status", "delivered")
              .eq("settled", false),
          ]);
          const totalCustody      = roundEGP((custodyData ?? []).reduce((s: number, c: any) => s + (c.amount ?? 0), 0));
          const totalDeliveryFees = roundEGP((ordersData ?? []).reduce((s: number, o: any) => s + (o.delivery_fee ?? 0), 0));
          return {
            id:                r.id,
            deliveryId:        r.delivery_id,
            deliveryShiftId:   r.delivery_shift_id,
            driverName:        driverNameMap.get(r.delivery_id) ?? "—",
            amount:            r.amount,
            totalAdvance:      totalCustody,
            totalDeliveryFees,
            createdAt:         r.created_at,
          };
        })
      );
      setCloseRequests(enriched);
    } else {
      setCloseRequests([]);
    }

    if (custodyWalletData && (custodyWalletData as any[]).length > 0) {
      const cwRows = custodyWalletData as any[];
      setCustodyBalance(roundEGP(cwRows[0]?.balance ?? 0));
      setCustodyTxs(cwRows.map((r: any) => ({
        id:        r.id,
        type:      r.type,
        amount:    roundEGP(r.amount ?? 0),
        reason:    r.reason ?? null,
        createdAt: r.created_at,
        balance:   roundEGP(r.balance ?? 0),
      })));
    } else {
      setCustodyBalance(0);
      setCustodyTxs([]);
    }
    if (custodyRecordsData) {
      const records: CustodyRecord[] = (custodyRecordsData as any[]).map((r) => ({
        id:         r.id,
        deliveryId: r.delivery_id,
        driverName: driverNameMap.get(r.delivery_id) ?? "—",
        amount:     roundEGP(r.amount ?? 0),
        status:     r.status,
        createdAt:  r.created_at,
      }));
      setActiveCustody(records.filter((r) => r.status === "active"));
    }

    setSettlementRequests([]);
  }, []);

  useAutoRefresh(loadData);

  /* ── Initial load + realtime subscriptions ── */
  useEffect(() => {
    loadData().finally(() => setLoading(false));

    /* ── delivery_accounts: INSERT → حدّث سجل العمليات ── */
    const deliveryChannel = supabase
      .channel("admin-delivery-accounts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_accounts" },
        async (payload) => {
          try {
            const { data } = await supabase
              .from("delivery_accounts")
              .select("id, delivery_id, type, amount, reason, from_wallet, created_at")
              .eq("id", (payload.new as any).id)
              .single();
            if (!data) return;
            setDeliveryTxs((prev) => [mapDeliveryTx(data), ...prev]);
          } catch (err) {
            console.error("Realtime delivery_accounts INSERT error:", err);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error on delivery_accounts");
        }
      });

    return () => {
      supabase.removeChannel(deliveryChannel);
    };
  }, [loadData]);

  /* ── Open action modals ── */
  function closeManage() { setManageTarget(null); setManageMode(null); }
  function openDriverPay(id: number) {
    const d = driverWallets.find((x) => x.id === id);
    if (d) { setManageTarget({ type: "driver", id, name: d.name }); setManageMode("driver-pay"); }
  }
  function openDriverCustody(id: number) {
    const d = driverWallets.find((x) => x.id === id);
    if (d) { setManageTarget({ type: "driver", id, name: d.name }); setManageMode("driver-custody"); }
  }
  function openDriverAdd(id: number) {
    const d = driverWallets.find((x) => x.id === id);
    if (d) { setManageTarget({ type: "driver", id, name: d.name }); setManageMode("driver-add"); }
  }
  function openMotoPay(id: number) {
    const m = motoWallets.find((x) => x.id === id);
    if (m) { setManageTarget({ type: "moto", id, name: m.name }); setManageMode("moto-pay"); }
  }
  function openMotoAdd(id: number) {
    const m = motoWallets.find((x) => x.id === id);
    if (m) { setManageTarget({ type: "moto", id, name: m.name }); setManageMode("moto-add"); }
  }

  /* ── Handle إيداع في خزنة المكتب ── */
  async function handleDeposit(amount: number, note: string) {
    setSubmitting(true);
    try {
      const { data: lastRow } = await supabase
        .from("main_wallet").select("balance")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const lastBal = roundEGP((lastRow as any)?.balance ?? 0);
      await supabase.from("main_wallet").insert({
        type:    "إيداع",
        amount:  roundEGP(amount),
        reason:  note,
        balance: roundEGP(lastBal + amount),
      });
      await loadData();
    } finally {
      setSubmitting(false);
      setShowDeposit(false);
    }
  }

  /* ── Handle سحب من خزنة المكتب ── */
  async function handleWithdraw(amount: number, note: string) {
    setSubmitting(true);
    try {
      const { data: lastRow } = await supabase
        .from("main_wallet").select("balance")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const lastBal = roundEGP((lastRow as any)?.balance ?? 0);
      await supabase.from("main_wallet").insert({
        type:    "صرف",
        amount:  roundEGP(amount),
        reason:  note || "سحب رصيد",
        balance: roundEGP(lastBal - amount),
      });
      await loadData();
    } finally {
      setSubmitting(false);
      setShowWithdraw(false);
    }
  }

  function getManageBalance(): number {
    if (!manageTarget) return 0;
    if (manageTarget.type === "driver")
      return driverWallets.find((d) => d.id === manageTarget.id)?.balance ?? 0;
    return motoWallets.find((m) => m.id === manageTarget.id)?.balance ?? 0;
  }

  /* ── Handle صرف / تحصيل ── */
  async function handleManage(
    op:     "صرف" | "تحصيل",
    wallet: WalletCat,
    amount: number,
    note:   string,
  ) {
    if (!manageTarget) return;
    setSubmitting(true);
    try {
      const roundedAmount  = roundEGP(amount);
      const currentBalance = getManageBalance();

      if (wallet === "custody" && manageTarget.type === "driver") {
        const { data: lastCustody } = await supabase
          .from("custody_wallet").select("balance")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastCustodyBal = roundEGP((lastCustody as any)?.balance ?? 0);
        await supabase.from("custody_wallet").insert({
          type:        "صرف",
          amount:      roundedAmount,
          reason:      `عهدة لـ ${manageTarget.name}`,
          delivery_id: manageTarget.id,
          balance:     roundEGP(lastCustodyBal - roundedAmount),
        });
        await supabase.from("custody_records").insert({
          delivery_id: manageTarget.id,
          amount:      roundedAmount,
          status:      "active",
        });
      } else {
        const personDelta = op === "صرف" ? -roundedAmount : +roundedAmount;

        if (manageTarget.type === "driver") {
          const { data: lastDel } = await supabase
            .from("delivery_accounts").select("balance")
            .eq("delivery_id", manageTarget.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const lastDelBal = roundEGP((lastDel as any)?.balance ?? 0);
          await supabase.from("delivery_accounts").insert({
            delivery_id: manageTarget.id,
            type:        op === "تحصيل" ? "إضافة" : op,
            amount:      roundedAmount,
            reason:      [note, manageTarget.name, "من خزنة الدلفري"].filter(Boolean).join(" — "),
            from_wallet: wallet,
            balance:     roundEGP(lastDelBal + personDelta),
            ...(op === "صرف" && { settled: false }),
          });
          await fetch(`/api/admin/drivers/${manageTarget.id}/wallet`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operation: "increment",
              amount: personDelta,
            }),
          });
        } else {
          const { data: lastMoto } = await supabase
            .from("motorcycle_accounts").select("balance")
            .eq("motorcycle_id", manageTarget.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const lastMotoBal = roundEGP((lastMoto as any)?.balance ?? 0);
          await supabase.from("motorcycle_accounts").insert({
            motorcycle_id: manageTarget.id,
            type:          op === "تحصيل" ? "إضافة" : op,
            amount:        roundedAmount,
            reason:        [note, manageTarget.name, "من خزنة الموتسكلات"].filter(Boolean).join(" — "),
            balance:       roundEGP(lastMotoBal + personDelta),
          });
          await supabase
            .from("motorcycles")
            .update({ wallet_balance: roundEGP(currentBalance + personDelta) })
            .eq("id", manageTarget.id);
        }

        if (wallet === "office") {
          const { data: lastMain } = await supabase
            .from("main_wallet").select("balance")
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const lastMainBal = roundEGP((lastMain as any)?.balance ?? 0);
          const reason = op === "صرف"
            ? `صرف لـ ${manageTarget.name}${note ? ` — ${note}` : ""}`
            : `تحصيل من ${manageTarget.name}${note ? ` — ${note}` : ""}`;
          await supabase.from("main_wallet").insert({
            type:    op,
            amount:  roundedAmount,
            reason,
            balance: roundEGP(op === "صرف" ? lastMainBal - roundedAmount : lastMainBal + roundedAmount),
          });
        }
      }

      await loadData();
    } finally {
      setSubmitting(false);
      setManageTarget(null);
    }
  }

  /* ── Handle تحويل بين الخزن ── */
  async function handleTransfer(
    from:   WalletCat,
    to:     WalletCat,
    amount: number,
    note:   string,
  ) {
    setSubmitting(true);
    try {
      const roundedAmount = roundEGP(amount);

      if (from === "custody" || to === "custody") {
        /* office ↔ custody */
        const [{ data: lastMain }, { data: lastCustody }] = await Promise.all([
          supabase.from("main_wallet").select("balance")
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("custody_wallet").select("balance")
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        const lastMainBal    = roundEGP((lastMain as any)?.balance ?? 0);
        const lastCustodyBal = roundEGP((lastCustody as any)?.balance ?? 0);
        const newMainBal     = roundEGP(from === "office" ? lastMainBal - roundedAmount : lastMainBal + roundedAmount);
        const newCustodyBal  = roundEGP(from === "custody" ? lastCustodyBal - roundedAmount : lastCustodyBal + roundedAmount);
        await supabase.from("main_wallet").insert({
          type:    "تحويل",
          amount:  roundedAmount,
          reason:  note || (from === "office" ? "تحويل إلى خزنة العهدة" : "تحويل من خزنة العهدة"),
          balance: newMainBal,
        });
        if (to === "custody") {
          const { data: lastCustody } = await supabase
            .from("custody_wallet")
            .select("balance")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          const lastCustodyBalance = lastCustody?.balance ?? 0;
          const { error: custodyError } = await supabase
            .from("custody_wallet")
            .insert({
              type:    "إيداع",
              amount:  roundedAmount,
              reason:  note || "تحويل من خزنة المكتب",
              balance: Math.round(lastCustodyBalance + roundedAmount),
            });
          if (custodyError) {
            console.error("custody insert error:", custodyError);
          }
        } else {
          await supabase.from("custody_wallet").insert({
            type:    "تحويل",
            amount:  roundedAmount,
            reason:  note || "تحويل إلى خزنة المكتب",
            balance: newCustodyBal,
          });
        }
      } else {
        if (from === "office" || to === "office") {
          const { data: lastMain } = await supabase
            .from("main_wallet").select("balance")
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const lastMainBal = roundEGP((lastMain as any)?.balance ?? 0);
          await supabase.from("main_wallet").insert({
            type:    "تحويل",
            amount:  roundedAmount,
            reason:  note || null,
            balance: roundEGP(from === "office" ? lastMainBal - roundedAmount : lastMainBal + roundedAmount),
          });
        }

        if (from === "delivery" || to === "delivery") {
          const { data: lastDelivery } = await supabase
            .from("delivery_accounts")
            .select("balance")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const lastDeliveryBalance = Math.round((lastDelivery as any)?.balance ?? 0);
          await supabase.from("delivery_accounts").insert({
            type:        "تحويل",
            amount:      roundedAmount,
            reason:      note || null,
            from_wallet: from,
            delivery_id: null,
            balance:     Math.round(lastDeliveryBalance + roundedAmount),
          });
        } else {
          const { data: lastMoto } = await supabase
            .from("motorcycle_accounts")
            .select("balance")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const lastMotoBalance = Math.round((lastMoto as any)?.balance ?? 0);
          await supabase.from("motorcycle_accounts").insert({
            type:          "تحويل",
            amount:        roundedAmount,
            reason:        note || null,
            motorcycle_id: null,
            balance:       Math.round(lastMotoBalance + roundedAmount),
          });
        }
      }

      await loadData();
    } finally {
      setSubmitting(false);
      setShowTransfer(false);
    }
  }

  /* ── Approve close request ── */
  async function handleApproveClose(req: CloseRequest) {
    if (approveCloseGuard) return;
    setApproveCloseGuard(true);
    setCloseProcessingIds((p) => new Set(p).add(req.id));
    try {
      // جيب البيانات اللازمة كلها
      const [
        { data: orders },
        { data: custodyData },
        { data: settings },
        { data: shiftData },
        { data: lastMainRow },
        { data: lastDelRow },
        { data: lastCustodyRow },
      ] = await Promise.all([
        supabase.from("orders").select("delivery_fee")
          .eq("delivery_id", req.deliveryId).eq("status", "delivered").eq("settled", false),
        supabase.from("custody_records").select("amount")
          .eq("delivery_id", req.deliveryId).eq("status", "active"),
        supabase.from("settings").select("driver_percentage, moto_percentage, office_percentage").single(),
        supabase.from("delivery_shifts").select("motorcycle_id")
          .eq("id", req.deliveryShiftId).maybeSingle(),
        supabase.from("main_wallet").select("balance")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("delivery_accounts").select("balance")
          .eq("delivery_id", req.deliveryId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("custody_wallet").select("balance")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (!settings) throw new Error("settings not found");

      const motorcycleId      = (shiftData as any)?.motorcycle_id ?? null;
      const totalDeliveryFees = roundEGP((orders ?? []).reduce((s: number, o: any) => s + (o.delivery_fee ?? 0), 0));
      const totalCustody      = roundEGP((custodyData ?? []).reduce((s: number, c: any) => s + (c.amount ?? 0), 0));
      const driverShare       = roundEGP(totalDeliveryFees * ((settings as any).driver_percentage / 100));
      const motoShare         = roundEGP(totalDeliveryFees * ((settings as any).moto_percentage / 100));
      const officeShare       = roundEGP(totalDeliveryFees * ((settings as any).office_percentage / 100));
      const lastMainBal       = roundEGP((lastMainRow as any)?.balance ?? 0);
      const lastDelBal        = roundEGP((lastDelRow as any)?.balance ?? 0);
      const lastCustodyBal    = roundEGP((lastCustodyRow as any)?.balance ?? 0);

      // Step 1: INSERT delivery_accounts — حصة السائق
      await supabase.from("delivery_accounts").insert({
        delivery_id: req.deliveryId,
        type:        "commission",
        amount:      driverShare,
        reason:      `حصة من رسوم التوصيل — ${req.driverName}`,
        from_wallet: "office",
        balance:     roundEGP(lastDelBal + driverShare),
      });

      // Step 2: UPDATE delivery_staff wallet_balance += driverShare
      await fetch(`/api/admin/drivers/${req.deliveryId}/wallet`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "increment",
          amount: driverShare,
        }),
      });

      // Step 3: إذا فيه موتسكل — INSERT motorcycle_accounts + UPDATE motorcycles
      if (motorcycleId) {
        const { data: lastMotoRow } = await supabase
          .from("motorcycle_accounts").select("balance")
          .eq("motorcycle_id", motorcycleId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastMotoBal = roundEGP((lastMotoRow as any)?.balance ?? 0);
        await supabase.from("motorcycle_accounts").insert({
          motorcycle_id: motorcycleId,
          type:          "commission",
          amount:        motoShare,
          reason:        `حصة موتسكل — ${req.driverName}`,
          balance:       roundEGP(lastMotoBal + motoShare),
        });
        const { data: motoRow } = await supabase
          .from("motorcycles").select("wallet_balance").eq("id", motorcycleId).single();
        await supabase
          .from("motorcycles")
          .update({ wallet_balance: roundEGP(((motoRow as any)?.wallet_balance ?? 0) + motoShare) })
          .eq("id", motorcycleId);
      }

      // Step 4: INSERT main_wallet — حصة المكتب من رسوم التوصيل
      await supabase.from("main_wallet").insert({
        type:    "commission",
        amount:  officeShare,
        reason:  `حصة المكتب — ${req.driverName}`,
        balance: roundEGP(lastMainBal + officeShare),
      });

      // Step 6: INSERT custody_wallet — استرداد العهدة
      if (totalCustody > 0) {
        await supabase.from("custody_wallet").insert({
          type:    "تحصيل",
          amount:  totalCustody,
          reason:  `استرداد عهدة — ${req.driverName}`,
          balance: roundEGP(lastCustodyBal + totalCustody),
        });
      }

      // Step 7: علّم custody_records بـ returned
      await supabase.from("custody_records")
        .update({ status: "returned" })
        .eq("delivery_id", req.deliveryId).eq("status", "active");

      // Step 8: علّم الأوردرات بـ settled
      await supabase.from("orders")
        .update({ settled: true })
        .eq("delivery_id", req.deliveryId).eq("status", "delivered").eq("settled", false);

      // Step 9: أغلق طلبات السلفة المعلقة وطلب التقفيل
      await supabase.from("advance_requests")
        .update({ status: "approved" })
        .eq("delivery_shift_id", req.deliveryShiftId).eq("status", "pending");
      await supabase.from("advance_requests")
        .update({ status: "approved" }).eq("id", req.id);

      // Step 10: أغلق الوردية
      await supabase.from("delivery_shifts")
        .update({ is_active: false })
        .eq("delivery_id", req.deliveryId).eq("is_active", true);

      await loadData();
    } catch (err) {
      console.error("خطأ في معالجة طلب التقفيل", err);
    } finally {
      setApproveCloseGuard(false);
      setCloseProcessingIds((p) => { const s = new Set(p); s.delete(req.id); return s; });
    }
  }

  /* ── Reject close request ── */
  async function handleRejectClose(id: number) {
    setCloseProcessingIds((p) => new Set(p).add(id));
    try {
      await supabase
        .from("advance_requests")
        .update({ status: "rejected" })
        .eq("id", id);
      await loadData();
    } finally {
      setCloseProcessingIds((p) => { const s = new Set(p); s.delete(id); return s; });
    }
  }

  /* ── Process shift settlement ── */
  async function handleSettlement(advanceReturn: number, motoId: number | null) {
    if (!settleTarget) return;
    setSettlingId(settleTarget.id);
    setSubmitting(true);
    try {
      const total     = settleTarget.cashTotal + settleTarget.vodafoneTotal;
      const remaining = total - advanceReturn;
      const share     = remaining > 0 ? roundEGP(remaining / 3) : 0;

      /* 1. INSERT delivery_accounts — رد السلفة */
      if (advanceReturn > 0) {
        const { data: lastDelRow } = await supabase
          .from("delivery_accounts").select("balance")
          .eq("delivery_id", settleTarget.deliveryId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastDelBal = roundEGP((lastDelRow as any)?.balance ?? 0);
        await supabase.from("delivery_accounts").insert({
          delivery_id: settleTarget.deliveryId,
          type:        "تحصيل",
          amount:      advanceReturn,
          reason:      `رد سلفة — ${settleTarget.driverName}`,
          from_wallet: "office",
          balance:     roundEGP(lastDelBal - advanceReturn),
        });
      }

      /* 2. UPDATE driver wallet += share */
      await fetch(`/api/admin/drivers/${settleTarget.deliveryId}/wallet`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "increment",
          amount: share,
        }),
      });

      /* 3. UPDATE motorcycle wallet += share */
      if (motoId) {
        const { data: moto } = await supabase
          .from("motorcycles").select("wallet_balance").eq("id", motoId).single();
        if (moto) {
          await supabase
            .from("motorcycles")
            .update({ wallet_balance: roundEGP(((moto as any).wallet_balance ?? 0) + share) })
            .eq("id", motoId);
        }
      }

      /* 4. INSERT main_wallet — حصة المكتب */
      const officeGain = advanceReturn + share;
      if (officeGain > 0) {
        const { data: lastMain } = await supabase
          .from("main_wallet").select("balance")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastMainBal = roundEGP((lastMain as any)?.balance ?? 0);
        await supabase.from("main_wallet").insert({
          type:    "تحصيل",
          amount:  officeGain,
          reason:  `تصفية وردية — ${settleTarget.driverName}`,
          balance: roundEGP(lastMainBal + officeGain),
        });
      }

      await loadData();
      setSettleTarget(null);
    } finally {
      setSettlingId(null);
      setSubmitting(false);
    }
  }

  /* ── DEV ONLY: Clear all data ── */
  async function handleClearAll() {
    if (!confirm("هتمسح كل السجلات والأرصدة، متأكد؟")) return;
    await supabase.from("main_wallet").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("delivery_accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("motorcycle_accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custody_wallet").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custody_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("advance_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await fetch("/api/admin/dev/reset-wallets", { method: "POST", credentials: "include" });
    await supabase.from("motorcycles").update({ wallet_balance: 0 }).gt("wallet_balance", 0);
    await supabase.from("orders").update({
      settled: false,
      cash_amount: 0,
      vodafone_amount: 0,
      restaurant_paid: null,
      restaurant_debt: 0,
    }).gte("id", 0);
    window.location.reload();
  }

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{
              borderColor: `${C.teal}33`,
              borderTopColor: C.teal,
            }} />
          <p className="text-sm font-semibold" style={{ color: C.muted }}>جارٍ تحميل الحسابات...</p>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <>
      <div className="flex flex-col gap-5" dir="rtl">

        {/* Tabs row + global transfer button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl overflow-x-auto flex-shrink-0"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5"
                style={{
                  background: tab === t ? C.teal : "transparent",
                  color:      tab === t ? "#fff" : C.muted,
                }}>
                {t}
                {t === "ملخص" && closeRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                    style={{ background: C.orange, color: "#fff" }}>
                    {closeRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setTransferKey((k) => k + 1); setShowTransfer(true); }}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 disabled:opacity-60 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}>
            <span>⇄</span>
            <span className="hidden sm:inline">تحويل بين الخزن</span>
          </button>
        </div>

        {tab === "ملخص" && (
          <SummaryTab
            closeRequests={closeRequests}
            settlementRequests={settlementRequests}
            onApproveClose={handleApproveClose}
            onRejectClose={handleRejectClose}
            onSettle={(req) => setSettleTarget(req)}
            closeProcessingIds={closeProcessingIds}
            settlingId={settlingId}
          />
        )}

        {tab === "خزنة المكتب" && (
          <OfficeWalletTab
            balance={officeBalance}
            transactions={mainWalletTxs}
            onDeposit={() => setShowDeposit(true)}
            onWithdraw={() => setShowWithdraw(true)}
          />
        )}

        {tab === "خزنة الدلفري" && (
          <DeliveryWalletTab
            poolBalance={deliveryPoolBalance}
            totalCommission={deliveryCommission}
            drivers={driverWallets}
            transactions={allTransactions}
            onDriverPay={openDriverPay}
            onDriverCustody={openDriverCustody}
            onDriverAdd={openDriverAdd}
          />
        )}

        {tab === "خزنة الموتسكلات" && (
          <MotoWalletTab
            poolBalance={motoPoolBalance}
            totalCommission={motoCommission}
            motos={motoWallets}
            transactions={allTransactions}
            onMotoPay={openMotoPay}
            onMotoAdd={openMotoAdd}
          />
        )}

        {tab === "خزنة العهدة" && (
          <CustodyWalletTab
            balance={custodyBalance}
            active={activeCustody}
            transactions={custodyTxs}
          />
        )}
      </div>

      {/* Driver pay modal */}
      {manageTarget && manageMode === "driver-pay" && (
        <SimpleActionModal
          title="صرف راتب / مكافأة"
          targetName={manageTarget.name}
          withNote={true}
          accentColor={C.teal}
          confirmLabel="تأكيد الصرف"
          onSubmit={(amount, note) => handleManage("صرف", "delivery", amount, note)}
          onClose={closeManage}
          submitting={submitting}
        />
      )}

      {/* Driver add modal */}
      {manageTarget && manageMode === "driver-add" && (
        <SimpleActionModal
          title="➕ إضافة لرصيد السائق"
          targetName={manageTarget.name}
          withNote={true}
          accentColor={C.green}
          confirmLabel="تأكيد الإضافة"
          onSubmit={(amount, note) => handleManage("تحصيل", "delivery", amount, note)}
          onClose={closeManage}
          submitting={submitting}
        />
      )}

      {/* Driver custody modal */}
      {manageTarget && manageMode === "driver-custody" && (
        <SimpleActionModal
          title="عهدة"
          targetName={manageTarget.name}
          withNote={false}
          accentColor={C.orange}
          confirmLabel="تأكيد العهدة"
          onSubmit={(amount) => handleManage("صرف", "custody", amount, "")}
          onClose={closeManage}
          submitting={submitting}
        />
      )}

      {/* Moto pay modal */}
      {manageTarget && manageMode === "moto-pay" && (
        <SimpleActionModal
          title="صرف"
          targetName={manageTarget.name}
          withNote={true}
          accentColor={C.red}
          confirmLabel="تأكيد الصرف"
          onSubmit={(amount, note) => handleManage("صرف", "moto", amount, note)}
          onClose={closeManage}
          submitting={submitting}
        />
      )}

      {/* Moto add modal */}
      {manageTarget && manageMode === "moto-add" && (
        <SimpleActionModal
          title="إضافة"
          targetName={manageTarget.name}
          withNote={true}
          accentColor={C.green}
          confirmLabel="تأكيد الإضافة"
          onSubmit={(amount, note) => handleManage("تحصيل", "moto", amount, note)}
          onClose={closeManage}
          submitting={submitting}
        />
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <TransferModal
          key={transferKey}
          officeBalance={officeBalance}
          deliveryBalance={deliveryPoolBalance}
          motoBalance={motoPoolBalance}
          custodyBalance={custodyBalance}
          onSubmit={handleTransfer}
          onClose={() => setShowTransfer(false)}
          submitting={submitting}
        />
      )}

      {/* Deposit modal */}
      {showDeposit && (
        <DepositModal
          onSubmit={handleDeposit}
          onClose={() => setShowDeposit(false)}
          submitting={submitting}
        />
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <WithdrawModal
          officeBalance={officeBalance}
          onSubmit={handleWithdraw}
          onClose={() => setShowWithdraw(false)}
          submitting={submitting}
        />
      )}

      {/* Settlement modal */}
      {settleTarget && (
        <SettlementModal
          req={settleTarget}
          motos={motoWallets.map((m) => ({ id: m.id, name: m.name }))}
          onConfirm={handleSettlement}
          onClose={() => setSettleTarget(null)}
          submitting={submitting}
        />
      )}

      {/* DEV ONLY: Clear all data button */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 left-4 z-50" dir="rtl">
          <button
            onClick={handleClearAll}
            className="px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80 transition-opacity"
            style={{ background: C.red, color: "#fff", opacity: 0.85 }}>
            🗑 مسح كل البيانات (اختبار)
          </button>
        </div>
      )}
    </>
  );
}
