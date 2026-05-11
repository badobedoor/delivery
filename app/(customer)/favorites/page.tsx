"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";

type FavoriteOrder = {
  id:              string;
  restaurant_id:   string;
  restaurant_name: string;
  name:            string;
  items:           CartItem[];
  total:           number;
  created_at:      string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function HeartFilled() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites,   setFavorites]   = useState<FavoriteOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

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
    setReorderingId(fav.id);
    saveCart({ restaurantId: fav.restaurant_id, restaurantName: fav.restaurant_name, items: fav.items });
    router.push("/cart");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("favorite_orders").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* Header */}
        <header className="bg-white px-4 pt-12 pb-4 border-b border-[var(--color-border)] sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <HeartFilled />
            <h1 className="text-lg font-black text-[var(--color-secondary)]">المفضلة</h1>
          </div>
        </header>

        <main className="pb-24 px-4 pt-5">

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-primary) transparent var(--color-primary) var(--color-primary)" }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-[var(--color-secondary)]">لا توجد طلبات محفوظة بعد</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">احفظ طلباتك المفضلة لإعادتها بسرعة</p>
              </div>
              <Link href="/restaurants"
                className="mt-2 px-6 py-2.5 rounded-2xl text-sm font-bold"
                style={{ background: "var(--color-primary)", color: "#fff" }}>
                تصفّح المطاعم
              </Link>
            </div>
          )}

          {/* Favorites list */}
          {!loading && favorites.length > 0 && (
            <div className="flex flex-col gap-3">
              {favorites.map((fav) => {
                const itemCount = fav.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <div key={fav.id}
                    className="bg-white rounded-2xl border border-[var(--color-border)] p-4 flex flex-col gap-3">

                    {/* Top row: name + date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--color-secondary)] truncate">
                          {fav.restaurant_name}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {itemCount} {itemCount === 1 ? "منتج" : "منتجات"} · {fav.total} ج.م
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] flex-shrink-0 pt-0.5">
                        {fmtDate(fav.created_at)}
                      </p>
                    </div>

                    {/* Items preview */}
                    <div className="flex flex-col gap-1">
                      {fav.items.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-xs text-[var(--color-muted)] truncate">
                          {item.qty}× {item.name}
                          {item.extras && item.extras.length > 0 && (
                            <span className="text-[10px]"> (+{item.extras.map(e => e.name).join(", ")})</span>
                          )}
                        </p>
                      ))}
                      {fav.items.length > 3 && (
                        <p className="text-[11px] text-[var(--color-muted)]">
                          +{fav.items.length - 3} المزيد
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleReorder(fav)}
                        disabled={!!reorderingId}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity active:scale-[0.98] disabled:opacity-60"
                        style={{ background: "var(--color-primary)", color: "#fff" }}>
                        {reorderingId === fav.id ? "جارٍ الإضافة..." : "إعادة الطلب"}
                      </button>
                      <button
                        onClick={() => handleDelete(fav.id)}
                        disabled={deletingId === fav.id}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors active:scale-[0.98] disabled:opacity-60"
                        style={{ color: "#EF4444", borderColor: "#FECACA" }}>
                        {deletingId === fav.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-muted)" stroke="none">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">الرئيسية</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-0.5 px-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">بحث</span>
          </Link>
          <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color: "#EF4444" }}>المفضلة</span>
          </Link>
          <Link href="/account" className="flex flex-col items-center gap-0.5 px-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">حسابي</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
