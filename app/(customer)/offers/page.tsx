"use client";

import Link from "next/link";
import { useState } from "react";

/* ── بيانات وهمية ── */
const offers = [
  {
    id: 1,
    title:   "خصم ٥٠٪ على أول طلب",
    desc:    "استخدم الكود واحصل على خصم ٥٠٪ على طلبك الأول من أي مطعم",
    code:    "HALA50",
    expiry:  "٣٠ أبريل ٢٠٢٦",
  },
  {
    id: 2,
    title:   "توصيل مجاني طوال الأسبوع",
    desc:    "استمتع بتوصيل مجاني على جميع طلباتك بدون حد أدنى",
    code:    "FREESHIP",
    expiry:  "١٥ مايو ٢٠٢٦",
  },
  {
    id: 3,
    title:   "خصم ٢٠٪ على وجبات البيتزا",
    desc:    "خصم خاص على جميع أصناف البيتزا من ليالي بيتزا",
    code:    "PIZZA20",
    expiry:  "١ يونيو ٢٠٢٦",
  },
];

export default function OffersPage() {
  const [copied, setCopied] = useState<number | null>(null);

  function copyCode(id: number, code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/account"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">العروض</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-10">

          {offers.length === 0 ? (
            /* ── حالة فارغة ── */
            <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center">
              <span className="text-6xl">🎁</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد عروض حالياً</p>
              <p className="text-sm text-[var(--color-muted)]">تابعنا للحصول على أحدث العروض</p>
            </div>
          ) : (
            /* ── قائمة العروض ── */
            <div className="flex flex-col gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl overflow-hidden shadow-md"
                  style={{ background: "linear-gradient(135deg, #F97316 0%, #C2410C 100%)" }}
                >
                  <div className="px-5 pt-5 pb-4">
                    {/* العنوان */}
                    <p className="text-lg font-black text-white">{offer.title}</p>

                    {/* الوصف */}
                    <p className="text-sm text-white/80 mt-1 leading-relaxed">{offer.desc}</p>

                    {/* الكود */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 border-2 border-dashed border-white/60 rounded-xl px-3 py-2">
                        <p className="text-base font-black text-white tracking-widest text-center">
                          {offer.code}
                        </p>
                      </div>
                      <button
                        onClick={() => copyCode(offer.id, offer.code)}
                        className="bg-white text-[var(--color-primary)] text-sm font-bold px-4 py-2.5 rounded-xl flex-shrink-0 active:scale-[0.97] transition-transform"
                      >
                        {copied === offer.id ? "✓ تم النسخ" : "انسخ الكود"}
                      </button>
                    </div>

                    {/* تاريخ الانتهاء */}
                    <p className="text-xs text-white/70 mt-3">
                      ينتهي في {offer.expiry}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
