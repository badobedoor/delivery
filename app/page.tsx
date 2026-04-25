"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  { emoji: "🍔", name: "مطاعم" },
  { emoji: "🛒", name: "بقالة" },
  { emoji: "🥩", name: "لحوم ودواجن" },
  { emoji: "🥦", name: "خضار" },
  { emoji: "💊", name: "صيدلية" },
  { emoji: "⚡", name: "خدمات وتموين" },
  { emoji: "📦", name: "طلب مخصص" },
];

const shortcuts = [
  { emoji: "🧾", name: "طلباتك السابقة" },
  { emoji: "🎁", name: "اطلب واكسب" },
  { emoji: "🧁", name: "الحلويات" },
  { emoji: "🍽️", name: "وجبة اليوم" },
];

export default function HomePage() {
  const [defaultAddress, setDefaultAddress] = useState<{ label: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("addresses")
        .select("label")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .single();
      setDefaultAddress(data);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">

      {/* ── Header ── */}
      <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-1">

          {/* اسم حالا — يمين */}
          <span className="text-lg font-black text-[var(--color-primary)] tracking-tight">
            حالا
          </span>

          {/* العنوان — وسط */}
          <div>
            {defaultAddress ? (
              <button className="flex items-center gap-1 text-sm font-semibold text-[var(--color-secondary)]">
                {defaultAddress.label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : (
              <Link href="/address" className="text-sm font-semibold text-[var(--color-secondary)]">
                أضف عنوان التوصيل 📍
              </Link>
            )}
          </div>

          {/* أيقونة البحث — يسار */}
          <Link href="/search" className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
        </div>

      </header>

      <main className="pb-24">

        {/* ── Banner ── */}
        <section className="px-4 pt-4">
          <div className="w-full h-36 rounded-2xl overflow-hidden relative shadow-md">
            <Image
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=300&fit=crop"
              alt="إعلان"
              fill
              className="object-cover"
            />
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="px-4 pt-5">
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) =>
              cat.name === "مطاعم" ? (
                <Link
                  key={cat.name}
                  href="/restaurants"
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-full aspect-square rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-center text-2xl shadow-sm">
                    {cat.emoji}
                  </div>
                  <span className="text-xs font-medium text-[var(--color-secondary)] text-center leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ) : (
                <button
                  key={cat.name}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-full aspect-square rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-center text-2xl shadow-sm">
                    {cat.emoji}
                  </div>
                  <span className="text-xs font-medium text-[var(--color-secondary)] text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        {/* ── اختيارات لا تفوتك ── */}
        <section className="pt-6">
          <h2 className="text-base font-bold text-[var(--color-secondary)] px-4 mb-3">
            اختيارات لا تفوتك 🔥
          </h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {shortcuts.map((s) => (
              <button
                key={s.name}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20"
              >
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-light)]/30 border border-[var(--color-primary-light)] flex items-center justify-center text-3xl shadow-sm">
                  {s.emoji}
                </div>
                <span className="text-xs font-medium text-[var(--color-secondary)] text-center leading-tight">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </section>

      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">
        <button className="flex flex-col items-center gap-0.5 px-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold text-[var(--color-primary)]">الرئيسية</span>
        </button>

        <Link href="/search" className="flex flex-col items-center gap-0.5 px-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">بحث</span>
        </Link>

        <Link href="/account" className="flex flex-col items-center gap-0.5 px-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">حسابي</span>
        </Link>
      </nav>

    </div>
  );
}
