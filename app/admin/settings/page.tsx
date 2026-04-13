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

/* ── Shared primitives ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: C.muted }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background:  C.bg,
  border:      `1px solid ${C.border}`,
  color:       C.text,
  colorScheme: "dark" as const,
};

function TextInput({ value, onChange, placeholder = "", type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
      style={inputStyle} />
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: C.text }}>{label}</span>
      <button
        onClick={() => onChange(!on)}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: on ? C.teal : C.border }}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ right: on ? "2px" : "auto", left: on ? "auto" : "2px" }} />
      </button>
    </div>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all self-start"
      style={{
        background: saved ? `${C.green}22` : C.orange,
        color:      saved ? C.green : "#fff",
        border:     saved ? `1px solid ${C.green}44` : "none",
      }}>
      {saved ? "✓ تم الحفظ" : "حفظ"}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
      {children}
    </div>
  );
}

function useSave() {
  const [saved, setSaved] = useState(false);
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return { saved, save };
}

export default function AdminSettingsPage() {

  /* ── Card 1: معلومات المنصة ── */
  const [appName,    setAppName]    = useState("حالا");
  const [whatsapp,   setWhatsapp]   = useState("01000000000");
  const s1 = useSave();

  /* ── Card 2: الرسوم والتوزيع ── */
  const [serviceFee,   setServiceFee]   = useState("5");
  const [deliveryFee,  setDeliveryFee]  = useState("15");
  const [driverPct,    setDriverPct]    = useState("33");
  const [motorPct,     setMotorPct]     = useState("33");
  const [officePct,    setOfficePct]    = useState("34");
  const s2 = useSave();

  const totalPct = Number(driverPct) + Number(motorPct) + Number(officePct);
  const pctOk    = totalPct === 100;

  /* ── Card 3: التحكم في الأقسام ── */
  const [showMostOrdered, setShowMostOrdered] = useState(true);
  const [showDontMiss,    setShowDontMiss]    = useState(true);
  const s3 = useSave();

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* ── Card 1: معلومات المنصة ── */}
      <Card title="معلومات المنصة">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المنصة">
            <TextInput value={appName} onChange={setAppName} placeholder="حالا" />
          </Field>
          <Field label="رقم واتساب التواصل">
            <TextInput value={whatsapp} onChange={setWhatsapp} placeholder="01000000000" />
          </Field>
        </div>
        <SaveButton onClick={s1.save} saved={s1.saved} />
      </Card>

      {/* ── Card 2: الرسوم والتوزيع ── */}
      <Card title="الرسوم والتوزيع">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رسوم الخدمة (ج.م)">
            <TextInput value={serviceFee}  onChange={setServiceFee}  type="number" placeholder="5" />
          </Field>
          <Field label="رسوم التوصيل الافتراضية (ج.م)">
            <TextInput value={deliveryFee} onChange={setDeliveryFee} type="number" placeholder="15" />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: C.muted }}>توزيع الأرباح</p>

          <div className="grid grid-cols-3 gap-3">
            <Field label="نسبة الدلفري %">
              <TextInput value={driverPct} onChange={setDriverPct} type="number" placeholder="33" />
            </Field>
            <Field label="نسبة الموتسكل %">
              <TextInput value={motorPct}  onChange={setMotorPct}  type="number" placeholder="33" />
            </Field>
            <Field label="نسبة المكتب %">
              <TextInput value={officePct} onChange={setOfficePct} type="number" placeholder="34" />
            </Field>
          </div>

          {/* Total indicator */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{
              background: pctOk ? `${C.green}15` : `${C.red}15`,
              border:     `1px solid ${pctOk ? C.green : C.red}30`,
            }}
          >
            <span className="text-sm font-semibold" style={{ color: pctOk ? C.green : C.red }}>
              مجموع النسب
            </span>
            <span className="text-sm font-black" style={{ color: pctOk ? C.green : C.red }}>
              {totalPct}%
              {!pctOk && <span className="text-xs font-semibold mr-2">⚠ يجب أن يساوي 100%</span>}
            </span>
          </div>
        </div>

        <SaveButton onClick={s2.save} saved={s2.saved} />
      </Card>

      {/* ── Card 3: التحكم في الأقسام ── */}
      <Card title="التحكم في الأقسام">
        <div className="flex flex-col gap-2">
          <Toggle on={showMostOrdered} onChange={setShowMostOrdered} label="إظهار قسم الأكثر طلباً" />
          <div className="h-px" style={{ background: C.border }} />
          <Toggle on={showDontMiss}    onChange={setShowDontMiss}    label="إظهار قسم اختيارات لا تفوتك" />
        </div>
        <SaveButton onClick={s3.save} saved={s3.saved} />
      </Card>

    </div>
  );
}
