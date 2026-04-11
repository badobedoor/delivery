"use client";

import Link from "next/link";
import { useRef, useState } from "react";

/* ── بيانات وهمية ── */
const trending = ["بيتزا", "كشري", "برجر", "شاورما", "حلويات النصر", "كريب"];

const allItems = [
  { id: 1, emoji: "🍔", name: "برجر كلاسيك",      restaurant: "بيت البرجر"   },
  { id: 2, emoji: "🍔", name: "برجر دبل تشيز",    restaurant: "بيت البرجر"   },
  { id: 3, emoji: "🍕", name: "بيتزا مارجريتا",   restaurant: "ليالي بيتزا"  },
  { id: 4, emoji: "🍕", name: "بيتزا بيبروني",    restaurant: "ليالي بيتزا"  },
  { id: 5, emoji: "🌯", name: "شاورما لحم",        restaurant: "شاورما الشام" },
  { id: 6, emoji: "🌯", name: "شاورما دجاج",       restaurant: "شاورما الشام" },
  { id: 7, emoji: "🍜", name: "كشري كبير",         restaurant: "كشري التحرير" },
  { id: 8, emoji: "🍜", name: "كشري وسط",          restaurant: "كشري التحرير" },
  { id: 9, emoji: "🧁", name: "حلويات النصر كريب", restaurant: "حلويات النصر" },
  { id: 10, emoji: "🥞", name: "كريب نوتيلا",      restaurant: "كريب هاوس"   },
];

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--color-primary)] font-bold">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPage() {
  const [query, setQuery]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? allItems.filter(
        (item) =>
          item.name.includes(query) ||
          item.restaurant.includes(query)
      )
    : [];

  const isTyping   = query.trim().length > 0;
  const noResults  = isTyping && results.length === 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-3 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
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
            <Link href="/"
              className="text-sm font-bold text-[var(--color-primary)] flex-shrink-0">
              إلغاء
            </Link>
          </div>
        </header>

        <main className="px-4 pt-5 pb-24">

          {/* ── الأكثر بحثاً ── */}
          {!isTyping && (
            <section>
              <h2 className="text-sm font-black text-[var(--color-secondary)] mb-3">
                الأكثر بحثاً
              </h2>
              <div className="flex flex-wrap gap-2">
                {trending.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setQuery(tag); inputRef.current?.focus(); }}
                    className="flex items-center gap-1.5 bg-white border border-[var(--color-border)] rounded-full px-3 py-1.5 text-sm text-[var(--color-secondary)]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-muted)" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── نتائج البحث ── */}
          {isTyping && !noResults && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
              {results.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < results.length - 1 ? "border-b border-[var(--color-border)]" : ""
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-secondary)]">
                      {highlight(item.name, query)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {highlight(item.restaurant, query)}
                    </p>
                  </div>
                </div>
              ))}
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

        {/* ── Bottom Navigation ── */}
        <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-muted)" stroke="none">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">الرئيسية</span>
          </Link>

          {/* بحث — active */}
          <button className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-primary)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-[10px] font-semibold text-[var(--color-primary)]">بحث</span>
          </button>

          <Link href="/account" className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-muted)" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">حسابي</span>
          </Link>
        </nav>

      </div>
    </div>
  );
}
