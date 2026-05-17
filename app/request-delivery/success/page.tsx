"use client";

import { useRouter } from "next/navigation";

export default function DeliverySuccessPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center" dir="rtl"
      style={{ fontFamily: "var(--font-cairo, Cairo, sans-serif)" }}>
      <div className="max-w-[320px] flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: "#D1FAE5" }}>
          ✅
        </div>
        <h1 className="text-2xl font-black text-[#1A1A1A]">تم استقبال طلبك بنجاح</h1>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          سيتم التواصل معك قريباً وإرسال المندوب إلى عنوانك
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 w-full py-3.5 rounded-2xl text-base font-black text-white"
          style={{ background: "#FF6000" }}>
          رجوع
        </button>
      </div>
    </div>
  );
}
