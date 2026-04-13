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

/* ── SVG icons ── */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Reusable field row ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: C.muted }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  type = "text",
  disabled = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{
        background: disabled ? `${C.bg}88` : C.bg,
        border: `1px solid ${C.border}`,
        color: disabled ? C.muted : C.text,
        colorScheme: "dark",
      }}
    />
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
      style={{
        background: saved ? `${C.green}22` : C.teal,
        color: saved ? C.green : "#fff",
        border: saved ? `1px solid ${C.green}44` : "none",
      }}
    >
      {saved && <CheckIcon />}
      {saved ? "تم الحفظ" : "حفظ التغييرات"}
    </button>
  );
}

/* ── Section card ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-5"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
      {children}
    </div>
  );
}

/* ── Toggle switch ── */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: C.text }}>{label}</span>
      <button
        onClick={() => onChange(!on)}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: on ? C.teal : C.border }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ right: on ? "2px" : "auto", left: on ? "auto" : "2px" }}
        />
      </button>
    </div>
  );
}

/* ── Tabs ── */
const TABS = ["عام", "الإشعارات", "الدفع", "عن التطبيق"] as const;
type Tab = (typeof TABS)[number];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("عام");

  /* General */
  const [appName,     setAppName]     = useState("حالا دليفري");
  const [appPhone,    setAppPhone]    = useState("01000000000");
  const [appEmail,    setAppEmail]    = useState("support@hala.app");
  const [minOrder,    setMinOrder]    = useState("30");
  const [deliveryFee, setDeliveryFee] = useState("15");
  const [savedGeneral, setSavedGeneral] = useState(false);

  /* Notifications */
  const [notifNewOrder,   setNotifNewOrder]   = useState(true);
  const [notifCancelled,  setNotifCancelled]  = useState(true);
  const [notifDriverLate, setNotifDriverLate] = useState(false);
  const [notifSMS,        setNotifSMS]        = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);

  /* Payment */
  const [cashEnabled,   setCashEnabled]   = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [vatPercent,    setVatPercent]    = useState("14");
  const [savedPayment,  setSavedPayment]  = useState(false);

  /* About */
  const [version,      ] = useState("1.0.0");
  const [copyrightYear,] = useState("2026");

  function saveGeneral() {
    setSavedGeneral(true);
    setTimeout(() => setSavedGeneral(false), 2500);
  }
  function saveNotif() {
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2500);
  }
  function savePayment() {
    setSavedPayment(true);
    setTimeout(() => setSavedPayment(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
            style={{
              background: tab === t ? C.teal : "transparent",
              color:      tab === t ? "#fff" : C.muted,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB: عام ── */}
      {tab === "عام" && (
        <Section title="إعدادات عامة">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم التطبيق">
              <TextInput value={appName} onChange={setAppName} placeholder="اسم التطبيق" />
            </Field>
            <Field label="رقم الهاتف">
              <TextInput value={appPhone} onChange={setAppPhone} placeholder="01000000000" />
            </Field>
            <Field label="البريد الإلكتروني">
              <TextInput value={appEmail} onChange={setAppEmail} placeholder="support@app.com" type="email" />
            </Field>
            <div /> {/* spacer */}
            <Field label="الحد الأدنى للطلب (ج.م)">
              <TextInput value={minOrder} onChange={setMinOrder} type="number" placeholder="30" />
            </Field>
            <Field label="رسوم التوصيل الافتراضية (ج.م)">
              <TextInput value={deliveryFee} onChange={setDeliveryFee} type="number" placeholder="15" />
            </Field>
          </div>
          <div className="flex justify-start">
            <SaveButton onClick={saveGeneral} saved={savedGeneral} />
          </div>
        </Section>
      )}

      {/* ── TAB: الإشعارات ── */}
      {tab === "الإشعارات" && (
        <Section title="إعدادات الإشعارات">
          <div className="flex flex-col gap-4">
            <Toggle on={notifNewOrder}   onChange={setNotifNewOrder}   label="إشعار عند وصول طلب جديد" />
            <Toggle on={notifCancelled}  onChange={setNotifCancelled}  label="إشعار عند إلغاء طلب" />
            <Toggle on={notifDriverLate} onChange={setNotifDriverLate} label="تنبيه عند تأخر الدلفري" />

            <div className="h-px" style={{ background: C.border }} />

            <p className="text-sm font-bold" style={{ color: C.muted }}>قنوات الإرسال</p>
            <Toggle on={notifSMS} onChange={setNotifSMS} label="إرسال SMS للعملاء" />
          </div>
          <div className="flex justify-start">
            <SaveButton onClick={saveNotif} saved={savedNotif} />
          </div>
        </Section>
      )}

      {/* ── TAB: الدفع ── */}
      {tab === "الدفع" && (
        <Section title="طرق الدفع والضرائب">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold" style={{ color: C.muted }}>طرق الدفع المتاحة</p>
            <Toggle on={cashEnabled}   onChange={setCashEnabled}   label="الدفع عند الاستلام (كاش)" />
            <Toggle on={onlineEnabled} onChange={setOnlineEnabled} label="الدفع الإلكتروني (بطاقة)" />
            <Toggle on={walletEnabled} onChange={setWalletEnabled} label="المحفظة الإلكترونية" />

            <div className="h-px" style={{ background: C.border }} />

            <Field label="نسبة الضريبة (%)">
              <TextInput value={vatPercent} onChange={setVatPercent} type="number" placeholder="14" />
            </Field>
          </div>
          <div className="flex justify-start">
            <SaveButton onClick={savePayment} saved={savedPayment} />
          </div>
        </Section>
      )}

      {/* ── TAB: عن التطبيق ── */}
      {tab === "عن التطبيق" && (
        <Section title="معلومات التطبيق">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="إصدار التطبيق">
              <TextInput value={version} disabled />
            </Field>
            <Field label="سنة الإصدار">
              <TextInput value={copyrightYear} disabled />
            </Field>
            <Field label="البريد الإلكتروني للدعم">
              <TextInput value={appEmail} disabled />
            </Field>
          </div>

          <div className="h-px" style={{ background: C.border }} />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold" style={{ color: C.muted }}>إجراءات النظام</p>
            <div className="flex flex-wrap gap-3">
              <button
                className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: `${C.orange}22`, color: C.orange }}
              >
                مسح الكاش
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: `${C.red}22`, color: C.red }}
              >
                إعادة تعيين الإعدادات
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-center text-xs"
            style={{ background: C.bg, color: C.muted }}
          >
            حالا دليفري © {copyrightYear} — جميع الحقوق محفوظة
          </div>
        </Section>
      )}

    </div>
  );
}
