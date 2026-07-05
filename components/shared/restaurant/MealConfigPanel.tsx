"use client";

import { useState } from "react";
import type { SheetMeal } from "@/lib/restaurant/types";

/* ── Props ── */

export interface MealConfigPanelProps {
  meal: SheetMeal;

  /* ── Config state (from useMealConfigurator or equivalent) ── */
  qty: number;
  selectedSize: string | null;
  selectedExtras: number[];
  note: string;

  /* ── Config actions ── */
  incrementQty: () => void;
  decrementQty: () => void;
  setSelectedSize: (id: string) => void;
  toggleExtra: (id: number, groupId?: number) => void;
  setNote: (value: string) => void;
}

/* ── Component ── */

export default function MealConfigPanel({
  meal,
  qty,
  selectedSize,
  selectedExtras,
  note,
  incrementQty,
  decrementQty,
  setSelectedSize,
  toggleExtra,
  setNote,
}: MealConfigPanelProps) {
  const [showNote, setShowNote] = useState(false);

  return (
    <>
      {/* ── Quantity controls ── */}
      <div className="flex items-center gap-2 mt-1">
        {/* + — first in RTL (rightmost) */}
        <button
          onClick={incrementQty}
          className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <span className="text-base font-bold text-[var(--color-secondary)] w-5 text-center">
          {qty}
        </span>
        {/* - — last in RTL (leftmost) */}
        <button
          onClick={decrementQty}
          className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-secondary)" strokeWidth="2.5">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      {/* ── Size selection ── */}
      {meal.sizes && meal.sizes.length > 0 && (
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-base font-bold text-[var(--color-secondary)] mb-2">
            إختيارك من الحجم:
            <span className="text-sm text-[var(--color-muted)] font-normal"> (اختر 1)</span>
          </h3>
          <div className="flex flex-col">
            {meal.sizes.map((size) => {
              const selected = selectedSize === size.id;
              return (
                <label
                  key={size.id}
                  className="flex items-center justify-between cursor-pointer py-3"
                  onClick={() => setSelectedSize(size.id)}
                >
                  <span className={`text-base transition-colors ${selected ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-secondary)]"}`}>
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

      {/* ── Extra groups (structured) ── */}
      {meal.extraGroups && meal.extraGroups.length > 0
        ? meal.extraGroups.map((group) => {
            const selectedInGroup = selectedExtras.filter((eid) =>
              group.extras.some((e) => e.id === eid)
            ).length;
            const atMax = group.maxSelect > 0 && selectedInGroup >= group.maxSelect;
            return (
              <div key={group.id} className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-base font-bold text-[var(--color-secondary)] mb-1">
                  {group.name}:
                  <span className="text-sm text-[var(--color-muted)] font-normal">
                    {group.maxSelect > 0 ? ` (اختر حتى ${group.maxSelect})` : " (اختياري)"}
                  </span>
                </h3>
                {atMax && (
                  <p className="text-xs font-semibold text-[var(--color-primary)] mb-2">الحد الأقصى {group.maxSelect} إضافات</p>
                )}
                <div className="flex flex-col">
                  {group.extras.map((extra) => {
                    const checked = selectedExtras.includes(extra.id);
                    const disabled = !checked && atMax;
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center justify-between py-3 rounded-lg px-1 -mx-1 transition-colors ${
                          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:bg-[var(--color-surface)]"
                        }`}
                        onClick={disabled ? undefined : () => toggleExtra(extra.id, group.id)}
                      >
                        <span className="text-base text-[var(--color-secondary)]">{extra.name}</span>
                        <div className="flex items-center gap-2 pointer-events-none">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">+{extra.price} ج.م</span>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                            checked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)] bg-white"
                          }`}>
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
            );
          })
        : meal.extras && meal.extras.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-bold text-[var(--color-secondary)] mb-2">
                الإضافات:
                <span className="text-sm text-[var(--color-muted)] font-normal"> (اختياري)</span>
              </h3>
              <div className="flex flex-col">
                {meal.extras.map((extra) => {
                  const checked = selectedExtras.includes(extra.id);
                  return (
                    <label
                      key={extra.id}
                      className="flex items-center justify-between cursor-pointer py-3 active:bg-[var(--color-surface)] rounded-lg px-1 -mx-1 transition-colors"
                      onClick={() => toggleExtra(extra.id)}
                    >
                      <span className="text-base text-[var(--color-secondary)]">{extra.name}</span>
                      <div className="flex items-center gap-2 pointer-events-none">
                        <span className="text-sm font-semibold text-[var(--color-muted)]">+{extra.price} ج.م</span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          checked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)] bg-white"
                        }`}>
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
          )
      }

      {/* ── Notes input ── */}
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
    </>
  );
}
