"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { isRestaurantOpen } from "@/lib/utils";
import { searchMeals } from "@/lib/searchMeals";
import { getEffectiveMealPrice } from "@/lib/pricing";
import { todayCairoDate } from "@/lib/cairoTime";
import { normalizeAdLink } from "@/lib/adLink";
import CartBar from "@/components/customer/CartBar";
import BottomNav from "@/components/customer/BottomNav";

/* ── Types ── */
type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  status: string | null;
  opens_at: string | null;
  closes_at: string | null;
  rating_avg: number | null;
  rating_count: number | null;
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

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  restaurant_id: string;
  offer_price: number | null;
  offer_image_url: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  restaurants: { name: string; is_active: boolean; status: string | null; opens_at: string | null; closes_at: string | null } | null;
  categories: { name: string } | null;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop";

export default function RestaurantsPage() {
  const router = useRouter();

  /* ── Page data ── */
  const [currentAddress, setCurrentAddress] = useState<{ full_address: string; label: string } | null>(null);
  const [restaurants,   setRestaurants]   = useState<Restaurant[]>([]);
  const [ads,           setAds]           = useState<{ id: string; image_url: string | null; link: string | null }[]>([]);
  const [adIndex,       setAdIndex]       = useState(0);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const adTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Search state ── */
  const [query,             setQuery]             = useState("");
  const [activeTab,         setActiveTab]         = useState<"items" | "restaurants">("items");
  const [itemResults,       setItemResults]       = useState<MenuItem[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [searching,         setSearching]         = useState(false);

  useEffect(() => {
    async function fetchAll() {
      /* جيب العنوان الافتراضي */
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: addr } = await supabase
          .from("addresses")
          .select("full_address, label")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .maybeSingle();
        setCurrentAddress(addr ?? null);
      }

      const now = todayCairoDate();
      const [restaurantsRes, adsRes, featuredRes] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, description, image_url, cover_image_url, is_active, status, opens_at, closes_at, rating_avg, rating_count")
          .eq("is_active", true)
          .in("status", ["نشط", "مشغول"])
          .order("sort_order", { ascending: true }),
        supabase
          .from("advertisements")
          .select("id, image_url, link")
          .eq("is_active", true)
          .eq("page", "المطاعم")
          .lte("starts_at", now)
          .gte("ends_at", now)
          .order("order_index", { ascending: true }),
        supabase
          .from("featured_items")
          .select("id, name, restaurant_name, rating, image_url, price")
          .eq("is_active", true)
          .order("order_index"),
      ]);

      if (restaurantsRes.error) {
        console.error("restaurants error:", restaurantsRes.error);
        setError("تعذّر تحميل المطاعم");
      } else {
        setRestaurants(restaurantsRes.data ?? []);
      }

      setAds(adsRes.data ?? []);
      setFeaturedItems(featuredRes.data ?? []);
      setLoading(false);
    }

    fetchAll();
  }, []);

  /* Auto-slide الإعلانات */
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setAdIndex((p) => (p + 1) % ads.length), 4000);
    return () => clearInterval(timer);
  }, [ads.length]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setItemResults([]);
      setRestaurantResults([]);
      return;
    }

    setSearching(true);

    const [meals, restaurantsRes] = await Promise.all([
      searchMeals(q),
      supabase
        .from("restaurants")
        .select("id, name, description, image_url, cover_image_url, is_active, status, opens_at, closes_at")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .eq("is_active", true)
        .eq("status", "نشط")
        .limit(40),
    ]);

    const openRestaurants = ((restaurantsRes.data ?? []) as Restaurant[])
      .filter((r) => isRestaurantOpen(r));

    setItemResults(meals as unknown as MenuItem[]);
    setRestaurantResults(openRestaurants);
    setSearching(false);
  }, []);

  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-3 sticky top-0 z-10 border-b border-[#F3F4F6]">
          {/* الصف الأول: شعار + عنوان */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xl font-black flex-shrink-0" style={{ color: "var(--color-primary)" }}>
              حالا
            </span>
            <button
              onClick={() => router.push("/address")}
              className="flex items-center gap-1 min-w-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {currentAddress ? (
                <div className="text-right min-w-0">
                  <p className="text-xs font-black text-[var(--color-secondary)] truncate max-w-[180px]">
                    {currentAddress.label}
                  </p>
                  {currentAddress.full_address && (
                    <p className="text-[10px] text-[var(--color-muted)] truncate max-w-[180px] mt-0.5">
                      {currentAddress.full_address}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold text-[var(--color-primary)]">
                  أضف عنوانك الآن ←
                </p>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div className="w-5 flex-shrink-0" />
          </div>

          {/* الصف الثاني: شريط البحث */}
          <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-2xl px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#9CA3AF" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ابحث عن وجبة أو مطعم..."
              className="flex-1 text-sm bg-transparent outline-none text-[#1A1A1A] placeholder:text-[#9CA3AF]"
              dir="rtl"
            />
            {query && (
              <button
                onClick={() => handleSearch("")}
                className="text-[#9CA3AF] flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </header>

        <main className="pb-24 px-4">

          {/* ══════════════════════════════
              حالة البحث — لما في نص
          ══════════════════════════════ */}
          {isSearching && (
            <>
              {/* تابين */}
              <div className="flex gap-1 p-1 rounded-xl mt-4 mb-3" style={{ background: "#F1F1F1" }}>
                <button
                  onClick={() => setActiveTab("items")}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
                  style={{
                    background: activeTab === "items" ? "#FF6000" : "transparent",
                    color:      activeTab === "items" ? "#fff" : "#6B7280",
                  }}
                >
                  🍔 وجبات ({itemResults.length})
                </button>
                <button
                  onClick={() => setActiveTab("restaurants")}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
                  style={{
                    background: activeTab === "restaurants" ? "#FF6000" : "transparent",
                    color:      activeTab === "restaurants" ? "#fff" : "#6B7280",
                  }}
                >
                  🏪 مطاعم ({restaurantResults.length})
                </button>
              </div>

              {searching && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#FF6000] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* نتائج الوجبات */}
              {!searching && activeTab === "items" && (
                <div className="flex flex-col gap-3">
                  {itemResults.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF] text-center py-8">لا توجد وجبات مطابقة</p>
                  ) : itemResults.map((item) => {
                    const categoryName = item.categories?.name;
                    const dest = categoryName
                      ? `/restaurant/${item.restaurant_id}?category=${encodeURIComponent(categoryName)}`
                      : `/restaurant/${item.restaurant_id}`;
                    return (
                      <button
                        key={item.id}
                        onClick={() => router.push(dest)}
                        className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#F3F4F6] w-full text-right active:scale-[0.98] transition-transform"
                      >
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url ?? FALLBACK_IMG}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1A1A1A] truncate">{item.name}</p>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            {(item.restaurants as { name: string } | null)?.name ?? ""}
                          </p>
                          <p className="text-sm font-black text-[#FF6000] mt-1">{getEffectiveMealPrice(item)} ج.م</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* نتائج المطاعم */}
              {!searching && activeTab === "restaurants" && (
                <div className="flex flex-col">
                  {restaurantResults.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF] text-center py-8">لا توجد مطاعم مطابقة</p>
                  ) : restaurantResults.map((r, index) => (
                    <div key={r.id}>
                      <Link href={`/restaurant/${r.id}`} className="flex items-center gap-3 py-3">
                        <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden">
                          <Image src={r.image_url ?? FALLBACK_IMG} alt={r.name} fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-[var(--color-secondary)] truncate">{r.name}</p>
                          {r.description && (
                            <p className="text-sm text-[var(--color-muted)] truncate mt-0.5">{r.description}</p>
                          )}
                        </div>
                      </Link>
                      {index < restaurantResults.length - 1 && <div className="h-px bg-[#D1D5DB]" />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════
              الحالة العادية — query فارغ
          ══════════════════════════════ */}
          {!isSearching && (
            <>
              {/* ── بنر إعلاني ── */}
              {ads.length > 0 && (
                <section className="pt-4">
                  <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 140 }}>
                    {ads.map((ad, i) => {
                      const normalized = ad.link ? normalizeAdLink(ad.link) : null;
                      return (
                        <div key={ad.id}
                          onClick={() => {
                            if (!normalized) return;
                            if (normalized.isExternal) {
                              window.location.href = normalized.href;
                            } else {
                              router.push(normalized.href);
                            }
                          }}
                          className={`absolute inset-0 transition-opacity duration-500 cursor-pointer ${
                            i === adIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                          }`}
                          role={normalized ? "button" : undefined}
                          tabIndex={normalized ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (!normalized) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              normalized.isExternal
                                ? window.location.href = normalized.href
                                : router.push(normalized.href);
                            }
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ad.image_url ?? ""} alt="إعلان" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }} />
                        </div>
                      );
                    })}
                    {ads.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {ads.map((_, i) => (
                          <button key={i} onClick={() => setAdIndex(i)}
                            className="w-1.5 h-1.5 rounded-full transition-all"
                            style={{ background: i === adIndex ? "#FF6000" : "rgba(255,255,255,0.5)" }} />
                        ))}
                      </div>
                    )}
                  </div>
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
                      <div key={item.id} className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-[#F3F4F6]">
                        <div className="relative w-full h-28">
                          <Image src={item.image_url ?? FALLBACK_IMG} alt={item.name} fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }} />
                        </div>
                        <div className="p-2.5">
                          <p className="text-sm font-semibold text-[var(--color-secondary)] truncate">{item.name}</p>
                          <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">{item.restaurant_name ?? ""}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-xs text-[var(--color-muted)]">{item.rating ?? 0}</span>
                          </div>
                          {item.price != null && (
                            <p className="text-xs font-bold text-[var(--color-primary)] mt-1">{item.price} جنيه</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── كل المطاعم ── */}
              <section className="pt-5">
                <h2 className="text-base font-bold text-[var(--color-secondary)] mb-1">كل المطاعم</h2>

                {loading && (
                  <p className="text-sm text-[var(--color-muted)] text-center py-8">جاري التحميل...</p>
                )}
                {error && (
                  <p className="text-sm text-[var(--color-muted)] text-center py-8">{error}</p>
                )}
                {!loading && !error && restaurants.length === 0 && (
                  <p className="text-sm text-[var(--color-muted)] text-center py-8">لا توجد مطاعم متاحة حالياً</p>
                )}

                <div className="flex flex-col">
                  {restaurants.map((r, index) => {
                    const isBusy = r.status === "مشغول";
                    const isOpen = !isBusy && isRestaurantOpen(r);
                    const overlayLabel = isBusy ? "مشغول" : "مغلق";
                    const statusText   = isBusy ? "مشغول حالياً" : "مغلق حالياً";
                    const avgRating   = r.rating_avg != null ? Math.round(r.rating_avg * 10) / 10 : null;
                    const ratingCount = r.rating_count ?? 0;
                    return (
                      <div key={r.id}>
                        <div
                          onClick={() => isOpen ? router.push(`/restaurant/${r.id}`) : undefined}
                          className={`relative flex items-center gap-3 py-3 ${isOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden">
                            <Image src={r.image_url ?? FALLBACK_IMG} alt={r.name} fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }} />
                            {!isOpen && (
                              <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                                style={{ background: "rgba(0,0,0,0.6)" }}>
                                <span className="text-white font-black text-xs">{overlayLabel}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-bold truncate ${isOpen ? "text-[var(--color-secondary)]" : "text-[#9CA3AF]"}`}>{r.name}</p>
                            {r.description && (
                              <p className="text-sm text-[var(--color-muted)] truncate mt-0.5">{r.description}</p>
                            )}
                            {isOpen ? (
                              avgRating !== null ? (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                  <span className="text-sm font-semibold text-[var(--color-secondary)]">{avgRating}</span>
                                  <span className="text-xs text-[#9CA3AF]">• {ratingCount} تقييم</span>
                                </div>
                              ) : (
                                <span className="mt-1 block" style={{ color: "#94A3B8", fontSize: "11px" }}>لسه مافيش تقييمات</span>
                              )
                            ) : (
                              <p className="text-xs text-[#EF4444] mt-1">{statusText}</p>
                            )}
                          </div>
                        </div>
                        {index < restaurants.length - 1 && <div className="h-px bg-[#D1D5DB]" />}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

        </main>
      </div>

      <CartBar />

      <BottomNav />
    </div>
  );
}
