"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RestaurantInfo = {
  name:         string;
  description:  string | null;
  image_url:    string | null;
  avg_rating:   number | null;
  rating_count: number | null;
  opens_at:     string | null;
  closes_at:    string | null;
  status:       string | null;
  address:      string | null;
};

function getStatusLabel(status: string | null): { label: string; color: string } {
  switch (status) {
    case "active":      return { label: "متاح",   color: "#22C55E" };
    case "busy":        return { label: "مشغول",  color: "#F97316" };
    case "closed":      return { label: "مغلق",   color: "#EF4444" };
    case "maintenance": return { label: "صيانة",  color: "#94A3B8" };
    default:            return { label: "متاح",   color: "#22C55E" };
  }
}

function formatHours(opens: string | null, closes: string | null) {
  if (!opens || !closes) return "—";
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "ص" : "م";
    const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
  };
  return `${fmt(opens)} — ${fmt(closes)}`;
}

export default function RestaurantInfoPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("restaurants")
        .select("name, description, image_url, avg_rating, rating_count, opens_at, closes_at, status, address")
        .eq("id", id)
        .single();
      setRestaurant(data ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link
              href={`/restaurant/${id}`}
              className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[#1A1A1A]">معلومات المطعم</h1>
            <div className="w-9" />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center pt-24">
            <div className="w-6 h-6 border-2 border-[#FF6000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !restaurant ? (
          <div className="flex items-center justify-center pt-24">
            <p className="text-sm text-[#9CA3AF]">تعذّر تحميل المعلومات</p>
          </div>
        ) : (
          <main className="px-4 pt-4 pb-10 flex flex-col gap-3">

            {/* اسم المطعم والوصف */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
              {restaurant.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 text-3xl">
                  🍽️
                </div>
              )}
              <div className="flex-1 text-right min-w-0">
                <p className="text-base font-black text-[#1A1A1A]">{restaurant.name}</p>
                {restaurant.description && (
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{restaurant.description}</p>
                )}
              </div>
            </div>

            {/* التفاصيل */}
            <div className="bg-white rounded-2xl divide-y divide-gray-100">

              {/* حالة المطعم */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm font-bold"
                  style={{ color: getStatusLabel(restaurant.status).color }}>
                  {getStatusLabel(restaurant.status).label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B7280]">حالة المطعم</span>
                  <span>🏪</span>
                </div>
              </div>

              {/* التقييم */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    {restaurant.avg_rating?.toFixed(1) ?? "—"}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    • {restaurant.rating_count ?? 0} تقييماً
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B7280]">التقييم</span>
                  <span>😊</span>
                </div>
              </div>

              {/* العنوان */}
              {restaurant.address && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-sm text-[#1A1A1A]">{restaurant.address}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6B7280]">منطقة المطعم</span>
                    <span>📍</span>
                  </div>
                </div>
              )}

              {/* ساعات العمل */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-[#1A1A1A]">
                  {formatHours(restaurant.opens_at, restaurant.closes_at)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B7280]">ساعات العمل</span>
                  <span>🕐</span>
                </div>
              </div>

            </div>
          </main>
        )}

      </div>
    </div>
  );
}
