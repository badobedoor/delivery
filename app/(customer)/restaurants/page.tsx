"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import CartBar from "@/components/customer/CartBar";

/* ── Types ── */
type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
};

type Advertisement = {
  id: string;
  image_url: string | null;
  link: string | null;
};

type FeaturedItem = {
  id: string;
  name: string;
  restaurant_name: string | null;
  rating: number | null;
  image_url: string | null;
  price: number | null;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop";

export default function RestaurantsPage() {
  const address = "المعادي، القاهرة";

  const [restaurants,   setRestaurants]   = useState<Restaurant[]>([]);
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [restaurantsRes, adsRes, featuredRes] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, description, image_url, cover_image_url")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("advertisements")
          .select("id, image_url, link")
          .eq("is_active", true)
          .eq("page", "home")
          .order("order_index")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("featured_items")
          .select("id, name, restaurant_name, rating, image_url, price")
          .eq("is_active", true)
          .order("order_index"),
      ]);

      if (restaurantsRes.error) setError("تعذّر تحميل المطاعم");
      else setRestaurants(restaurantsRes.data ?? []);

      setAdvertisement(adsRes.data ?? null);
      setFeaturedItems(featuredRes.data ?? []);
      setLoading(false);
    }

    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-3 sticky top-0 z-10 border-b border-[#F3F4F6]">
          <div className="flex items-center justify-between gap-2">

            {/* حالا — يمين */}
            <span className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
              حالا
            </span>

            {/* العنوان — وسط */}
            <button className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-semibold text-[var(--color-secondary)] truncate max-w-[180px]">
                {address || "اختر عنوانك"}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.5" className="flex-shrink-0">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* بحث — يسار */}
            <Link
              href="/search"
              aria-label="بحث"
              className="w-9 h-9 rounded-full bg-[#F9FAFB] flex items-center justify-center flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
          </div>
        </header>

        <main className="pb-32 px-4">

          {/* ── بنر إعلاني ── */}
          {advertisement?.image_url && (
            <section className="pt-4">
              {advertisement.link ? (
                <Link href={advertisement.link} className="block">
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                    <Image
                      src={advertisement.image_url}
                      alt="إعلان"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </Link>
              ) : (
                <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                  <Image
                    src={advertisement.image_url}
                    alt="إعلان"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </section>
          )}

          {/* ── الأكثر طلباً ── */}
          {featuredItems.length > 0 && (
            <section className="pt-5">
              <h2 className="text-base font-bold text-[var(--color-secondary)] mb-3">
                الأكثر طلباً 🔥
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {featuredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-[#F3F4F6]"
                  >
                    <div className="relative w-full h-28">
                      <Image
                        src={item.image_url ?? FALLBACK_IMG}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-semibold text-[var(--color-secondary)] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">
                        {item.restaurant_name ?? ""}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-xs text-[var(--color-muted)]">
                          {item.rating ?? 0}
                        </span>
                      </div>
                      {item.price != null && (
                        <p className="text-xs font-bold text-[var(--color-primary)] mt-1">
                          {item.price} جنيه
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── كل المطاعم ── */}
          <section className="pt-5">
            <h2 className="text-base font-bold text-[var(--color-secondary)] mb-1">
              كل المطاعم
            </h2>

            {loading && (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">
                جاري التحميل...
              </p>
            )}

            {error && (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">{error}</p>
            )}

            {!loading && !error && restaurants.length === 0 && (
              <p className="text-sm text-[var(--color-muted)] text-center py-8">
                لا توجد مطاعم متاحة حالياً
              </p>
            )}

            <div className="flex flex-col">
              {restaurants.map((r, index) => (
                <div key={r.id}>
                  <Link
                    href={`/restaurant/${r.id}`}
                    className="flex items-center gap-3 py-3"
                  >
                    {/* صورة المطعم */}
                    <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={r.image_url ?? FALLBACK_IMG}
                        alt={r.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* المعلومات */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-[var(--color-secondary)] truncate">
                        {r.name}
                      </p>
                      {r.description && (
                        <p className="text-sm text-[var(--color-muted)] truncate mt-0.5">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-[var(--color-secondary)]">
                          4.5
                        </span>
                        <span className="text-xs text-[#9CA3AF]">• 230 تقييم</span>
                      </div>
                    </div>
                  </Link>

                  {index < restaurants.length - 1 && (
                    <div className="h-px bg-[#D1D5DB]" />
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>

      <CartBar />

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">
        <Link href="/" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="1.8">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">الرئيسية</span>
        </Link>

        <Link href="/search" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">بحث</span>
        </Link>

        <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">المفضلة</span>
        </Link>

        <Link href="/account" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">حسابي</span>
        </Link>
      </nav>
    </div>
  );
}
