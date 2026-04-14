"use client";

import { useState, useMemo } from "react";

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
  id:          number;
  createdAt:   string;   /* formatted Arabic date + time */
  type:        TxType;
  personName?: string;   /* driver / moto name; omitted for transfers */
  fromWallet:  string;   /* wallet label */
  toWallet:    string;   /* wallet label or "—" */
  amount:      number;
  description: string;
};

/* ─────────────────────────────────────────────
   Seed data
───────────────────────────────────────────── */

const seedDriverWallets: DriverWallet[] = [
  { id: 1, name: "كريم سعد",   phone: "0100-111-2233", balance: 1200 },
  { id: 2, name: "مصطفى علي",  phone: "0101-222-3344", balance: 850  },
  { id: 3, name: "عمر حسين",   phone: "0102-333-4455", balance: 2300 },
];

const seedMotoWallets: MotoWallet[] = [
  { id: 1, name: "موتوسيكل #1", plate: "أ ب ج 1234",  balance: 500  },
  { id: 2, name: "موتوسيكل #2", plate: "د ه و 5678",  balance: 1200 },
  { id: 3, name: "موتوسيكل #3", plate: "ز ح ط 9012",  balance: 300  },
];

const seedTransactions: Transaction[] = [
  {
    id: 1, createdAt: "١٤ أبريل ٢٠٢٦ — ١٠:٠٠ ص", type: "تحويل",
    fromWallet: "خزنة المكتب", toWallet: "خزنة الدلفري",
    amount: 5000, description: "تمويل رواتب السائقين",
  },
  {
    id: 2, createdAt: "١٣ أبريل ٢٠٢٦ — ٢:٣٠ م", type: "صرف",
    personName: "كريم سعد",
    fromWallet: "خزنة المكتب", toWallet: "—",
    amount: 1200, description: "راتب",
  },
  {
    id: 3, createdAt: "١٣ أبريل ٢٠٢٦ — ٤:١٥ م", type: "تحصيل",
    personName: "موتوسيكل #1",
    fromWallet: "خزنة الموتسكلات", toWallet: "—",
    amount: 200, description: "خصم تأخير",
  },
  {
    id: 4, createdAt: "١٢ أبريل ٢٠٢٦ — ٩:٠٠ ص", type: "تحويل",
    fromWallet: "خزنة المكتب", toWallet: "خزنة الموتسكلات",
    amount: 2000, description: "صيانة وبنزين",
  },
  {
    id: 5, createdAt: "١٢ أبريل ٢٠٢٦ — ١١:٤٥ ص", type: "صرف",
    personName: "مصطفى علي",
    fromWallet: "خزنة الدلفري", toWallet: "—",
    amount: 850, description: "مكافأة أداء",
  },
];

/* ── Helpers ── */
function fmtAmt(n: number) {
  return `${n.toLocaleString("ar-EG")} ج.م`;
}
function nowAr() {
  const d = new Date();
  const date = d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  return `${date} — ${time}`;
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

/* ── Type meta ── */
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

/* ─────────────────────────────────────────────
   COMPONENT: TransactionActivity (reusable)
   walletKey: which wallet to filter for
             ("all" = show everything = office)
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

  /* Filter by wallet */
  const walletFiltered = useMemo(() => {
    if (!walletLabel) return transactions;
    return transactions.filter(
      (t) => t.fromWallet === walletLabel || t.toWallet === walletLabel,
    );
  }, [transactions, walletLabel]);

  /* Filter by search query */
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

      {/* Header + search */}
      <div className="flex flex-col gap-3 px-4 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${C.teal}22`, color: C.teal }}>
            {walletFiltered.length} عملية
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs" style={{ color: C.muted }}>
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الشخص أو البيان..."
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              color: C.text,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-xs hover:opacity-70"
              style={{ color: C.muted }}>✕</button>
          )}
        </div>

        {/* Quick type filters */}
        <div className="flex gap-2 flex-wrap">
          {(["الكل", "صرف", "تحصيل", "تحويل"] as const).map((f) => {
            const active =
              f === "الكل"
                ? query === ""
                : query === f;
            const col =
              f === "صرف" ? C.red :
              f === "تحصيل" ? C.green :
              f === "تحويل" ? C.blue : C.teal;
            return (
              <button
                key={f}
                onClick={() => setQuery(f === "الكل" ? "" : f)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: active ? col : `${col}18`,
                  color: active ? "#fff" : col,
                  border: `1px solid ${active ? col : `${col}33`}`,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
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
              const meta  = TX_META[t.type];
              const isLast = i === displayed.length - 1;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-4 px-4 py-3.5 transition-all"
                  style={{
                    borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                    /* fade-in via CSS animation for newest items */
                    animation: i === 0 ? "txFadeIn 0.35s ease" : undefined,
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 mt-0.5"
                    style={{ background: `${meta.color}20`, color: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  {/* Main content */}
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
                      {/* Wallet badges */}
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
                      {t.createdAt}
                    </p>
                  </div>

                  {/* Amount + type badge */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-base font-black" style={{ color: meta.color }}>
                      {fmtAmt(t.amount)}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      {t.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
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

      {/* Keyframe injection */}
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
   TAB: ملخص
───────────────────────────────────────────── */
function SummaryTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء",  value: "1,284",      color: C.teal   },
          { label: "إجمالي الطلبات", value: "8,740",      color: C.orange },
          { label: "إيرادات الشهر",  value: "94,320 ج.م", color: C.green  },
          { label: "عملاء محظورين",  value: "3",          color: C.red    },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs"             style={{ color: C.muted  }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-4" style={{ color: C.text }}>أكثر العملاء طلباً 🏆</h3>
        <div className="flex flex-col gap-3">
          {[
            { name: "أحمد محمد",  orders: 48, total: "3,840 ج.م" },
            { name: "سارة علي",   orders: 36, total: "2,910 ج.م" },
            { name: "محمود خالد", orders: 31, total: "2,480 ج.م" },
          ].map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: C.teal }}>{i + 1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: `${C.teal}30`, color: C.teal }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: C.text }}>{c.name}</p>
                <p className="text-xs" style={{ color: C.muted }}>{c.orders} طلب</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: C.teal }}>{c.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL A — إدارة (صرف / تحصيل)
───────────────────────────────────────────── */

function ManageModal({ target, officeBalance, deliveryBalance, motoBalance, onSubmit, onClose }: {
  target: { type: "driver" | "moto"; id: number; name: string; balance: number };
  officeBalance: number;
  deliveryBalance: number;
  motoBalance: number;
  onSubmit: (op: "صرف" | "تحصيل", wallet: WalletCat, amount: number, note: string) => void;
  onClose: () => void;
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
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
            style={{ background: opColor, color: "#fff" }}>تأكيد</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL B — تحويل بين الخزن
───────────────────────────────────────────── */

function TransferModal({ officeBalance, deliveryBalance, motoBalance, onSubmit, onClose }: {
  officeBalance: number;
  deliveryBalance: number;
  motoBalance: number;
  onSubmit: (from: WalletCat, to: WalletCat, amount: number, note: string) => void;
  onClose: () => void;
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
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
            style={{ background: C.teal, color: "#fff" }}>تأكيد التحويل</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
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
  balance: number;
  transactions: Transaction[];
}) {
  return (
    <div className="flex flex-col gap-4">

      {/* Balance card */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div>
          <p className="text-xs mb-1" style={{ color: C.muted }}>إجمالي خزنة المكتب</p>
          <p className="text-3xl font-black" style={{ color: C.teal }}>{fmtAmt(balance)}</p>
        </div>
        <span style={{ fontSize: 40 }}>🏦</span>
      </div>

      {/* Activity feed — all transactions */}
      <TransactionActivity walletKey="all" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الدلفري
───────────────────────────────────────────── */

function DeliveryWalletTab({ poolBalance, drivers, transactions, onManage }: {
  poolBalance: number;
  drivers: DriverWallet[];
  transactions: Transaction[];
  onManage: (id: number) => void;
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

      {/* Drivers table */}
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
                  { col: "الرصيد",      hide: "" },
                  { col: "إجراءات",    hide: "" },
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

      {/* Activity feed — delivery only */}
      <TransactionActivity walletKey="delivery" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الموتسكلات
───────────────────────────────────────────── */

function MotoWalletTab({ poolBalance, motos, transactions, onManage }: {
  poolBalance: number;
  motos: MotoWallet[];
  transactions: Transaction[];
  onManage: (id: number) => void;
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

      {/* Motos table */}
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

      {/* Activity feed — moto only */}
      <TransactionActivity walletKey="moto" transactions={transactions} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

const TABS = ["ملخص", "خزنة المكتب", "خزنة الدلفري", "خزنة الموتسكلات"] as const;
type Tab = typeof TABS[number];

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<Tab>("ملخص");

  /* ── Wallet balances ── */
  const [officeBalance,   setOfficeBalance]   = useState(50000);
  const [deliveryBalance, setDeliveryBalance] = useState(5000);
  const [motoBalance,     setMotoBalance]     = useState(2000);

  /* ── Person balances ── */
  const [driverWallets, setDriverWallets] = useState<DriverWallet[]>(seedDriverWallets);
  const [motoWallets,   setMotoWallets]   = useState<MotoWallet[]>(seedMotoWallets);

  /* ── Unified transaction log ── */
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);

  /* ── Manage modal state ── */
  const [manageTarget, setManageTarget] = useState<{
    type: "driver" | "moto"; id: number; name: string;
  } | null>(null);

  /* ── Transfer modal state ── */
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferKey,  setTransferKey]  = useState(0);

  /* ── Wallet adjuster ── */
  function adjWallet(cat: WalletCat, delta: number) {
    if (cat === "office")   setOfficeBalance((b) => b + delta);
    if (cat === "delivery") setDeliveryBalance((b) => b + delta);
    if (cat === "moto")     setMotoBalance((b) => b + delta);
  }

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

  /* ── Handle manage submit ── */
  function handleManage(op: "صرف" | "تحصيل", wallet: WalletCat, amount: number, note: string) {
    if (!manageTarget) return;

    const personDelta = op === "صرف" ? +amount : -amount;
    if (manageTarget.type === "driver") {
      setDriverWallets((p) => p.map((d) =>
        d.id === manageTarget.id ? { ...d, balance: d.balance + personDelta } : d));
    } else {
      setMotoWallets((p) => p.map((m) =>
        m.id === manageTarget.id ? { ...m, balance: m.balance + personDelta } : m));
    }

    adjWallet(wallet, -amount);

    setTransactions((p) => [{
      id:          Date.now(),
      createdAt:   nowAr(),
      type:        op,
      personName:  manageTarget.name,
      fromWallet:  WALLET_LABELS[wallet],
      toWallet:    "—",
      amount,
      description: note,
    }, ...p]);

    setManageTarget(null);
  }

  /* ── Handle transfer submit ── */
  function handleTransfer(from: WalletCat, to: WalletCat, amount: number, note: string) {
    adjWallet(from, -amount);
    adjWallet(to,   +amount);

    setTransactions((p) => [{
      id:          Date.now(),
      createdAt:   nowAr(),
      type:        "تحويل",
      fromWallet:  WALLET_LABELS[from],
      toWallet:    WALLET_LABELS[to],
      amount,
      description: note,
    }, ...p]);

    setShowTransfer(false);
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
                className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                style={{
                  background: tab === t ? C.teal : "transparent",
                  color:      tab === t ? "#fff" : C.muted,
                }}>
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setTransferKey((k) => k + 1); setShowTransfer(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: C.teal, color: "#fff" }}
          >
            <span>⇄</span>
            <span className="hidden sm:inline">تحويل بين الخزن</span>
          </button>
        </div>

        {tab === "ملخص" && <SummaryTab />}

        {tab === "خزنة المكتب" && (
          <OfficeWalletTab
            balance={officeBalance}
            transactions={transactions}
          />
        )}

        {tab === "خزنة الدلفري" && (
          <DeliveryWalletTab
            poolBalance={deliveryBalance}
            drivers={driverWallets}
            transactions={transactions}
            onManage={openDriverManage}
          />
        )}

        {tab === "خزنة الموتسكلات" && (
          <MotoWalletTab
            poolBalance={motoBalance}
            motos={motoWallets}
            transactions={transactions}
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
        />
      )}
    </>
  );
}
