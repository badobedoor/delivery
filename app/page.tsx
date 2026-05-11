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
  const [defaultAddress, setDefaultAddress] = useState<{ full_address: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("addresses")
        .select("full_address")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .single();
      setDefaultAddress(data);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">

      <main className="pb-24">

        {/* ── Hero Card (replaces Header + Banner) ── */}
        <section className="px-4 pt-10">
          <div
            className="w-full rounded-3xl px-5 pt-5 pb-4 flex flex-col gap-3"
            style={{ background: "#F5EDE6" }}
          >
            {/* Address row — top */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: "#9CA3AF" }}>التوصيل إلى</span>
              <button className="flex items-center gap-1 self-start">
                <span className="text-sm font-semibold text-[var(--color-secondary)] text-right max-w-[220px] truncate">
                  {defaultAddress?.full_address || "اختر عنوانك"}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-secondary)" strokeWidth="2.5" className="flex-shrink-0">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* Welcome + image row — bottom */}
            <div className="flex items-end justify-between gap-2">
              <div className="flex flex-col gap-0.5 pb-1">
                <p className="text-xl font-black leading-snug text-[var(--color-secondary)]">
                  أهلاً بك في
                </p>
                <p className="text-2xl font-black leading-snug text-[var(--color-primary)]">
                  حالاً دلفري
                </p>
              </div>
              <div className="flex-shrink-0">
                <Image
                  src="/customerHomePage.png"
                  alt="حالا دلفري"
                  width={130}
                  height={130}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Service Cards ── */}
        <section className="px-4 pt-4">

          {/* Row 1: 2 large cards — text right, image left (RTL) */}
          <div className="flex gap-3 mb-3">
            {[
              { name: "طعام",          seed: "burger",  emoji: "🍔" },
              { name: "طلبات خالصة",   seed: "package", emoji: "📦" },
            ].map(({ name, seed, emoji }) => (
              <button
                key={name}
                className="flex-1 rounded-3xl cursor-pointer transition-all active:scale-[0.97] overflow-hidden"
                style={{ background: "#F1F1F1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              >
                <div className="flex items-center justify-between px-4 py-4 h-24 gap-2">
                  {/* Text — right (start in RTL) */}
                  <span className="text-sm font-bold text-[var(--color-secondary)] text-right leading-snug flex-1">
                    {name}
                  </span>
                  {/* Image — left (end in RTL) */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://picsum.photos/seed/${seed}/80/80`}
                      alt={name}
                      className="w-16 h-16 object-contain rounded-2xl"
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Row 2: 3 small equal cards */}
          <div className="flex gap-3">
            {[
              { name: "البقالة",  seed: "vegetables" },
              { name: "الصحة",   seed: "medicine"   },
              { name: "الخدمات", seed: "tools"       },
            ].map(({ name, seed }) => (
              <button
                key={name}
                className="flex-1 rounded-3xl cursor-pointer transition-all active:scale-[0.97] overflow-hidden"
                style={{ background: "#F1F1F1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              >
                <div className="flex flex-col items-center justify-center px-2 py-3 h-20 gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://picsum.photos/seed/${seed}/60/60`}
                    alt={name}
                    className="w-10 h-10 object-contain rounded-xl"
                  />
                  <span className="text-[11px] font-bold text-[var(--color-secondary)] text-center leading-tight">
                    {name}
                  </span>
                </div>
              </button>
            ))}
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
        <button className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold text-[var(--color-primary)]">الرئيسية</span>
        </button>

        <Link href="/search" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">بحث</span>
        </Link>

        <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">المفضلة</span>
        </Link>

        <Link href="/account" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-medium text-[var(--color-muted)]">حسابي</span>
        </Link>
      </nav>

    </div>
  );
}
