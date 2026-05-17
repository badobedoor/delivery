"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Restaurant = { id: string; name: string; phone: string | null };
type Area        = { id: string; name: string; delivery_fee: number };

export default function ConfirmDeliveryPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurant") ?? "";

  const [restaurant,       setRestaurant]       = useState<Restaurant | null>(null);
  const [areas,            setAreas]            = useState<Area[]>([]);
  const [selectedAreaId,   setSelectedAreaId]   = useState("");
  const [address,          setAddress]          = useState("");
  const [previousAreaName, setPreviousAreaName] = useState("");
  const [notes,            setNotes]            = useState("");
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      supabase.from("restaurants").select("id, name, phone").eq("id", restaurantId).single(),
      supabase.from("areas").select("id, name, delivery_fee").eq("is_active", true).order("name", { ascending: true }),
    ]).then(([restRes, areasRes]) => {
      if (restRes.data) setRestaurant(restRes.data as Restaurant);
      setAreas((areasRes.data ?? []) as Area[]);
    });
  }, [restaurantId]);

  function handleAreaChange(areaId: string) {
    setSelectedAreaId(areaId);
    const area = areas.find((a) => a.id === areaId);
    if (area) {
      if (!address.trim() || address === previousAreaName) {
        setAddress(area.name);
        setPreviousAreaName(area.name);
      }
    }
  }

  const selectedArea = areas.find((a) => a.id === selectedAreaId) ?? null;
  const canSubmit    = !!selectedAreaId && address.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !selectedArea || !restaurant) return;
    setSubmitting(true);
    setError("");

    const notesText = [
      `المطعم: ${restaurant.name}`,
      `المنطقة: ${selectedArea.name}`,
      `العنوان: ${address.trim() || selectedArea.name}`,
      notes.trim() ? `ملاحظات: ${notes.trim()}` : null,
    ].filter(Boolean).join("\n");

    const { error: err } = await supabase.from("orders").insert({
      restaurant_id:   restaurantId,
      delivery_fee:    selectedArea.delivery_fee,
      notes:           notesText,
      order_type:      "delivery_request",
      status:          "pending",
      total:           selectedArea.delivery_fee,
      subtotal:        0,
      discount_amount: 0,
    });

    setSubmitting(false);
    if (err) {
      console.error("Insert Error:", err);
      setError("حدث خطأ: " + err.message);
      return;
    }
    router.push("/request-delivery/success");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl"
      style={{ fontFamily: "var(--font-cairo, Cairo, sans-serif)" }}>

      <div className="mx-auto w-full max-w-[430px] flex flex-col px-4 pt-12 pb-8 gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-black text-[#1A1A1A]">تفاصيل الطلب</h1>
        </div>

        {/* كارت المطعم */}
        {restaurant && (
          <div className="bg-[#FFF5F0] border border-[#FFD5C0] rounded-2xl px-4 py-3.5">
            <p className="text-base font-black text-[#1A1A1A]">{restaurant.name}</p>
            {restaurant.phone && (
              <p className="text-sm text-[#6B7280] mt-0.5">📞 {restaurant.phone}</p>
            )}
          </div>
        )}

        {/* اختيار المنطقة */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">المنطقة *</label>
          <select
            value={selectedAreaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3.5 text-sm outline-none bg-[#F9FAFB] text-[#1A1A1A]"
          >
            <option value="" disabled>اختر المنطقة</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {selectedArea && (
            <p className="text-sm font-semibold text-[#FF6000]">
              سعر التوصيل: {selectedArea.delivery_fee} ج.م
            </p>
          )}
        </div>

        {/* عنوان التوصيل */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">عنوان التوصيل *</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="أدخل عنوان التوصيل بالتفصيل (شارع، مبنى، شقة، إلخ)"
            rows={4}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none resize-none bg-[#F9FAFB] focus:border-[#FF6000] text-[#1A1A1A] placeholder:text-[#9CA3AF]"
          />
        </div>

        {/* ملاحظات */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-[#1A1A1A]">
            ملاحظات
            <span className="font-normal text-[#9CA3AF] mr-1">(اختياري)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أدخل رقم الزبون أو أي ملاحظات إضافية"
            rows={3}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none resize-none"
            style={{ background: "#F5F5F5", border: "1px solid #E5E5E5", color: "#1A1A1A" }}
          />
        </div>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        {/* زرار التأكيد */}
        <button
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-2xl text-base font-black transition-all ${
            canSubmit ? "text-white hover:opacity-90" : "text-gray-500 cursor-not-allowed"
          }`}
          style={{ background: canSubmit ? "#FF6000" : "#D1D5DB" }}
        >
          {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
        </button>

      </div>
    </div>
  );
}
