"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/* ── بيانات وهمية ── */
const restaurant = {
  name: "بيت البرجر",
  desc: "برجر أمريكي وسندويتشات مميزة بأجود الخامات",
  rating: 4.3,
  reviews: 59,
  coverImg: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=300&fit=crop",
};

const categories = ["الكشري", "الطواجن"];

const meals: Record<string, { id: number; name: string; desc: string; price: number; img: string; hasExtras: boolean }[]> = {
  "الكشري": [
    { id: 5, name: "كشري كبير", desc: "أرز ومكرونة وعدس بصوص الطماطم والدقة", price: 25, img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop", hasExtras: false },
    { id: 6, name: "كشري وسط",  desc: "حجم وسط مثالي لشخص واحد",              price: 18, img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop", hasExtras: true  },
  ],
  "الطواجن": [
    { id: 7, name: "طاجن لحمة بالخضار", desc: "لحم بقري مع خضروات طازجة في طاجن فخاري", price: 80, img: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop", hasExtras: true  },
    { id: 8, name: "طاجن فراخ",          desc: "دجاج بالبصل والطماطم والتوابل الشرقية",  price: 70, img: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop", hasExtras: false },
  ],
};

function formatPrice(p: number) {
  return `${p} ج`;
}

/* عداد الكمية للوجبات بدون إضافات */
function QuantityCounter({ price }: { price: number }) {
  const [qty, setQty] = useState(0);
  return (
    <div className="flex items-center gap-2 mt-2">
      {qty === 0 ? (
        <button
          onClick={() => setQty(1)}
          className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQty((q) => Math.max(0, q - 1))}
            className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="text-sm font-bold text-[var(--color-secondary)] w-4 text-center">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      )}
      {qty > 0 && (
        <span className="text-xs text-[var(--color-muted)]">{formatPrice(price * qty)}</span>
      )}
    </div>
  );
}

export default function RestaurantPage() {
  const [activeTab, setActiveTab] = useState("الكشري");

  /* وهمي: عدد عناصر السلة والسعر الكلي */
  const cartItems = 2;
  const cartTotal = "١١٠ ج";

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header: صورة الغلاف ── */}
        <div className="relative w-full h-52">
          <Image
            src={restaurant.coverImg}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* زرار الرجوع — يمين (RTL) */}
          <Link
            href="/restaurants"
            className="absolute top-10 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          {/* اسم المطعم */}
          <div className="absolute bottom-3 right-4 left-4">
            <h1 className="text-xl font-black text-white drop-shadow">{restaurant.name}</h1>
          </div>
        </div>

        <main className="pb-32">

          {/* ── معلومات المطعم ── */}
          <section className="bg-white px-4 pt-4 pb-0 border-b border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-muted)]">{restaurant.desc}</p>

            <div className="flex items-center gap-1.5 mt-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-semibold text-[var(--color-secondary)]">{restaurant.rating}</span>
              <span className="text-xs text-[var(--color-muted)]">({restaurant.reviews} تقييم)</span>
            </div>

            {/* تابات المعلومات — نفس التصميم بدون فرق */}
            <div className="flex mt-3">
              <button className="flex-1 text-sm font-medium text-[var(--color-secondary)] py-2.5 border-b-2 border-[var(--color-border)] text-center">
                معلومات المطعم
              </button>
              <button className="flex-1 text-sm font-medium text-[var(--color-secondary)] py-2.5 border-b-2 border-[var(--color-border)] text-center">
                تقييمات
              </button>
            </div>
          </section>

          {/* ── تابات الأقسام ── */}
          <div className="bg-white sticky top-0 z-10 border-b border-[var(--color-border)]">
            <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === cat
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-secondary)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── قائمة الوجبات ── */}
          <section className="px-4 pt-3 bg-white">
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {meals[activeTab]?.map((meal) =>
                meal.hasExtras ? (
                  /* وجبة بإضافات: تفتح صفحة جديدة */
                  <Link key={meal.id} href={`/meal/${meal.id}`} className="flex items-start gap-3 py-3">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image src={meal.img} alt={meal.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{meal.name}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2 leading-relaxed">{meal.desc}</p>
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-1.5">{formatPrice(meal.price)}</p>
                    </div>
                  </Link>
                ) : (
                  /* وجبة بدون إضافات: عداد مباشر */
                  <div key={meal.id} className="flex items-start gap-3 py-3">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image src={meal.img} alt={meal.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{meal.name}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2 leading-relaxed">{meal.desc}</p>
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-1.5">{formatPrice(meal.price)}</p>
                      <QuantityCounter price={meal.price} />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

        </main>

        {/* ── Sticky Bottom Bar ── */}
        {cartItems > 0 && (
          <div className="fixed bottom-0 right-0 left-0 z-20">
            <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-2">
              <button className="w-full bg-[var(--color-primary)] rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform">
                {/* يمين: عداد + نص */}
                <div className="flex items-center gap-2">
                  <span className="bg-[var(--color-primary-dark)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    {cartItems}
                  </span>
                  <span className="text-white text-base font-bold">سلة المشتريات</span>
                </div>

                {/* يسار: السعر */}
                <span className="text-white text-lg font-black">{cartTotal}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
