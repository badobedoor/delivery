"use client";

import { useRouter } from "next/navigation";

export default function RestaurantInfoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-3 border-b border-[#F3F4F6] flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.06)" }}
            aria-label="رجوع"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[#1A1A1A]">معلومات المطعم</h1>
        </header>

      </div>
    </div>
  );
}
