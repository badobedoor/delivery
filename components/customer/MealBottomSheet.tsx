"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { addToCart, clearCart, CartItem } from "@/lib/cart";
import ConfirmModal from "@/components/customer/ConfirmModal";

/* ── Types ── */
interface Extra  { id: number; name: string; price: number }
interface Size   { id: number; name: string; price?: number }
interface Meal   {
  id: number;
  name: string;
  basePrice: number;
  img: string;
  extras?: Extra[];
  sizes?: Size[];
}

interface Props {
  meal: Meal;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
}

/* ── Dummy data (used when previewing the component standalone) ── */
export const sampleMeal: Meal = {
  id: 1,
  name: "كشري كبير",
  basePrice: 25,
  img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=500&fit=crop",
  extras: [
    { id: 1, name: "عدس",         price: 5 },
    { id: 2, name: "تقلية",        price: 5 },
    { id: 3, name: "حمص",         price: 5 },
    { id: 4, name: "خبز محمص",   price: 5 },
    { id: 5, name: "صوص طماطم",  price: 5 },
  ],
  sizes: [
    { id: 1, name: "وسط" },
    { id: 2, name: "كبير" },
  ],
};

/* ── Component ── */
export default function MealBottomSheet({ meal, onClose, restaurantId, restaurantName }: Props) {
  const [qty,            setQty]            = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [selectedSize,   setSelectedSize]   = useState<number | null>(null);
  const [showNote,       setShowNote]       = useState(false);
  const [note,           setNote]           = useState("");
  const [conflictMsg,    setConflictMsg]    = useState<string | null>(null);
  const pendingItem = useRef<CartItem | null>(null);

  useEffect(() => {
    if (meal.sizes && meal.sizes.length > 0) {
      setSelectedSize(meal.sizes[0].id);
    }
  }, []);

  const extrasTotal = selectedExtras.reduce((sum, id) => {
    const extra = meal.extras?.find((e) => e.id === id);
    return sum + (extra?.price ?? 0);
  }, 0);

  const hasSizes    = !!(meal.sizes && meal.sizes.length > 0);
  const activePrice = hasSizes
    ? (selectedSize !== null ? (meal.sizes!.find((s) => s.id === selectedSize)?.price ?? 0) : 0)
    : meal.basePrice;
  const minSizePrice = hasSizes
    ? Math.min(...meal.sizes!.map((s) => s.price ?? meal.basePrice))
    : meal.basePrice;

  const total = (activePrice + extrasTotal) * qty;

  function toggleExtra(id: number) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  function handleAddToCart() {
    const sizeObj = meal.sizes?.find((s) => s.id === selectedSize);
    const cartItem = {
      id: String(meal.id),
      name: meal.name,
      price: hasSizes ? 0 : meal.basePrice,
      qty,
      image_url: meal.img,
      description: null,
      size: selectedSize && sizeObj
        ? { name: sizeObj.name, price: sizeObj.price ?? 0 }
        : undefined,
      extras: selectedExtras.map((id) => {
        const extra = meal.extras!.find((e) => e.id === id)!;
        return { name: extra.name, price: extra.price };
      }),
    };
    const result = addToCart(restaurantId, restaurantName, cartItem);
    if (result.conflict) {
      pendingItem.current = cartItem;
      setConflictMsg(`سلتك فيها طلب من ${result.conflictName}، هل تريد مسحها والبدء من جديد؟`);
    } else {
      onClose();
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── 1. صورة الوجبة ── */}
        <div className="relative w-full h-52 flex-shrink-0">
          <Image
            src={meal.img}
            alt={meal.name}
            fill
            className="object-cover"
            priority
          />
          {/* تدرج للأسفل */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* زرار الإغلاق — يسار */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            aria-label="إغلاق"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* ── 2. معلومات الوجبة ── */}
          <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-start justify-between gap-3">
              {/* الاسم والسعر — يمين */}
              <div>
                <h2 className="text-lg font-black text-[var(--color-secondary)]">
                  {meal.name}
                </h2>
                <p className="text-base font-bold text-[var(--color-primary)] mt-1">
                  {hasSizes && selectedSize === null
                    ? `يبدأ من ${minSizePrice} ج.م`
                    : `${activePrice} ج.م`
                  }
                </p>
              </div>

              {/* عداد الكمية — يسار */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-secondary)" strokeWidth="2.5">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <span className="text-base font-bold text-[var(--color-secondary)] w-5 text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── 3. الحجم ── */}
          {meal.sizes && meal.sizes.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-secondary)] mb-3">
                إختيارك من الحجم:
                <span className="text-[var(--color-muted)] font-normal"> (اختر 1)</span>
              </h3>
              <div className="flex flex-col gap-3">
                {meal.sizes.map((size) => {
                  const selected = selectedSize === size.id;
                  return (
                    <label
                      key={size.id}
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSelectedSize(size.id)}
                    >
                      <span className={`text-sm transition-colors ${selected ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-secondary)]"}`}>
                        {size.name}
                        {size.price !== undefined && (
                          <span className="font-normal text-[var(--color-muted)] mr-1">— {size.price} ج.م</span>
                        )}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? "border-[var(--color-primary)]"
                          : "border-[var(--color-border)]"
                      }`}>
                        {selected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 4. الإضافات ── */}
          {meal.extras && meal.extras.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-secondary)] mb-3">
                الإضافات:
                <span className="text-[var(--color-muted)] font-normal"> (اختياري)</span>
              </h3>
              <div className="flex flex-col gap-3">
                {meal.extras.map((extra) => {
                  const checked = selectedExtras.includes(extra.id);
                  return (
                    <label
                      key={extra.id}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      {/* الاسم — يمين */}
                      <span className="text-sm text-[var(--color-secondary)]">{extra.name}</span>

                      {/* السعر + checkbox — يسار */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-muted)]">+{extra.price} ج.م</span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                            checked
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                              : "border-[var(--color-border)] bg-white"
                          }`}
                          onClick={() => toggleExtra(extra.id)}
                        >
                          {checked && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="white" strokeWidth="3" strokeLinecap="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 5. ملاحظة ── */}
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={() => setShowNote((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              أضف ملاحظة
            </button>
            {showNote && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: بدون بصل، إضافة صوص..."
                rows={2}
                className="mt-2 w-full text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 resize-none outline-none focus:border-[var(--color-primary)] text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
              />
            )}
          </div>

        </div>

        {/* ── 6. Bottom bar ── */}
        <div className="absolute bottom-0 right-0 left-0 px-4 pb-6 pt-2 bg-white border-t border-[var(--color-border)]">
          <button onClick={handleAddToCart} className="w-full bg-[var(--color-primary)] rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform">
            {/* يمين: النص */}
            <span className="text-white text-base font-bold">إضافة للسلة</span>
            {/* يسار: السعر */}
            <span className="text-white text-base font-black">{total} ج.م</span>
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={conflictMsg !== null}
        message={conflictMsg ?? ""}
        onConfirm={() => {
          if (pendingItem.current) {
            clearCart();
            addToCart(restaurantId, restaurantName, pendingItem.current);
            pendingItem.current = null;
          }
          setConflictMsg(null);
          onClose();
        }}
        onCancel={() => {
          pendingItem.current = null;
          setConflictMsg(null);
        }}
      />
    </div>
  );
}
