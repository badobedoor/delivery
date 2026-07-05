"use client";

import { useState, useEffect } from "react";
import { getEffectiveMealPrice } from "@/lib/pricing";
import type { SheetMeal } from "@/lib/restaurant/types";

/* ── Return type ── */

export interface UseMealConfiguratorReturn {
  /* ── Raw state ── */
  qty: number;
  selectedExtras: number[];
  selectedSize: string | null;
  note: string;

  /* ── Computed values ── */
  extrasTotal: number;
  activePrice: number;
  minSizePrice: number;
  effectivePrice: number;
  displayPrice: number;
  total: number;
  hasSizes: boolean;

  /* ── Actions ── */
  setQty: React.Dispatch<React.SetStateAction<number>>;
  incrementQty: () => void;
  decrementQty: () => void;
  setSelectedSize: React.Dispatch<React.SetStateAction<string | null>>;
  toggleExtra: (id: number, groupId?: number) => void;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  resetConfig: () => void;
}

/* ── Hook ── */

export function useMealConfigurator(meal: SheetMeal): UseMealConfiguratorReturn {
  const [qty,            setQty]            = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [selectedSize,   setSelectedSize]   = useState<string | null>(null);
  const [note,           setNote]           = useState("");

  /* Auto-select the first size on mount (sizes are stable for the
   * lifetime of the configurator — the meal doesn't change). */
  useEffect(() => {
    if (meal.sizes && meal.sizes.length > 0) {
      setSelectedSize(meal.sizes[0].id);
    }
  }, []);

  /* ── Computed ── */

  const extrasTotal = selectedExtras.reduce((sum, id) => {
    let price = 0;
    if (meal.extraGroups) {
      for (const g of meal.extraGroups) {
        const e = g.extras.find((e) => e.id === id);
        if (e) { price = e.price; break; }
      }
    } else {
      price = meal.extras?.find((e) => e.id === id)?.price ?? 0;
    }
    return sum + price;
  }, 0);

  const hasSizes    = !!(meal.sizes && meal.sizes.length > 0);
  const activePrice = hasSizes
    ? (selectedSize !== null ? (meal.sizes!.find((s) => s.id === selectedSize)?.price ?? 0) : 0)
    : meal.basePrice;
  const minSizePrice = hasSizes
    ? Math.min(...meal.sizes!.map((s) => s.price ?? meal.basePrice))
    : meal.basePrice;

  const effectivePrice = getEffectiveMealPrice({
    price:           meal.basePrice,
    offerPrice:      meal.offerPrice,
    offerStartsAt:   meal.offerStartsAt,
    offerEndsAt:     meal.offerEndsAt,
  });
  const displayPrice = hasSizes ? activePrice : effectivePrice;
  const total        = (displayPrice + extrasTotal) * qty;

  /* ── Actions ── */

  function toggleExtra(id: number, groupId?: number) {
    setSelectedExtras((prev) => {
      if (prev.includes(id)) return prev.filter((e) => e !== id);
      if (meal.extraGroups && groupId !== undefined) {
        const group = meal.extraGroups.find((g) => g.id === groupId);
        if (group && group.maxSelect > 0) {
          const selectedInGroup = prev.filter((eid) => group.extras.some((e) => e.id === eid)).length;
          if (selectedInGroup >= group.maxSelect) return prev;
        }
      }
      return [...prev, id];
    });
  }

  function incrementQty() { setQty((q) => q + 1); }
  function decrementQty() { setQty((q) => Math.max(1, q - 1)); }

  function resetConfig() {
    setQty(1);
    setSelectedExtras([]);
    setSelectedSize(meal.sizes?.[0]?.id ?? null);
    setNote("");
  }

  return {
    qty,
    selectedExtras,
    selectedSize,
    note,
    extrasTotal,
    activePrice,
    minSizePrice,
    effectivePrice,
    displayPrice,
    total,
    hasSizes,
    setQty,
    incrementQty,
    decrementQty,
    setSelectedSize,
    toggleExtra,
    setNote,
    resetConfig,
  };
}
