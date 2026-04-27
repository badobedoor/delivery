"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
type WalletCat    = "office" | "delivery" | "moto";
type TxType       = "صرف" | "تحصيل" | "تحويل";

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

type AdvanceRequest = {
  id:         number;
  deliveryId: number;
  driverName: string;
  amount:     number;
  note:       string;
  createdAt:  string;   /* ISO 8601 */
};

/* ── Helpers ── */
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
];
const WALLET_LABELS: Record<WalletCat, string> = {
  office:   "خزنة المكتب",
  delivery: "خزنة الدلفري",
  moto:     "خزنة الموتسكلات",
};

const FROM_WALLET_LABEL: Record<string, string> = {
  office:   "خزنة المكتب",
  delivery: "خزنة الدلفري",
  moto:     "خزنة الموتسكلات",
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
    color: C.blue,
    label: (t) => `تحويل ${fmtAmt(t.amount)} من ${t.fromWallet} إلى ${t.toWallet}`,
  },
};

/* ── Row mappers ── */

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
    personName:  (row.delivery_staff as any)?.name,
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
  const [query, setQuery] = useState("");

  const walletLabel = walletKey === "all" ? null : WALLET_LABELS[walletKey];

  const walletFiltered = useMemo(() => {
    if (!walletLabel) return transactions;
    return transactions.filter(
      (t) => t.fromWallet === walletLabel || t.toWallet === walletLabel,
    );
  }, [transactions, walletLabel]);

  const displayed = useMemo(() => {
    if (!query.trim()) return walletFiltered;
    const q = query.trim().toLowerCase();
    return walletFiltered.filter(
      (t) =>
        (t.personName ?? "").toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.type.includes(q) ||
        t.fromWallet.toLowerCase().includes(q) ||
        t.toWallet.toLowerCase().includes(q),
    );
  }, [walletFiltered, query]);

  return (
    <div className="rounded-2xl flex flex-col gap-0 overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>

      <div className="flex flex-col gap-3 px-4 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${C.teal}22`, color: C.teal }}>
            {walletFiltered.length} عملية
          </span>
        </div>

        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs" style={{ color: C.muted }}>
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الشخص أو البيان..."
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          />
          {query && (
            <button onClick={() => setQuery("")}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-xs hover:opacity-70"
              style={{ color: C.muted }}>✕</button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["الكل", "صرف", "تحصيل", "تحويل"] as const).map((f) => {
            const active = f === "الكل" ? query === "" : query === f;
            const col =
              f === "صرف"    ? C.red   :
              f === "تحصيل" ? C.green :
              f === "تحويل" ? C.blue  : C.teal;
            return (
              <button key={f}
                onClick={() => setQuery(f === "الكل" ? "" : f)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: active ? col : `${col}18`,
                  color:      active ? "#fff" : col,
                  border:     `1px solid ${active ? col : `${col}33`}`,
                }}>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <span style={{ fontSize: 36 }}>📭</span>
            <p className="text-sm font-semibold" style={{ color: C.muted }}>
              {query ? "لا توجد نتائج للبحث" : "لا يوجد عمليات حتى الآن"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {displayed.map((t, i) => {
              const meta   = TX_META[t.type];
              const isLast = i === displayed.length - 1;
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
                    <p className="text-base font-black" style={{ color: meta.color }}>
                      {fmtAmt(t.amount)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${meta.color}22`, color: meta.color }}>
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
        <div className="px-4 py-2.5 border-t text-xs flex items-center justify-between"
          style={{ borderColor: C.border, color: C.muted }}>
          <span>
            {query
              ? `${displayed.length} نتيجة من ${walletFiltered.length}`
              : `${walletFiltered.length} عملية مسجلة`}
          </span>
          {query && (
            <button onClick={() => setQuery("")}
              className="text-[11px] hover:opacity-70"
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
   TAB: ملخص — طلبات السلفة
───────────────────────────────────────────── */

function SummaryTab({
  pendingRequests,
  onApprove,
  onReject,
  processingIds,
}: {
  pendingRequests: AdvanceRequest[];
  onApprove: (req: AdvanceRequest) => void;
  onReject:  (id: number) => void;
  processingIds: Set<number>;
}) {
  return (
    <div className="flex flex-col gap-5">

      {pendingRequests.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center gap-3"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 36 }}>✅</span>
          <p className="text-sm font-semibold" style={{ color: C.muted }}>لا توجد طلبات سلفة معلقة</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: C.border }}>
            <h3 className="text-sm font-black" style={{ color: C.text }}>طلبات السلفة المعلقة</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${C.orange}22`, color: C.orange }}>
              {pendingRequests.length} طلب
            </span>
          </div>

          <div className="flex flex-col">
            {pendingRequests.map((req, i) => {
              const processing = processingIds.has(req.id);
              const isLast     = i === pendingRequests.length - 1;
              return (
                <div key={req.id}
                  className="flex items-start gap-4 px-4 py-3.5"
                  style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                    style={{ background: `${C.orange}20` }}>💸</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: C.text }}>{req.driverName}</p>
                    <p className="text-sm font-black mt-0.5" style={{ color: C.orange }}>
                      {fmtAmt(req.amount)}
                    </p>
                    {req.note && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{req.note}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: `${C.muted}99` }}>
                      {fmtDateAr(req.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => onApprove(req)}
                      disabled={processing}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
                      style={{ background: `${C.green}22`, color: C.green }}>
                      {processing ? "..." : "موافقة"}
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL A — إدارة (صرف / تحصيل)
───────────────────────────────────────────── */

function ManageModal({ target, officeBalance, deliveryBalance, motoBalance, onSubmit, onClose, submitting }: {
  target: { type: "driver" | "moto"; id: number; name: string; balance: number };
  officeBalance:   number;
  deliveryBalance: number;
  motoBalance:     number;
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
                { v: "صرف",    label: "صرف (دفع)",      col: C.teal   },
                { v: "تحصيل", label: "تحصيل (استرداد)", col: C.orange },
              ] as const).map(({ v, label, col }) => {
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
                ? `صرف: يزيد رصيد ${target.name} ويخصم من الخزنة المختارة`
                : `تحصيل: يقل رصيد ${target.name} ويخصم من الخزنة المختارة أيضاً`}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>
              من خزنة <span style={{ color: C.red }}>*</span>
            </label>
            <select value={wallet} onChange={(e) => { setWallet(e.target.value as WalletCat); setError(""); }}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={sel}>
              {WALLET_OPTIONS.map((o) => (
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: راتب، مكافأة، خصم غياب، بنزين..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
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
   MODAL B — تحويل بين الخزن
───────────────────────────────────────────── */

function TransferModal({ officeBalance, deliveryBalance, motoBalance, onSubmit, onClose, submitting }: {
  officeBalance:   number;
  deliveryBalance: number;
  motoBalance:     number;
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
    if (from === to)          { setError("لا يمكن التحويل لنفس الخزنة");     return; }
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
   TAB: خزنة المكتب
───────────────────────────────────────────── */

function OfficeWalletTab({ balance, transactions }: {
  balance:      number;
  transactions: Transaction[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة المكتب</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(balance)}</p>
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

function DeliveryWalletTab({ poolBalance, drivers, transactions, onManage }: {
  poolBalance:  number;
  drivers:      DriverWallet[];
  transactions: Transaction[];
  onManage:     (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>خزنة الدلفري</p>
          <p className="text-3xl font-black" style={{ color: C.orange }}>{fmtAmt(poolBalance)}</p>
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
                    <button onClick={() => onManage(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal }}>إدارة</button>
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

function MotoWalletTab({ poolBalance, motos, transactions, onManage }: {
  poolBalance:  number;
  motos:        MotoWallet[];
  transactions: Transaction[];
  onManage:     (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>خزنة الموتوسيكلات</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(poolBalance)}</p>
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
                    <button onClick={() => onManage(m.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ background: `${C.teal}22`, color: C.teal }}>إدارة</button>
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
   Page
───────────────────────────────────────────── */

const TABS = ["ملخص", "خزنة المكتب", "خزنة الدلفري", "خزنة الموتسكلات"] as const;
type Tab = (typeof TABS)[number];

export default function AdminAccountsPage() {
  const [tab,          setTab]          = useState<Tab>("ملخص");
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const [mainWalletId,   setMainWalletId]   = useState<number | null>(null);
  const [officeBalance,  setOfficeBalance]  = useState(0);
  const [driverWallets,  setDriverWallets]  = useState<DriverWallet[]>([]);
  const [motoWallets,    setMotoWallets]    = useState<MotoWallet[]>([]);
  const [deliveryTxs,    setDeliveryTxs]    = useState<Transaction[]>([]);
  const [motoTxs,        setMotoTxs]        = useState<Transaction[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AdvanceRequest[]>([]);

  const [manageTarget,  setManageTarget]  = useState<{ type: "driver" | "moto"; id: number; name: string } | null>(null);
  const [showTransfer,  setShowTransfer]  = useState(false);
  const [transferKey,   setTransferKey]   = useState(0);

  /* ── Derived balances ── */
  const deliveryBalance = useMemo(
    () => driverWallets.reduce((s, d) => s + d.balance, 0), [driverWallets]);
  const motoBalance = useMemo(
    () => motoWallets.reduce((s, m) => s + m.balance, 0), [motoWallets]);

  /* ── Merged + sorted transaction log ── */
  const allTransactions = useMemo(() =>
    [...deliveryTxs, ...motoTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ), [deliveryTxs, motoTxs]);

  /* ── Load all data in parallel ── */
  const loadData = useCallback(async () => {
    const [
      { data: walletData },
      { data: driversData },
      { data: motosData },
      { data: deliveryTxData },
      { data: motoTxData },
      { data: advanceData },
    ] = await Promise.all([
      supabase.from("main_wallet").select("id, balance").single(),
      supabase
        .from("delivery_staff")
        .select("id, name, phone, wallet_balance")
        .eq("is_active", true),
      supabase
        .from("motorcycles")
        .select("id, name, plate, wallet_balance")
        .eq("is_active", true),
      supabase
        .from("delivery_accounts")
        .select("id, delivery_id, type, amount, reason, from_wallet, created_at, delivery_staff(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("motorcycle_accounts")
        .select("id, motorcycle_id, type, amount, reason, created_at, motorcycles(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("advance_requests")
        .select("id, delivery_id, amount, note, created_at, delivery_staff(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (walletData) {
      setMainWalletId(walletData.id);
      setOfficeBalance(walletData.balance);
    }
    if (driversData) {
      setDriverWallets(driversData.map((d: any) => ({
        id:      d.id,
        name:    d.name,
        phone:   d.phone,
        balance: d.wallet_balance,
      })));
    }
    if (motosData) {
      setMotoWallets(motosData.map((m: any) => ({
        id:      m.id,
        name:    m.name,
        plate:   m.plate,
        balance: m.wallet_balance,
      })));
    }
    if (deliveryTxData) setDeliveryTxs((deliveryTxData as any[]).map(mapDeliveryTx));
    if (motoTxData)     setMotoTxs((motoTxData as any[]).map(mapMotoTx));
    if (advanceData) {
      setPendingRequests((advanceData as any[]).map((r) => ({
        id:         r.id,
        deliveryId: r.delivery_id,
        driverName: (r.delivery_staff as any)?.name ?? "—",
        amount:     r.amount,
        note:       r.note ?? "",
        createdAt:  r.created_at,
      })));
    }
  }, []);

  /* ── Initial load + realtime subscriptions ── */
  useEffect(() => {
    loadData().finally(() => setLoading(false));

    const dChan = supabase
      .channel("accts-delivery-tx")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_accounts" },
        () => loadData())
      .subscribe();

    const aChan = supabase
      .channel("accts-advance-req")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "advance_requests" },
        () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(dChan);
      supabase.removeChannel(aChan);
    };
  }, [loadData]);

  /* ── Open manage modal ── */
  function openDriverManage(id: number) {
    const d = driverWallets.find((x) => x.id === id);
    if (d) setManageTarget({ type: "driver", id, name: d.name });
  }
  function openMotoManage(id: number) {
    const m = motoWallets.find((x) => x.id === id);
    if (m) setManageTarget({ type: "moto", id, name: m.name });
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
      const personDelta    = op === "صرف" ? +amount : -amount;
      const currentBalance = getManageBalance();

      if (manageTarget.type === "driver") {
        await supabase.from("delivery_accounts").insert({
          delivery_id: manageTarget.id,
          type:        op,
          amount,
          reason:      note || null,
          from_wallet: wallet,
        });
        await supabase
          .from("delivery_staff")
          .update({ wallet_balance: currentBalance + personDelta })
          .eq("id", manageTarget.id);
      } else {
        await supabase.from("motorcycle_accounts").insert({
          motorcycle_id: manageTarget.id,
          type:          op,
          amount,
          reason:        note || null,
        });
        await supabase
          .from("motorcycles")
          .update({ wallet_balance: currentBalance + personDelta })
          .eq("id", manageTarget.id);
      }

      if (wallet === "office" && mainWalletId !== null) {
        await supabase
          .from("main_wallet")
          .update({ balance: officeBalance - amount })
          .eq("id", mainWalletId);
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
    if (!mainWalletId) return;
    setSubmitting(true);
    try {
      /* Update main_wallet when office is either source or destination */
      if (from === "office" || to === "office") {
        const newBalance = from === "office"
          ? officeBalance - amount
          : officeBalance + amount;
        await supabase
          .from("main_wallet")
          .update({ balance: newBalance })
          .eq("id", mainWalletId);
      }

      /* Log into the appropriate account table */
      if (from === "delivery" || to === "delivery") {
        await supabase.from("delivery_accounts").insert({
          type:        "تحويل",
          amount,
          reason:      note || null,
          from_wallet: from,
          delivery_id: null,
        });
      } else {
        /* office↔moto or moto↔office */
        await supabase.from("motorcycle_accounts").insert({
          type:          "تحويل",
          amount,
          reason:        note || null,
          motorcycle_id: null,
        });
      }

      await loadData();
    } finally {
      setSubmitting(false);
      setShowTransfer(false);
    }
  }

  /* ── Approve سلفة ── */
  async function handleApprove(req: AdvanceRequest) {
    setProcessingIds((p) => new Set(p).add(req.id));
    try {
      const driver         = driverWallets.find((d) => d.id === req.deliveryId);
      const currentBalance = driver?.balance ?? 0;

      await supabase.from("delivery_accounts").insert({
        delivery_id: req.deliveryId,
        type:        "صرف",
        amount:      req.amount,
        reason:      "سلفة",
        from_wallet: "office",
      });
      await supabase
        .from("delivery_staff")
        .update({ wallet_balance: currentBalance + req.amount })
        .eq("id", req.deliveryId);
      if (mainWalletId !== null) {
        await supabase
          .from("main_wallet")
          .update({ balance: officeBalance - req.amount })
          .eq("id", mainWalletId);
      }
      await supabase
        .from("advance_requests")
        .update({ status: "approved" })
        .eq("id", req.id);

      await loadData();
    } finally {
      setProcessingIds((p) => { const s = new Set(p); s.delete(req.id); return s; });
    }
  }

  /* ── Reject سلفة ── */
  async function handleReject(id: number) {
    setProcessingIds((p) => new Set(p).add(id));
    try {
      await supabase
        .from("advance_requests")
        .update({ status: "rejected" })
        .eq("id", id);
      await loadData();
    } finally {
      setProcessingIds((p) => { const s = new Set(p); s.delete(id); return s; });
    }
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
                {t === "ملخص" && pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                    style={{ background: C.orange, color: "#fff" }}>
                    {pendingRequests.length}
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
            pendingRequests={pendingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            processingIds={processingIds}
          />
        )}

        {tab === "خزنة المكتب" && (
          <OfficeWalletTab
            balance={officeBalance}
            transactions={allTransactions}
          />
        )}

        {tab === "خزنة الدلفري" && (
          <DeliveryWalletTab
            poolBalance={deliveryBalance}
            drivers={driverWallets}
            transactions={allTransactions}
            onManage={openDriverManage}
          />
        )}

        {tab === "خزنة الموتسكلات" && (
          <MotoWalletTab
            poolBalance={motoBalance}
            motos={motoWallets}
            transactions={allTransactions}
            onManage={openMotoManage}
          />
        )}
      </div>

      {/* Manage modal */}
      {manageTarget && (
        <ManageModal
          target={{ ...manageTarget, balance: getManageBalance() }}
          officeBalance={officeBalance}
          deliveryBalance={deliveryBalance}
          motoBalance={motoBalance}
          onSubmit={handleManage}
          onClose={() => setManageTarget(null)}
          submitting={submitting}
        />
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <TransferModal
          key={transferKey}
          officeBalance={officeBalance}
          deliveryBalance={deliveryBalance}
          motoBalance={motoBalance}
          onSubmit={handleTransfer}
          onClose={() => setShowTransfer(false)}
          submitting={submitting}
        />
      )}
    </>
  );
}
