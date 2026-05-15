"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Rating = {
  id: string;
  food_quality: number;
  value_for_money: number;
  packaging: number;
  comment: string | null;
  created_at: string;
  users: { name: string | null } | null;
};

type Restaurant = {
  id: string;
  name: string;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

function calcAvg(arr: Rating[], key: keyof Pick<Rating, "food_quality" | "value_for_money" | "packaging">): string {
  if (!arr.length) return "0.0";
  return (arr.reduce((s, r) => s + Number(r[key]), 0) / arr.length).toFixed(1);
}

export default function RestaurantReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const [ratings,    setRatings]    = useState<Rating[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      const [restRes, ratingsRes] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, image_url, rating_avg, rating_count")
          .eq("id", id)
          .single(),
        supabase
          .from("restaurant_ratings")
          .select("id, food_quality, value_for_money, packaging, comment, created_at, users(name)")
          .eq("restaurant_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (restRes.data) setRestaurant(restRes.data as Restaurant);
      if (!ratingsRes.error) setRatings((ratingsRes.data ?? []) as unknown as Rating[]);
      setLoading(false);
    }
    load();
  }, [id]);

  const avgFood    = calcAvg(ratings, "food_quality");
  const avgValue   = calcAvg(ratings, "value_for_money");
  const avgPacking = calcAvg(ratings, "packaging");

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
            <h1 className="text-base font-black text-[#1A1A1A]">التقييمات</h1>
            <div className="w-9" />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center pt-24">
            <div className="w-6 h-6 border-2 border-[#FF6000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ratings.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center px-4">
            <span className="text-6xl">⭐</span>
            <p className="text-base font-bold text-[#1A1A1A]">لا يوجد تقييمات بعد</p>
            <p className="text-sm text-[#6B7280]">كن أول من يقيّم هذا المطعم</p>
          </div>
        ) : (
          <main className="px-4 pt-4 pb-10 flex flex-col gap-4">

            {/* ملخص */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-4xl font-black text-[#1A1A1A]">
                    {restaurant?.rating_avg?.toFixed(1) ?? avgFood}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    استناداً إلى {restaurant?.rating_count ?? ratings.length} تقييم
                  </p>
                </div>
                {restaurant?.image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={restaurant.image_url} alt={restaurant.name} className="w-14 h-14 rounded-2xl object-cover" />
                )}
              </div>

              {[
                { label: "جودة الطعام",        avg: avgFood    },
                { label: "القيمة مقابل السعر", avg: avgValue   },
                { label: "تغليف الطلب",        avg: avgPacking },
              ].map(({ label, avg }) => (
                <div key={label} className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#1A1A1A]">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} style={{ color: Number(avg) >= s ? "#FBBF24" : "#D1D5DB", fontSize: 16 }}>★</span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-[#1A1A1A]">{avg}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* قائمة التقييمات */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <p className="text-base font-black text-[#1A1A1A] p-4 border-b border-gray-100">
                التقييمات ({ratings.length})
              </p>
              {ratings.map((r) => {
                const overall = ((r.food_quality + r.value_for_money + r.packaging) / 3).toFixed(1);
                return (
                  <div key={r.id} className="p-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6B7280]">{r.users?.name ?? "مجهول"}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-[#1A1A1A]">{overall}</span>
                        <span style={{ color: "#FBBF24" }}>⭐</span>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-[#1A1A1A] mt-1 leading-relaxed">{r.comment}</p>
                    )}
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      {new Date(r.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>

          </main>
        )}

      </div>
    </div>
  );
}
