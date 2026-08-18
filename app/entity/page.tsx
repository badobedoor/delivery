"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Area          = { id: string; name: string; delivery_fee: number | null };
type EntityProfile = { id: string; name: string; address: string | null };

export default function EntityHomePage() {
  const [entity,  setEntity]  = useState<EntityProfile | null>(null);
  const [areas,   setAreas]   = useState<Area[]>([]);
  const [areaId,  setAreaId]  = useState("");
  const [phone,   setPhone]   = useState("");
  const [details, setDetails] = useState("");
  const [price,   setPrice]   = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    /* Entity profile — from the guarded /api/entity/me (server-derived id) */
    fetch("/api/entity/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (mounted && d?.id) setEntity(d); })
      .catch(() => {});

    /* Areas are public (same as the customer app reads them) */
    supabase
      .from("areas")
      .select("id, name, delivery_fee")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (mounted) setAreas(data ?? []);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/entity/delivery-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_id:        areaId || null,
          customer_phone: phone.trim() || null,
          notes:          details.trim() || null,
          price:          price.trim() ? price.trim() : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "حدث خطأ في إرسال الطلب، حاول مرة أخرى");
        setSending(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("تعذر الاتصال بالخادم");
    }
    setSending(false);
  }

  function handleClose() {
    setSuccess(false);
    setAreaId("");
    setPhone("");
    setDetails("");
    setPrice("");
  }

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-5 pt-4 pb-28 lg:pb-6" dir="rtl">

      {/* ── Entity card ── */}
      <div className="bg-white rounded-3xl p-5 flex items-center gap-3 border"
        style={{ borderColor: "#F1F5F9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "#FFF1E6" }}
        >🏢</div>
        <div className="min-w-0">
          <p className="text-lg font-black text-[#1A1A1A] truncate">{entity?.name ?? "..."}</p>
          {entity?.address && (
            <p className="text-xs text-[#6B7280] mt-0.5 truncate">📍 {entity.address}</p>
          )}
        </div>
      </div>

      {/* ── CTA — single button: sticky bottom bar on mobile, in-flow on desktop ── */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur px-3 pt-3 lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:p-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[430px]">
          <button
            type="submit"
            form="entity-request-form"
            disabled={sending}
            className="w-full py-4 rounded-2xl text-base font-black text-white transition-all disabled:opacity-60 active:scale-[0.99]"
            style={{ background: "#FF6000" }}
          >
            {sending ? "جاري الإرسال..." : "🚚 اطلب دليفري"}
          </button>
        </div>
      </div>

      {/* ── Important alert (clear but not overpowering the CTA) ── */}
      <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3.5 flex flex-col gap-1">
        <p className="text-sm font-black text-[#C2410C]">📌 مهم</p>
        <p className="text-xs font-semibold text-[#9A3412] leading-relaxed">
          كل طلب دليفري يحتاج إلى طلب سائق جديد، حتى لو كان لديك سائق بالفعل.
        </p>
        <p className="text-[11px] text-[#C0825C] leading-relaxed">
          يساعدنا ذلك على تنظيم الطلبات وتشغيل الخدمة بشكل صحيح.
        </p>
      </div>

      {/* ── Form (all fields optional) ── */}
      <form id="entity-request-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">
            المنطقة <span className="font-normal text-[#9CA3AF]">(اختياري)</span>
          </label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3.5 text-sm outline-none bg-[#F9FAFB] text-[#1A1A1A]"
          >
            <option value="">اختر المنطقة</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{a.delivery_fee != null ? ` • ${a.delivery_fee} ج.م` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Customer phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">
            رقم العميل <span className="font-normal text-[#9CA3AF]">(اختياري)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم هاتف العميل"
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3.5 text-sm outline-none bg-[#F9FAFB] text-[#1A1A1A] placeholder:text-[#9CA3AF]"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">
            تفاصيل الطلب <span className="font-normal text-[#9CA3AF]">(اختياري)</span>
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="اكتب تفاصيل الطلب إن وجدت"
            rows={3}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none resize-none bg-[#F9FAFB] text-[#1A1A1A] placeholder:text-[#9CA3AF]"
          />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">
            سعر الطلب <span className="font-normal text-[#9CA3AF]">(اختياري)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="مثال: 150"
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3.5 text-sm outline-none bg-[#F9FAFB] text-[#1A1A1A] placeholder:text-[#9CA3AF]"
          />
          <p className="text-[11px] text-[#9CA3AF]">
            يمكنك إدخال سعر الطلب، أو تركه فارغًا ليقوم الدليفري بإدخاله لاحقًا.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-center py-2 px-3 rounded-xl bg-red-50 text-red-600">
            ⚠ {error}
          </p>
        )}
      </form>

      {/* ── Loading state ── */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70">
          <div className="w-8 h-8 rounded-full border-4 border-[#FF6000] border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Success popup (customer style) ── */}
      {success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <span className="text-5xl">✅</span>
            <div className="flex flex-col items-center gap-1">
              <p className="text-base font-black text-[#1A1A1A] text-center">
                تم إرسال طلب الدليفري ✓
              </p>
              <p className="text-xs text-[#6B7280] text-center leading-relaxed">
                خلال دقائق سيصلك أحد سائقينا 🚚
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform"
              style={{ background: "#FF6000" }}
            >
              حسنًا
            </button>
          </div>
        </div>
      )}
    </div>
  );
}