"use client";

import { useState } from "react";

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
};

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type DriverWallet = { id: number; name: string; phone: string; balance: number };
type MotoWallet   = { id: number; name: string; plate: string;  balance: number };
type WalletCat    = "office" | "delivery" | "moto";
type TxType       = "صرف" | "تحصيل" | "تحويل";

type Transaction = {
  id: number;
  date: string;
  type: TxType;
  person: string;      /* driver/moto name, or "—" for transfers */
  fromWallet: string;  /* wallet label */
  toWallet: string;    /* wallet label or "—" */
  amount: number;
  note: string;
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
  { id: 1, date: "١٤ أبريل ٢٠٢٦", type: "تحويل", person: "—",           fromWallet: "خزنة المكتب",      toWallet: "خزنة الدلفري",     amount: 5000, note: "تمويل رواتب السائقين" },
  { id: 2, date: "١٣ أبريل ٢٠٢٦", type: "صرف",   person: "كريم سعد",    fromWallet: "خزنة المكتب",      toWallet: "—",                amount: 1200, note: "راتب"                 },
  { id: 3, date: "١٣ أبريل ٢٠٢٦", type: "تحصيل", person: "موتوسيكل #1", fromWallet: "خزنة الموتسكلات", toWallet: "—",                amount: 200,  note: "خصم تأخير"            },
  { id: 4, date: "١٢ أبريل ٢٠٢٦", type: "تحويل", person: "—",           fromWallet: "خزنة المكتب",      toWallet: "خزنة الموتسكلات",  amount: 2000, note: "صيانة وبنزين"         },
  { id: 5, date: "١٢ أبريل ٢٠٢٦", type: "صرف",   person: "مصطفى علي",   fromWallet: "خزنة الدلفري",     toWallet: "—",                amount: 850,  note: "مكافأة أداء"          },
];

/* ── Helpers ── */
function fmtAmt(n: number) { return `${n.toLocaleString("ar-EG")} ج.م`; }
function today()            { return new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); }

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

/* ─────────────────────────────────────────────
   TAB: ملخص (unchanged)
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
   Affects: person balance + source wallet balance
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

    /* wallet must have enough funds (both ops consume wallet) */
    if (getWalletBalance(wallet) < n) {
      setError(`رصيد غير كافٍ في ${WALLET_LABELS[wallet]}`);
      return;
    }
    /* تحصيل: person balance must cover the deduction */
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

        {/* Header */}
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

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Op type */}
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
            {/* Explanation */}
            <p className="text-[11px] px-1" style={{ color: C.muted }}>
              {op === "صرف"
                ? `صرف: يزيد رصيد ${target.name} ويخصم من الخزنة المختارة`
                : `تحصيل: يقل رصيد ${target.name} ويخصم من الخزنة المختارة أيضاً`}
            </p>
          </div>

          {/* من خزنة */}
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

          {/* Amount */}
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

          {/* Error */}
          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: راتب، مكافأة، خصم غياب، بنزين..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        {/* Footer */}
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
   Subtracts from source, adds to target
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="text-base font-black" style={{ color: C.text }}>⇄ تحويل بين الخزن</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: C.bg, color: C.muted }}>✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">

          {/* From */}
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

          {/* To */}
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

          {/* Amount */}
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

          {/* Error */}
          {error && (
            <p className="text-xs text-center py-1.5 px-3 rounded-lg"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>البيان</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تحويل لصرف رواتب، تمويل بنزين..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        {/* Footer */}
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
   TAB: خزنة المكتب — balance card + full transaction log
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

      {/* Transaction log */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-black" style={{ color: C.text }}>سجل العمليات الكامل</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { col: "التاريخ",   hide: "" },
                  { col: "النوع",     hide: "" },
                  { col: "الشخص",     hide: " hidden sm:table-cell" },
                  { col: "من خزنة",   hide: " hidden sm:table-cell" },
                  { col: "إلى خزنة",  hide: " hidden md:table-cell" },
                  { col: "المبلغ",    hide: "" },
                  { col: "البيان",    hide: " hidden lg:table-cell" },
                ].map(({ col, hide }) => (
                  <th key={col}
                    className={`px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد عمليات بعد
                  </td>
                </tr>
              ) : transactions.map((t, i) => {
                const col = t.type === "صرف" ? C.teal : t.type === "تحصيل" ? C.orange : C.green;
                return (
                  <tr key={t.id}
                    style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>{t.date}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                        style={{ background: `${col}22`, color: col }}>{t.type}</span>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {t.person}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {t.fromWallet}
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {t.toWallet}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>
                      {fmtAmt(t.amount)}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-2.5 text-xs" style={{ color: C.muted }}>
                      {t.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {transactions.length} عملية مسجلة
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الدلفري
───────────────────────────────────────────── */

function DeliveryWalletTab({ poolBalance, drivers, onManage }: {
  poolBalance: number;
  drivers: DriverWallet[];
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB: خزنة الموتسكلات
───────────────────────────────────────────── */

function MotoWalletTab({ poolBalance, motos, onManage }: {
  poolBalance: number;
  motos: MotoWallet[];
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

    /* صرف: person +amount | تحصيل: person -amount */
    const personDelta = op === "صرف" ? +amount : -amount;
    if (manageTarget.type === "driver") {
      setDriverWallets((p) => p.map((d) =>
        d.id === manageTarget.id ? { ...d, balance: d.balance + personDelta } : d));
    } else {
      setMotoWallets((p) => p.map((m) =>
        m.id === manageTarget.id ? { ...m, balance: m.balance + personDelta } : m));
    }

    /* Both صرف and تحصيل consume from the selected wallet */
    adjWallet(wallet, -amount);

    setTransactions((p) => [{
      id: Date.now(), date: today(), type: op,
      person:     manageTarget.name,
      fromWallet: WALLET_LABELS[wallet],
      toWallet:   "—",
      amount,
      note,
    }, ...p]);

    setManageTarget(null);
  }

  /* ── Handle transfer submit ── */
  function handleTransfer(from: WalletCat, to: WalletCat, amount: number, note: string) {
    adjWallet(from, -amount);
    adjWallet(to,   +amount);

    setTransactions((p) => [{
      id: Date.now(), date: today(), type: "تحويل",
      person:     "—",
      fromWallet: WALLET_LABELS[from],
      toWallet:   WALLET_LABELS[to],
      amount,
      note,
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

        {tab === "ملخص"            && <SummaryTab />}
        {tab === "خزنة المكتب"     && (
          <OfficeWalletTab balance={officeBalance} transactions={transactions} />
        )}
        {tab === "خزنة الدلفري"    && (
          <DeliveryWalletTab
            poolBalance={deliveryBalance}
            drivers={driverWallets}
            onManage={openDriverManage}
          />
        )}
        {tab === "خزنة الموتسكلات" && (
          <MotoWalletTab
            poolBalance={motoBalance}
            motos={motoWallets}
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
