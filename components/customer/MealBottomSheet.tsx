"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { addToCart, clearCart, CartItem } from "@/lib/cart";
import ConfirmModal from "@/components/customer/ConfirmModal";
import { ItemExtra as Extra, Size, ExtraGroupSheet, SheetMeal as Meal } from "@/lib/restaurant/types";
import { useMealConfigurator } from "@/hooks/useMealConfigurator";
import MealConfigPanel from "@/components/shared/restaurant/MealConfigPanel";

/* ── Props ── */
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
    { id: "1", name: "وسط" },
    { id: "2", name: "كبير" },
  ],
};

/* ── Component ── */
export default function MealBottomSheet({ meal, onClose, restaurantId, restaurantName }: Props) {
  const config = useMealConfigurator(meal);

  const [conflictMsg,    setConflictMsg]    = useState<string | null>(null);
  const pendingItem = useRef<CartItem | null>(null);

  /* ── Add-to-cart (couples the config to the customer cart system) ── */
  function handleAddToCart() {
    const sizeObj = meal.sizes?.find((s) => s.id === config.selectedSize);
    const cartItem = {
      id: String(meal.id),
      name: meal.name,
      price: config.hasSizes ? 0 : config.effectivePrice,
      qty: config.qty,
      image_url: meal.img,
      description: null,
      size: config.selectedSize && sizeObj
        ? { name: sizeObj.name, price: sizeObj.price ?? 0 }
        : undefined,
      extras: config.selectedExtras.map((id) => {
        if (meal.extraGroups) {
          for (const g of meal.extraGroups) {
            const e = g.extras.find((e) => e.id === id);
            if (e) return { name: e.name, price: e.price };
          }
          return { name: "", price: 0 };
        }
        const extra = meal.extras!.find((e) => e.id === id)!;
        return { name: extra.name, price: extra.price };
      }),
      notes: config.note.trim() || undefined,
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
        className="relative w-full bg-white rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up"
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
                <h2 className="font-bold text-lg text-[var(--color-secondary)]">
                  {meal.name}
                </h2>
                <p className="font-bold text-[#FF6000]">
                  {config.effectivePrice !== meal.basePrice && !config.hasSizes ? (
                    <>
                      {config.effectivePrice} ج.م
                      <span className="text-xs text-gray-400 line-through mr-2">{meal.basePrice} ج.م</span>
                    </>
                  ) : config.hasSizes && config.selectedSize === null ? (
                    `يبدأ من ${config.minSizePrice} ج.م`
                  ) : (
                    `${config.displayPrice} ج.م`
                  )}
                </p>
                {meal.description && (
                  <p className="text-sm text-gray-500 mt-1">{meal.description}</p>
                )}
              </div>

            </div>
          </div>

          <MealConfigPanel
            meal={meal}
            qty={config.qty}
            selectedSize={config.selectedSize}
            selectedExtras={config.selectedExtras}
            note={config.note}
            incrementQty={config.incrementQty}
            decrementQty={config.decrementQty}
            setSelectedSize={config.setSelectedSize}
            toggleExtra={config.toggleExtra}
            setNote={config.setNote}
          />

        </div>

        {/* ── 6. Bottom bar ── */}
        <div className="absolute bottom-0 right-0 left-0 px-4 pb-6 pt-2 bg-white border-t border-[var(--color-border)]">
          <button onClick={handleAddToCart} className="w-full bg-[var(--color-primary)] rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform">
            {/* يمين: النص */}
            <span className="text-white text-base font-bold">إضافة للسلة</span>
            {/* يسار: السعر */}
            <span className="text-white text-base font-black">{config.total} ج.م</span>
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
