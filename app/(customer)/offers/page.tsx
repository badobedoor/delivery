"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getEffectiveMealPrice } from "@/lib/pricing";
import { formatCairoDate, formatCairoTime } from "@/lib/dateTime";
import BottomNav from "@/components/customer/BottomNav";

type OfferItem = {
  id:              string;
  name:            string;
  description:     string | null;
  price:           number;
  image_url:       string | null;
  offer_price:     number | null;
  offer_image_url: string | null;
  offer_starts_at: string | null;
  offer_ends_at:   string | null;
  restaurant_id:   string | null;
  categories:      { name: string } | null;
  restaurants:     { name: string } | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return formatCairoDate(iso, { year: false }) + " - " + formatCairoTime(iso);
}

export default function OffersPage() {
  const router  = useRouter();
  const [offers,  setOffers]  = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          offer_price,
          offer_image_url,
          offer_starts_at,
          offer_ends_at,
          restaurant_id,
          categories!inner(name),
          restaurants!inner(name)
        `)
        .eq("categories.name", "عروض")
        .eq("is_active", true)
        .not("offer_price", "is", null);

      console.log("Offers data:", data);
      console.log("Offers error:", error);

      setOffers((data ?? []) as unknown as OfferItem[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <h1 className="text-base font-black text-[var(--color-secondary)]">عروض</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-24">

          {loading ? (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center">
              <span className="text-6xl">🎁</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد عروض متاحة حالياً</p>
              <p className="text-sm text-[var(--color-muted)]">تابعنا للحصول على أحدث العروض</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {offers.map((offer) => {
                const img = offer.offer_image_url || offer.image_url;
                const effectivePrice = getEffectiveMealPrice(offer);
                const showOffer = effectivePrice !== offer.price;
                const discount = showOffer && offer.offer_price
                  ? Math.round((1 - offer.offer_price / offer.price) * 100)
                  : 0;

                return (
                  <div key={offer.id}
                    onClick={() => offer.restaurant_id && router.push(`/restaurant/${offer.restaurant_id}?category=عروض&returnTo=/offers`)}
                    className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[var(--color-border)] ${offer.restaurant_id ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}>

                    {/* الصورة */}
                    <div className="relative w-full h-48 bg-[var(--color-surface)]">
                      {img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={img} alt={offer.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl">🍽️</span>
                        </div>
                      )}
                      {/* Badge نسبة الخصم */}
                      {discount > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
                          -{discount}%
                        </div>
                      )}
                    </div>

                    {/* المحتوى */}
                    <div className="p-4">
                      <p className="text-base font-bold text-[var(--color-secondary)]">{offer.name}</p>
                      {offer.restaurants?.name && (
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{offer.restaurants.name}</p>
                      )}
                      {offer.description && (
                        <p className="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">{offer.description}</p>
                      )}

                      {/* الأسعار */}
                      <div className="flex items-center gap-3 mt-3">
                        {showOffer ? (
                          <>
                            <span className="text-xl font-black text-[#FF6000]">{effectivePrice} ج.م</span>
                            <span className="text-sm text-gray-400 line-through">{offer.price} ج.م</span>
                          </>
                        ) : (
                          <span className="text-xl font-black text-[#FF6000]">{offer.price} ج.م</span>
                        )}
                      </div>

                      {/* التواريخ */}
                      {(offer.offer_starts_at || offer.offer_ends_at) && (
                        <div className="mt-3 flex flex-col gap-0.5 pt-3 border-t border-[var(--color-border)]">
                          {offer.offer_starts_at && (
                            <p className="text-xs text-[var(--color-muted)]">
                              📅 من: {fmtDate(offer.offer_starts_at)}
                            </p>
                          )}
                          {offer.offer_ends_at && (
                            <p className="text-xs text-[var(--color-muted)]">
                               ⠀⠀إلى: {fmtDate(offer.offer_ends_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>

        <BottomNav />
      </div>
    </div>
  );
}
