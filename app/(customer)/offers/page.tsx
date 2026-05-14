"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Offer = {
  id:             string;
  code:           string;
  ad_title:       string | null;
  ad_description: string | null;
  expires_at:     string | null;
};

function formatExpiry(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function OffersPage() {
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("coupons")
        .select("id, code, type, value, applies_to, min_order, expires_at, is_active, usage_limit_total, usage_limit_per_user, visibility, ad_title, ad_description")
        .eq("visibility", "public")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      setOffers((data ?? []) as Offer[]);
      setLoading(false);
    }
    load();
  }, []);

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

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

          {loading ? (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : offers.length === 0 ? (
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
                    <p className="text-lg font-black text-white">
                      {offer.ad_title ?? offer.code}
                    </p>

                    {/* الوصف */}
                    {offer.ad_description && (
                      <p className="text-sm text-white/80 mt-1 leading-relaxed">{offer.ad_description}</p>
                    )}

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
                    {offer.expires_at && (
                      <p className="text-xs text-white/70 mt-3">
                        ينتهي في {formatExpiry(offer.expires_at)}
                      </p>
                    )}
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
