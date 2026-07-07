"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/customer/BottomNav";
import ClosedScreen from "@/components/customer/ClosedScreen";
import { supabase } from "@/lib/supabase";
import { normalizeAdLink } from "@/lib/adLink";
import InstallCard from "@/components/customer/InstallCard";

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

function isOpenNow(start: string, end: string): boolean {
  const now   = new Date();
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const current  = cairo.getHours() * 60 + cairo.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  if (endMin < startMin) return current >= startMin || current < endMin;
  return current >= startMin && current < endMin;
}

export default function HomePage() {
  const router = useRouter();
  if (typeof window !== "undefined") console.log("[TIMELINE]", performance.now().toFixed(1), "ms - HomePage mount (rendered)");
  const [defaultAddress, setDefaultAddress] = useState<{ full_address: string; label: string } | null>(null);
  const [isOpen,    setIsOpen]    = useState<boolean | null>(null);
  const [workStart, setWorkStart] = useState("");
  const [workEnd,   setWorkEnd]   = useState("");
  const [ads,       setAds]       = useState<{ id: string; image_url: string; link: string | null }[]>([]);
  const [adIndex,   setAdIndex]   = useState(0);
  const adTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Auto-slide الإعلانات */
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setAdIndex((p) => (p + 1) % ads.length), 4000);
    return () => clearInterval(timer);
  }, [ads.length]);

  useEffect(() => {
    async function load() {
      /* جيب إعدادات أوقات العمل */
      const { data: settings } = await supabase
        .from("settings")
        .select("work_start_time, work_end_time")
        .single();

      if (settings?.work_start_time && settings?.work_end_time) {
        setWorkStart(settings.work_start_time);
        setWorkEnd(settings.work_end_time);
        setIsOpen(isOpenNow(settings.work_start_time, settings.work_end_time));
      } else {
        setIsOpen(true); /* لو مفيش إعدادات — افتح */
      }

      /* جيب الإعلانات */
      const now = new Date().toISOString();
      const { data: adsData } = await supabase
        .from("advertisements")
        .select("id, image_url, link")
        .eq("is_active", true)
        .eq("page", "الرئيسية")
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("order_index", { ascending: true });
      setAds(adsData ?? []);

      /* جيب العنوان الافتراضي */
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("addresses")
        .select("full_address, label")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .single();
      setDefaultAddress(data);
    }
    load();
  }, []);

  /* لو التحميل لسه — اعرض شاشة بيضاء */
  if (isOpen === null) return <div className="min-h-screen bg-[#0F172A]" />;

  /* لو مغلق — اعرض شاشة الإغلاق */
  if (!isOpen && workStart && workEnd) {
    return <ClosedScreen openTime={workStart} closeTime={workEnd} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">

      <main className="pb-24">

        {/* ── Hero Card (replaces Header + Banner) ── */}
        <section className="px-4 pt-10">
          <div
            className="w-full rounded-3xl px-5 pt-3 pb-3 flex flex-col gap-2"
            style={{ background: "#F5EDE6" }}
          >
            {/* Address row — top */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: "#9CA3AF" }}>التوصيل إلى</span>
              <Link href="/address" className="flex items-center gap-1 self-start">
                {defaultAddress ? (
                  <div className="text-right min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)] truncate max-w-[220px]">
                      {defaultAddress.label}
                    </p>
                    {defaultAddress.full_address && (
                      <p className="text-xs text-[var(--color-muted)] truncate max-w-[220px] mt-0.5">
                        {defaultAddress.full_address}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-[var(--color-secondary)]">
                    اختر عنوانك
                  </span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-secondary)" strokeWidth="2.5" className="flex-shrink-0">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Link>
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
                  width={100}
                  height={100}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Banner إعلاني ── */}
        {ads.length > 0 && (
          <section className="px-4 pt-4">
            <div className="relative w-full overflow-hidden rounded-2xl"
              style={{ height: 140 }}>
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
                    <img src={ad.image_url} alt="إعلان" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }} />
                  </div>
                );
              })}
              {/* Dots */}
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

        {/* ── Install App Card ── */}
        <InstallCard />

        {/* ── Service Cards ── */}
        <section className="px-4 pt-4">

          {/* Row 1: 2 large cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { name: "طعام",        image: "/Restaurants.png"  },
              { name: "طلبات خاصة", image: "/Special_order.png" },
            ].map(({ name, image }) => (
              <button
                key={name}
                onClick={() => name === "طعام" ? router.push("/restaurants") : undefined}
                className="relative rounded-2xl transition-all active:scale-[0.97] overflow-hidden flex items-center justify-between px-4 group"
                style={{ background: "#F1F1F1", height: "130px" }}
              >
                <p className="font-black text-[#1A1A1A] text-right" style={{ fontSize: "clamp(16px, 4vw, 24px)" }}>
                  {name}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={name} className="w-24 h-24 object-contain flex-shrink-0" />
                {name !== "طعام" && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 group-active:bg-black/50 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white font-black text-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200">قريباً</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Row 2: 3 small cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "البقالة",  image: "/Grocery.png"  },
              { name: "الصحة",   image: "/Health.png"   },
              { name: "الخدمات", image: "/Services.png" },
            ].map(({ name, image }) => (
              <button
                key={name}
                className="relative rounded-2xl transition-all active:scale-[0.97] overflow-hidden group"
                style={{ background: "#F1F1F1", aspectRatio: "4/3" }}
              >
                <p className="absolute top-3 right-3 text-sm font-black text-[#1A1A1A] z-10 leading-tight text-right">
                  {name}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={name} className="absolute bottom-0 left-0 w-2/3 h-2/3 object-contain" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 group-active:bg-black/50 transition-all duration-200 flex items-center justify-center">
                  <span className="text-white font-black text-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200">قريباً</span>
                </div>
              </button>
            ))}
          </div>
        </section>



      </main>

      <BottomNav />

    </div>
  );
}
