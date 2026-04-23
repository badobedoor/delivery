"use client";

import { useState, useEffect } from "react";

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

/* ─────────────────────── Shared UI ─────────────────── */

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: C.muted }}>{label}</label>
      {children}
      {error && <p className="text-xs font-medium" style={{ color: C.red }}>{error}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = "", type = "text", hasError = false }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hasError?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{
        background:  C.bg,
        border:      `1px solid ${hasError ? C.red : C.border}`,
        color:       C.text,
        colorScheme: "dark",
      }} />
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

function SaveButton({ onClick, saved, saving }: { onClick: () => void; saved: boolean; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all self-start disabled:opacity-60"
      style={{
        background: saved ? `${C.green}22` : C.orange,
        color:      saved ? C.green : "#fff",
        border:     saved ? `1px solid ${C.green}44` : "none",
      }}>
      {saving ? "جاري الحفظ..." : saved ? "✓ تم الحفظ" : "حفظ"}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-5"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
      {children}
    </div>
  );
}

/* ─────────────────────── API helpers ───────────────── */

async function fetchSettings() {
  const res = await fetch("/api/admin/settings");
  if (!res.ok) throw new Error("فشل تحميل الإعدادات");
  return res.json();
}

async function patchSettings(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/settings", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? "حدث خطأ أثناء الحفظ");
  }
}

/* ─────────────────────── Page ──────────────────────── */

export default function AdminSettingsPage() {
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  /* Card 1 — معلومات المنصة */
  const [appName,   setAppName]   = useState("");
  const [whatsapp,  setWhatsapp]  = useState("");
  const [s1Saving,  setS1Saving]  = useState(false);
  const [s1Saved,   setS1Saved]   = useState(false);
  const [s1Err,     setS1Err]     = useState<string | null>(null);
  const [s1Errors,  setS1Errors]  = useState<{ appName?: string; whatsapp?: string }>({});

  /* Card 2 — الرسوم والتوزيع */
  const [serviceFee,   setServiceFee]   = useState("");
  const [deliveryFee,  setDeliveryFee]  = useState("");
  const [driverPct,    setDriverPct]    = useState("");
  const [restaurantPct,setRestaurantPct]= useState("");
  const [officePct,    setOfficePct]    = useState("");
  const [s2Saving,     setS2Saving]     = useState(false);
  const [s2Saved,      setS2Saved]      = useState(false);
  const [s2Err,        setS2Err]        = useState<string | null>(null);
  const [s2Errors,     setS2Errors]     = useState<{
    serviceFee?: string; deliveryFee?: string; percentages?: string;
  }>({});

  const totalPct = Number(driverPct) + Number(restaurantPct) + Number(officePct);
  const pctOk    = totalPct === 100;

  /* Card 3 — التحكم في الأقسام */
  const [showMostOrdered, setShowMostOrdered] = useState(true);
  const [showRecommended, setShowRecommended] = useState(true);
  const [s3Saving,        setS3Saving]        = useState(false);
  const [s3Saved,         setS3Saved]         = useState(false);
  const [s3Err,           setS3Err]           = useState<string | null>(null);

  /* ── Load on mount ── */
  useEffect(() => {
    fetchSettings()
      .then((d) => {
        setAppName(d.platform_name        ?? "");
        setWhatsapp(d.whatsapp_number     ?? "");
        setServiceFee(String(d.service_fee   ?? ""));
        setDeliveryFee(String(d.delivery_fee ?? ""));
        setDriverPct(String(d.driver_percentage      ?? ""));
        setRestaurantPct(String(d.restaurant_percentage ?? ""));
        setOfficePct(String(d.office_percentage      ?? ""));
        setShowMostOrdered(d.show_most_ordered ?? true);
        setShowRecommended(d.show_recommended  ?? true);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Save helpers ── */
  function flashSaved(setSaved: (v: boolean) => void) {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveCard1() {
    const errs: typeof s1Errors = {};
    if (!appName.trim())           errs.appName  = "اسم المنصة مطلوب";
    if (whatsapp.trim() && !/^01[0125][0-9]{8}$/.test(whatsapp.trim()))
      errs.whatsapp = "رقم الواتساب غير صحيح";
    if (Object.keys(errs).length) { setS1Errors(errs); return; }
    setS1Errors({});
    setS1Saving(true);
    setS1Err(null);
    try {
      await patchSettings({ platform_name: appName.trim(), whatsapp_number: whatsapp.trim() || null });
      flashSaved(setS1Saved);
    } catch (e) {
      setS1Err(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setS1Saving(false);
    }
  }

  async function saveCard2() {
    const errs: typeof s2Errors = {};
    const sf = Number(serviceFee);
    const df = Number(deliveryFee);
    if (!serviceFee.trim()  || isNaN(sf) || sf < 0)  errs.serviceFee  = "رسوم الخدمة لازم تكون رقم موجب";
    if (!deliveryFee.trim() || isNaN(df) || df < 0)  errs.deliveryFee = "رسوم التوصيل لازم تكون رقم موجب";
    if (!pctOk) errs.percentages = `مجموع النسب ${totalPct}% — لازم يساوي 100%`;
    if (Object.keys(errs).length) { setS2Errors(errs); return; }
    setS2Errors({});
    setS2Saving(true);
    setS2Err(null);
    try {
      await patchSettings({
        service_fee:             sf,
        delivery_fee:            df,
        driver_percentage:       Number(driverPct),
        restaurant_percentage:   Number(restaurantPct),
        office_percentage:       Number(officePct),
      });
      flashSaved(setS2Saved);
    } catch (e) {
      setS2Err(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setS2Saving(false);
    }
  }

  async function saveCard3() {
    setS3Saving(true);
    setS3Err(null);
    try {
      await patchSettings({ show_most_ordered: showMostOrdered, show_recommended: showRecommended });
      flashSaved(setS3Saved);
    } catch (e) {
      setS3Err(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setS3Saving(false);
    }
  }

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: C.muted }}>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl px-5 py-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm font-semibold" style={{ color: C.red }}>{loadError}</p>
        <button onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: C.orange, color: "#fff" }}>إعادة المحاولة</button>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* Card 1 — معلومات المنصة */}
      <Card title="معلومات المنصة">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المنصة" error={s1Errors.appName}>
            <TextInput value={appName} onChange={setAppName} placeholder="حالا"
              hasError={!!s1Errors.appName} />
          </Field>
          <Field label="رقم واتساب التواصل" error={s1Errors.whatsapp}>
            <TextInput value={whatsapp} onChange={setWhatsapp} placeholder="01012345678"
              hasError={!!s1Errors.whatsapp} />
          </Field>
        </div>
        {s1Err && <p className="text-xs font-semibold" style={{ color: C.red }}>{s1Err}</p>}
        <SaveButton onClick={saveCard1} saved={s1Saved} saving={s1Saving} />
      </Card>

      {/* Card 2 — الرسوم والتوزيع */}
      <Card title="الرسوم والتوزيع">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رسوم الخدمة (ج.م)" error={s2Errors.serviceFee}>
            <TextInput value={serviceFee}  onChange={setServiceFee}  type="number" placeholder="5"
              hasError={!!s2Errors.serviceFee} />
          </Field>
          <Field label="رسوم التوصيل الافتراضية (ج.م)" error={s2Errors.deliveryFee}>
            <TextInput value={deliveryFee} onChange={setDeliveryFee} type="number" placeholder="15"
              hasError={!!s2Errors.deliveryFee} />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: C.muted }}>توزيع الأرباح</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="نسبة الدلفري %">
              <TextInput value={driverPct}     onChange={setDriverPct}     type="number" placeholder="33" />
            </Field>
            <Field label="نسبة المطعم %">
              <TextInput value={restaurantPct} onChange={setRestaurantPct} type="number" placeholder="33" />
            </Field>
            <Field label="نسبة المكتب %">
              <TextInput value={officePct}     onChange={setOfficePct}     type="number" placeholder="34" />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{
              background: pctOk ? `${C.green}15` : `${C.red}15`,
              border:     `1px solid ${pctOk ? C.green : C.red}30`,
            }}>
            <span className="text-sm font-semibold" style={{ color: pctOk ? C.green : C.red }}>
              مجموع النسب
            </span>
            <span className="text-sm font-black" style={{ color: pctOk ? C.green : C.red }}>
              {totalPct}%
              {!pctOk && <span className="text-xs font-semibold mr-2">⚠ يجب أن يساوي 100%</span>}
            </span>
          </div>

          {s2Errors.percentages && (
            <p className="text-xs font-semibold" style={{ color: C.red }}>{s2Errors.percentages}</p>
          )}
        </div>

        {s2Err && <p className="text-xs font-semibold" style={{ color: C.red }}>{s2Err}</p>}
        <SaveButton onClick={saveCard2} saved={s2Saved} saving={s2Saving} />
      </Card>

      {/* Card 3 — التحكم في الأقسام */}
      <Card title="التحكم في الأقسام">
        <div className="flex flex-col gap-2">
          <Toggle on={showMostOrdered} onChange={setShowMostOrdered} label="إظهار قسم الأكثر طلباً" />
          <div className="h-px" style={{ background: C.border }} />
          <Toggle on={showRecommended} onChange={setShowRecommended} label="إظهار قسم اختيارات لا تفوتك" />
        </div>
        {s3Err && <p className="text-xs font-semibold" style={{ color: C.red }}>{s3Err}</p>}
        <SaveButton onClick={saveCard3} saved={s3Saved} saving={s3Saving} />
      </Card>

    </div>
  );
}
