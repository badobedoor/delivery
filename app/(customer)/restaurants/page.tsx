"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
};

/* ── Static promotional data (no DB table) ── */
const topMeals = [
  { id: 1, name: "برجر كلاسيك",    restaurant: "بيت البرجر",   rating: 4.8, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
  { id: 2, name: "بيتزا مارجريتا", restaurant: "ليالي بيتزا",  rating: 4.6, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
  { id: 3, name: "شاورما لحم",     restaurant: "شاورما الشام", rating: 4.7, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
  { id: 4, name: "دجاج مشوي",     restaurant: "مشويات النيل", rating: 4.5, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
];

const FALLBACK_IMG = "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="11" height="11" viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? "var(--color-primary)" : "var(--color-border)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-xs text-[var(--color-muted)] mr-1">{rating}</span>
    </span>
  );
}

export default function RestaurantsPage() {
  const address = "المعادي، القاهرة";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurants() {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, description, image_url, cover_image_url")
        .eq("is_active", true)
        .order("name");

      if (error) {
        setError("تعذّر تحميل المطاعم");
      } else {
        setRestaurants(data ?? []);
      }
      setLoading(false);
    }

    fetchRestaurants();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">

            {/* العنوان — يمين */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--color-muted)]">التوصيل إلى</span>
              <button className="flex items-center gap-0.5 text-sm font-semibold text-[var(--color-secondary)]">
                {address}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* أيقونات — يسار */}
            <button
              aria-label="بحث"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
        </header>

        <main className="pb-6 px-4">

          {/* ── Banner ── */}
          <section className="pt-4">
            <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-md">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=300&fit=crop"
                alt="إعلان"
                fill
                className="object-cover"
                priority
              />
            </div>
          </section>

          {/* ── الأكثر طلباً ── */}
          <section className="pt-6">
            <h2 className="text-base font-bold text-[var(--color-secondary)] mb-3">
              الأكثر طلباً 🔥
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {topMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-sm border border-[var(--color-border)]"
                >
                  <div className="relative w-full h-28">
                    <Image src={meal.img} alt={meal.name} fill className="object-cover" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-[var(--color-secondary)] truncate">
                      {meal.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">
                      {meal.restaurant}
                    </p>
                    <div className="mt-1.5">
                      <StarRating rating={meal.rating} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── كل المطاعم ── */}
          <section className="pt-6">
            <h2 className="text-base font-bold text-[var(--color-secondary)] mb-3">
              كل المطاعم
            </h2>

            {loading && (
              <p className="text-sm text-[var(--color-muted)] text-center py-6">جاري التحميل...</p>
            )}

            {error && (
              <p className="text-sm text-[var(--color-muted)] text-center py-6">{error}</p>
            )}

            {!loading && !error && restaurants.length === 0 && (
              <p className="text-sm text-[var(--color-muted)] text-center py-6">لا توجد مطاعم متاحة حالياً</p>
            )}

            <div className="flex flex-col gap-3">
              {restaurants.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurant/${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-[var(--color-border)]"
                >
                  {/* صورة المطعم — يمين */}
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={r.image_url ?? FALLBACK_IMG}
                      alt={r.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)] truncate">
                      {r.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">
                      {r.description ?? ""}
                    </p>
                    <div className="mt-1.5">
                      <StarRating rating={4.5} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
