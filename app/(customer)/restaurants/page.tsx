"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import CartBar from "@/components/customer/CartBar";
import BottomNav from "@/components/customer/BottomNav";

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

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  restaurant_id: string;
  restaurants: { name: string } | null;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop";

export default function RestaurantsPage() {
  const address = "المعادي، القاهرة";

  /* ── Page data ── */
  const [restaurants,   setRestaurants]   = useState<Restaurant[]>([]);
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  /* ── Search state ── */
  const [query,             setQuery]             = useState("");
  const [activeTab,         setActiveTab]         = useState<"items" | "restaurants">("items");
  const [itemResults,       setItemResults]       = useState<MenuItem[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [searching,         setSearching]         = useState(false);

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

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setItemResults([]);
      setRestaurantResults([]);
      return;
    }

    setSearching(true);

    const [itemsRes, restaurantsRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, price, image_url, restaurant_id, restaurants(name)")
        .ilike("name", `%${q}%`)
        .eq("is_active", true)
        .limit(20),
      supabase
        .from("restaurants")
        .select("id, name, description, image_url, cover_image_url")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .eq("is_active", true)
        .limit(20),
    ]);

    setItemResults((itemsRes.data ?? []) as unknown as MenuItem[]);
    setRestaurantResults((restaurantsRes.data ?? []) as Restaurant[]);
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
            <button className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-semibold text-[var(--color-secondary)] truncate max-w-[200px]">
                {address || "اختر عنوانك"}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.5" className="flex-shrink-0">
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
                  ) : itemResults.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#F3F4F6]">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url ?? FALLBACK_IMG}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1A1A1A] truncate">{item.name}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {(item.restaurants as { name: string } | null)?.name ?? ""}
                        </p>
                        <p className="text-sm font-black text-[#FF6000] mt-1">{item.price} ج.م</p>
                      </div>
                    </div>
                  ))}
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
                          <Image src={r.image_url ?? FALLBACK_IMG} alt={r.name} fill className="object-cover" />
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
              {advertisement?.image_url && (
                <section className="pt-4">
                  {advertisement.link ? (
                    <Link href={advertisement.link} className="block">
                      <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                        <Image src={advertisement.image_url} alt="إعلان" fill className="object-cover" priority />
                      </div>
                    </Link>
                  ) : (
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                      <Image src={advertisement.image_url} alt="إعلان" fill className="object-cover" priority />
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
                      <div key={item.id} className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-[#F3F4F6]">
                        <div className="relative w-full h-28">
                          <Image src={item.image_url ?? FALLBACK_IMG} alt={item.name} fill className="object-cover" />
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
                  {restaurants.map((r, index) => (
                    <div key={r.id}>
                      <Link href={`/restaurant/${r.id}`} className="flex items-center gap-3 py-3">
                        <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden">
                          <Image src={r.image_url ?? FALLBACK_IMG} alt={r.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-[var(--color-secondary)] truncate">{r.name}</p>
                          {r.description && (
                            <p className="text-sm text-[var(--color-muted)] truncate mt-0.5">{r.description}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm font-semibold text-[var(--color-secondary)]">4.5</span>
                            <span className="text-xs text-[#9CA3AF]">• 230 تقييم</span>
                          </div>
                        </div>
                      </Link>
                      {index < restaurants.length - 1 && <div className="h-px bg-[#D1D5DB]" />}
                    </div>
                  ))}
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
