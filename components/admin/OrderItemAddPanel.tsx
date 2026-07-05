"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toSheetMeal } from "@/lib/restaurant/mappers";
import type { MenuItem, Category as CategoryType } from "@/lib/restaurant/types";
import { useMealConfigurator, type UseMealConfiguratorReturn } from "@/hooks/useMealConfigurator";
import MealCard from "@/components/shared/restaurant/MealCard";
import MealConfigPanel from "@/components/shared/restaurant/MealConfigPanel";

/* ── OrderItemAddPanel ── */

export interface OrderItemAddResult {
  menuItemId: string | null;
  name: string;
  quantity: number;
  price: number;
  extras: { name: string; price: number }[];
  notes: string | null;
}

interface Props {
  restaurantId: string;
  onAdd: (item: OrderItemAddResult) => void;
  onClose: () => void;
}

export default function OrderItemAddPanel({ restaurantId, onAdd, onClose }: Props) {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedMeal,   setSelectedMeal]   = useState<MenuItem | null>(null);

  /* ── Fetch restaurant menu ── */
  useEffect(() => {
    let cancelled = false;
    async function fetchMenu() {
      setLoading(true);
      const { data } = await supabase
        .from("categories")
        .select(
          "id, name, restaurant_id, sort_order, " +
          "menu_items(" +
          "  id, name, description, price, category_id, image_url, " +
          "  sort_order, is_active, is_best_seller, " +
          "  offer_price, offer_starts_at, offer_ends_at, offer_image_url, " +
          "  extra_groups(id, name, type, required, max_select, " +
          "    item_extras(id, name, price)" +
          "  )" +
          ")"
        )
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true })
        .returns<CategoryType[]>();

      if (cancelled) return;
      if (data) {
        const cats = data
          .map((cat) => ({
            ...cat,
            menu_items: [...cat.menu_items]
              .filter((m) => m.is_active !== false)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
          }))
          .filter((cat) => cat.menu_items.length > 0);

        setCategories(cats);
        if (cats.length > 0) setActiveCategory(String(cats[0].id));
      }
      setLoading(false);
    }
    fetchMenu();
    return () => { cancelled = true; };
  }, [restaurantId]);

  /* ── Selection handling ── */

  function handleSelectMeal(meal: MenuItem) {
    setSelectedMeal(meal);
  }

  function handleBack() {
    setSelectedMeal(null);
  }

  const activeCats = activeCategory
    ? categories.filter((c) => String(c.id) === activeCategory)
    : categories;

  /* ── Configuring state ── */
  const sheetMeal = selectedMeal ? toSheetMeal(selectedMeal) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedMeal ? (
            <button
              onClick={handleBack}
              className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-70"
              style={{ background: "#0F172A", color: "#94A3B8" }}
            >
              ←
            </button>
          ) : null}
          <h3 className="text-base font-black" style={{ color: "#F1F5F9" }}>
            {selectedMeal ? selectedMeal.name : "إضافة وجبات"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-70"
          style={{ background: "#0F172A", color: "#94A3B8" }}
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#14B8A6 transparent #14B8A6 #14B8A6" }}
          />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "#94A3B8" }}>
          لا توجد وجبات متاحة لهذا المطعم
        </p>
      ) : selectedMeal && sheetMeal ? (
        /* ── Configuring mode ── */
        <ConfigureMealView
          meal={sheetMeal}
          menuItemId={String(selectedMeal.id)}
          onAdd={(result) => {
            onAdd(result);
            onClose();
          }}
          onBack={handleBack}
        />
      ) : (
        /* ── Browsing mode ── */
        <>
          {/* Category tabs */}
          {categories.length > 1 && (
            <div
              className="flex gap-1 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {categories.map((cat) => {
                const active = activeCategory === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(String(cat.id))}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                    style={{
                      background: active ? "#14B8A6" : "transparent",
                      color:      active ? "#fff" : "#94A3B8",
                      border:     active ? "none" : "1px solid #334155",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Meal cards */}
          <div className="flex flex-col gap-1">
            {activeCats.map((cat) => (
              <div key={cat.id}>
                {categories.length === 1 ? null : (
                  <p className="text-xs font-bold mb-1" style={{ color: "#94A3B8" }}>
                    {cat.name}
                  </p>
                )}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "#0F172A" }}
                >
                  {cat.menu_items.map((meal) => {
                    const hasExtras = meal.extra_groups.length > 0;
                    const effectivePrice = meal.offer_price ?? meal.price;
                    return (
                      <MealCard
                        key={meal.id}
                        name={meal.name}
                        description={meal.description}
                        imageUrl={meal.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        effectivePrice={effectivePrice}
                        originalPrice={meal.price}
                        discountPercent={0}
                        isAvailable={true}
                        onClick={hasExtras ? () => handleSelectMeal(meal) : undefined}
                        footer={!hasExtras ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdd({
                                menuItemId: String(meal.id),
                                name: meal.name,
                                quantity: 1,
                                price: effectivePrice,
                                extras: [],
                                notes: null,
                              });
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                            style={{ background: "#14B8A622", color: "#14B8A6", border: "1px solid #14B8A644" }}
                          >
                            + إضافة
                          </button>
                        ) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── ConfigureMealView: inline configuration for a selected meal ── */

interface ConfigureMealViewProps {
  meal: ReturnType<typeof toSheetMeal>;
  menuItemId: string;
  onAdd: (item: OrderItemAddResult) => void;
  onBack: () => void;
}

function ConfigureMealView({ meal, menuItemId, onAdd }: ConfigureMealViewProps) {
  const config = useMealConfigurator(meal);
  const hasSizes = !!(meal.sizes && meal.sizes.length > 0);

  function handleAdd() {
    onAdd({
      menuItemId,
      name: meal.name,
      quantity: config.qty,
      price: hasSizes ? 0 : config.effectivePrice,
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
      notes: config.note.trim() || null,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Meal header ── */}
      <div
        className="rounded-xl p-3 flex items-center justify-between"
        style={{ background: "#0F172A" }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{meal.name}</p>
          <p className="text-xs" style={{ color: "#14B8A6" }}>
            {config.displayPrice} ج.م
            {config.effectivePrice !== meal.basePrice && (
              <span className="line-through mr-1" style={{ color: "#94A3B8" }}>
                {meal.basePrice} ج.م
              </span>
            )}
          </p>
        </div>
        {meal.description && (
          <p className="text-xs" style={{ color: "#94A3B8", maxWidth: "50%", textAlign: "left" }}>
            {meal.description}
          </p>
        )}
      </div>

      {/* ── Config panel ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#0F172A" }}
      >
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

      {/* ── Add button ── */}
      <button
        onClick={handleAdd}
        className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
        style={{ background: "#14B8A6", color: "#fff" }}
      >
        إضافة إلى الطلب — {config.total} ج.م
      </button>
    </div>
  );
}
