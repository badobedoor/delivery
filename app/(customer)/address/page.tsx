"use client";

import Link from "next/link";
import { useState } from "react";

/* ── بيانات وهمية ── */
const savedAddresses = [
  { id: 1, label: "البيت", details: "المعادي — عمارة 5، شقة 12، الدور 3" },
  { id: 2, label: "الشغل", details: "مصر الجديدة — عمارة 20، الدور 4" },
];

function BackArrow() {
  return (
    <Link href="/"
      className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function AddressPage() {
  /* غيّر لـ [] لرؤية حالة الفراغ */
  const [addresses] = useState(savedAddresses);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            {/* يمين: رجوع */}
            <BackArrow />

            {/* وسط: العنوان */}
            <h1 className="text-base font-black text-[var(--color-secondary)]">العناوين</h1>

            {/* يسار: أضف */}
            <Link href="/address/new"
              className="text-sm font-bold text-[var(--color-primary)]">
              أضف
            </Link>
          </div>
        </header>

        <main className="px-4 pt-6 pb-10">

          {addresses.length === 0 ? (
            /* ── حالة فارغة ── */
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
              <span className="text-7xl">📍</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">
                يبدو أنك لم تحفظ عنواناً
              </p>
              <p className="text-sm text-[var(--color-muted)]">لا يوجد عنوان مسجل</p>
              <Link
                href="/address/new"
                className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl"
              >
                أضف عنوان
              </Link>
            </div>
          ) : (
            /* ── قائمة العناوين ── */
            <div className="flex flex-col gap-3">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelected(addr.id)}
                  className={`w-full flex items-start gap-3 bg-white rounded-2xl p-4 border-2 text-right transition-colors ${
                    selected === addr.id
                      ? "border-[var(--color-primary)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {/* أيقونة */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selected === addr.id
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-surface)]"
                  }`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={selected === addr.id ? "white" : "var(--color-muted)"}
                      strokeWidth="2" strokeLinecap="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>

                  {/* النص */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)]">{addr.label}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{addr.details}</p>
                  </div>

                  {/* علامة اختيار */}
                  {selected === addr.id && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"
                      className="flex-shrink-0 mt-0.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}

              {/* زرار تأكيد الاختيار */}
              {selected && (
                <button className="w-full bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl mt-2 shadow-md active:scale-[0.98] transition-transform">
                  تأكيد العنوان
                </button>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
