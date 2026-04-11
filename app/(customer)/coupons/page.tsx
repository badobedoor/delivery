"use client";

import Link from "next/link";
import { useState } from "react";

/* ── بيانات وهمية ── */
const validCoupons = [
  { id: 1, code: "HALA50",   discount: "خصم ٥٠٪",       expiry: "٣٠ أبريل ٢٠٢٦"  },
  { id: 2, code: "WELCOME20", discount: "خصم ٢٠٪",      expiry: "١٥ مايو ٢٠٢٦"   },
  { id: 3, code: "FREESHIP",  discount: "توصيل مجاني",  expiry: "١ يونيو ٢٠٢٦"   },
];

const tabs = [
  { key: "valid",   label: "صالح"   },
  { key: "used",    label: "استخدم" },
  { key: "expired", label: "انتهت"  },
] as const;

type TabKey = typeof tabs[number]["key"];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center">
      <span className="text-6xl">🎫</span>
      <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد قسائم</p>
    </div>
  );
}

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("valid");

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-0 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between pb-4">
            <Link href="/account"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <h1 className="text-base font-black text-[var(--color-secondary)]">القسائم</h1>

            <div className="w-9" />
          </div>

          {/* ── Tabs ── */}
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-sm font-bold text-center border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pt-4 pb-10">

          {/* ── قسائم صالحة ── */}
          {activeTab === "valid" && (
            <div className="flex flex-col gap-3">
              {validCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden flex"
                >
                  {/* شريط برتقالي على اليمين */}
                  <div className="w-1.5 bg-[var(--color-primary)] flex-shrink-0" />

                  <div className="flex-1 py-4 px-4">
                    {/* كود القسيمة */}
                    <p className="text-base font-black text-[var(--color-primary)] tracking-widest">
                      {coupon.code}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-secondary)] mt-0.5">
                      {coupon.discount}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      ينتهي في {coupon.expiry}
                    </p>

                    {/* فاصل متقطع */}
                    <div className="border-t-2 border-dashed border-[var(--color-border)] my-3" />

                    {/* زرار الاستخدام */}
                    <div className="flex justify-end">
                      <button className="text-sm font-bold text-[var(--color-primary)] border-2 border-[var(--color-primary)] px-4 py-1.5 rounded-xl active:scale-[0.98] transition-transform">
                        استخدم الآن
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── حالة فارغة للتابات الأخرى ── */}
          {activeTab !== "valid" && <EmptyState />}

        </main>
      </div>
    </div>
  );
}
