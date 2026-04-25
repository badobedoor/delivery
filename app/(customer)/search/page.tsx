"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
type Restaurant = { id: string; name: string; image_url: string | null; cuisine_type: string | null };
type Meal       = { id: string; name: string; price: number; image_url: string | null; restaurant_id: string; restaurants: { name: string } | null };

const TRENDING   = ["شاورما", "برجر", "كشري", "بيتزا", "كريب", "حلويات"];
const FALLBACK   = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,       setQuery]       = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [meals,       setMeals]       = useState<Meal[]>([]);
  const [searching,   setSearching]   = useState(false);

  /* ── Debounced search ── */
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRestaurants([]);
      setMeals([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const [{ data: restData }, { data: mealData }] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, image_url, cuisine_type")
          .ilike("name", `%${trimmed}%`)
          .eq("is_active", true)
          .limit(5),
        supabase
          .from("menu_items")
          .select("id, name, price, image_url, restaurant_id, restaurants(name)")
          .ilike("name", `%${trimmed}%`)
          .eq("is_active", true)
          .limit(10),
      ]);
      setRestaurants(restData ?? []);
      setMeals(mealData ?? []);
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const isTyping   = query.trim().length > 0;
  const hasResults = restaurants.length > 0 || meals.length > 0;
  const noResults  = isTyping && !searching && !hasResults;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-3 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="2" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مطعم أو وجبة..."
                className="flex-1 text-sm bg-transparent outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
              />
              {query && (
                <button onClick={() => setQuery("")} className="flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-muted)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* إلغاء */}
            <Link href="/" className="text-sm font-bold text-[var(--color-primary)] flex-shrink-0">
              إلغاء
            </Link>
          </div>
        </header>

        <main className="px-4 pt-5 pb-10">

          {/* ── الأكثر بحثاً (query فارغ) ── */}
          {!isTyping && (
            <section>
              <h2 className="text-sm font-black text-[var(--color-secondary)] mb-3">الأكثر بحثاً</h2>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setQuery(tag); inputRef.current?.focus(); }}
                    className="border border-[var(--color-border)] rounded-full px-4 py-2 text-sm text-[var(--color-secondary)] bg-white"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Searching spinner ── */}
          {isTyping && searching && (
            <div className="flex justify-center pt-16">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── نتايج ── */}
          {isTyping && !searching && hasResults && (
            <div className="flex flex-col gap-5">

              {/* مطاعم */}
              {restaurants.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-[var(--color-secondary)] mb-3">مطاعم</h2>
                  <div className="flex flex-col gap-2">
                    {restaurants.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/restaurant/${r.id}`)}
                        className="bg-white rounded-2xl p-3 flex items-center gap-3 text-right w-full"
                      >
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden">
                          <Image src={r.image_url ?? FALLBACK} alt={r.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--color-secondary)] truncate">{r.name}</p>
                          {r.cuisine_type && (
                            <p className="text-xs text-[var(--color-muted)] mt-0.5">{r.cuisine_type}</p>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* وجبات */}
              {meals.length > 0 && (
                <section>
                  <h2 className="text-sm font-black text-[var(--color-secondary)] mb-3">وجبات</h2>
                  <div className="flex flex-col gap-2">
                    {meals.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => router.push(`/restaurant/${m.restaurant_id}`)}
                        className="bg-white rounded-2xl p-3 flex items-center gap-3 text-right w-full"
                      >
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden">
                          <Image src={m.image_url ?? FALLBACK} alt={m.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--color-secondary)] truncate">{m.name}</p>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                            {m.restaurants?.name ?? ""}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-[var(--color-primary)] flex-shrink-0">{m.price} ج.م</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

          {/* ── لا توجد نتائج ── */}
          {noResults && (
            <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
              <span className="text-6xl">🔍</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا توجد نتائج</p>
              <p className="text-sm text-[var(--color-muted)]">جرب كلمة بحث مختلفة</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
