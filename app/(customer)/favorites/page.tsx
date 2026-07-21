"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearCart, addToCart } from "@/lib/cart";
import { formatCairoDate } from "@/lib/dateTime";
import BottomNav from "@/components/customer/BottomNav";

type FavItem = {
  id: string; name: string; price: number; qty: number;
  image_url: string | null; extras?: { name: string; price: number }[];
};

type FavoriteOrder = {
  id:              string;
  restaurant_id:   string;
  restaurant_name: string;
  name:            string;
  items:           FavItem[];
  total:           number;
  created_at:      string;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites,  setFavorites]  = useState<FavoriteOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("favorite_orders")
        .select("id, restaurant_id, restaurant_name, name, items, total, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFavorites((data as FavoriteOrder[]) ?? []);
      setLoading(false);
    });
  }, []);

  async function handleReorder(fav: FavoriteOrder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      document.cookie = `hala_return_to=${encodeURIComponent(JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY }))}; path=/; max-age=600; SameSite=Lax`;
      router.push("/login");
      return;
    }
    clearCart();
    fav.items.forEach((item) => {
      addToCart(fav.restaurant_id, fav.restaurant_name, {
        id:          item.id,
        name:        item.name,
        price:       item.price,
        qty:         item.qty,
        image_url:   item.image_url,
        description: null,
        extras:      item.extras ?? [],
      });
    });
    router.push("/cart?from=favorites");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("favorite_orders").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* Header */}
        <header className="bg-white px-4 pt-12 pb-4 border-b border-[var(--color-border)] sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <h1 className="text-lg font-black text-[var(--color-secondary)]">المفضلة</h1>
          </div>
        </header>

        <main className="pb-24 px-4 pt-5">

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-primary) transparent var(--color-primary) var(--color-primary)" }} />
            </div>
          )}

          {!loading && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <span className="text-6xl">♡</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد طلبات محفوظة</p>
              <p className="text-sm text-[var(--color-muted)]">احفظ طلباتك المفضلة لإعادتها بسرعة</p>
              <Link href="/restaurants"
                className="mt-2 px-6 py-2.5 rounded-2xl text-sm font-bold bg-[var(--color-primary)] text-white">
                تصفّح المطاعم
              </Link>
            </div>
          )}

          {!loading && favorites.length > 0 && (
            <div className="flex flex-col gap-3">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  onClick={() => handleReorder(fav)}
                  className="bg-white rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform border border-[var(--color-border)]"
                >
                  {/* اسم المطعم */}
                  <p className="font-black text-[#1A1A1A]">{fav.restaurant_name}</p>

                  {/* عدد الوجبات والسعر */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#6B7280]">{fav.items.length} وجبات</span>
                    <span className="w-1 h-1 rounded-full bg-[#6B7280]" />
                    <span className="text-xs font-bold text-[#1A1A1A]" dir="ltr">{fav.total} ج.م</span>
                  </div>

                  {/* أسماء الوجبات */}
                  <p className="text-xs text-[#6B7280] mt-1 truncate">
                    {fav.items.map((i) => i.name).join("، ")}
                  </p>

                  {/* التاريخ + حذف */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[#6B7280]">
                      {formatCairoDate(fav.created_at, { year: false })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(fav.id); }}
                      disabled={deletingId === fav.id}
                      className="text-xs text-red-500 font-bold disabled:opacity-60"
                    >
                      {deletingId === fav.id ? "..." : "حذف"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
