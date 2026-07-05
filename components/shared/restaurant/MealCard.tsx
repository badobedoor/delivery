"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/* ── Props ── */

export interface MealCardProps {
  /** Meal name (rendered as bold title). */
  name: string;
  /** Short description, or null to hide. */
  description: string | null;
  /** Resolved image URL (offer image, regular image, or fallback). */
  imageUrl: string;
  /** The price that should be displayed / charged. */
  effectivePrice: number;
  /** The base price before any offer.  When different from effectivePrice
   *  the card renders a strikethrough price. */
  originalPrice: number;
  /** Discount percentage (0 means no badge is shown). */
  discountPercent: number;
  /** Whether the meal is currently available for ordering. */
  isAvailable: boolean;
  /** Pre-rendered offer date range content, or undefined to hide. */
  offerDateRange?: ReactNode;
  /** Slot for arbitrary content below the price line
   *  (e.g. QuantityCounter). */
  footer?: ReactNode;
  /** Generic click handler (no knowledge of what triggers it). */
  onClick?: () => void;
}

/* ── Component ── */

export default function MealCard({
  name,
  description,
  imageUrl,
  effectivePrice,
  originalPrice,
  discountPercent,
  isAvailable,
  offerDateRange,
  footer,
  onClick,
}: MealCardProps) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      className={
        `flex items-center py-3 relative` +
        (isClickable ? " cursor-pointer active:opacity-75 transition-opacity" : "")
      }
      onClick={isClickable ? onClick : undefined}
    >
      {/* ── Image (right in RTL) ── */}
      <div className="relative flex-shrink-0 w-24 h-24 ml-3 rounded-xl overflow-hidden">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/placeholder.png";
          }}
        />
        {discountPercent > 0 && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
            -{discountPercent}%
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-bold">غير متوفر</span>
          </div>
        )}
      </div>

      {/* ── Text content ── */}
      <div className="flex flex-col flex-1 min-w-0 px-1">
        {/* Name */}
        <p className="truncate font-bold text-base text-[var(--color-secondary)] leading-snug">
          {name}
        </p>

        {/* Description + Price */}
        <div className="flex items-center gap-2 flex-1 mt-0.5">
          {description && (
            <p className="line-clamp-2 text-sm text-[var(--color-muted)] flex-1">
              {description}
            </p>
          )}
          {effectivePrice !== originalPrice ? (
            <div className="flex flex-col items-end flex-shrink-0">
              <p className="text-base font-black text-[var(--color-primary)]">
                {effectivePrice} ج
              </p>
              <p className="text-xs text-[var(--color-muted)] line-through">
                {originalPrice} ج
              </p>
            </div>
          ) : (
            <p className="text-base font-black text-[var(--color-primary)] flex-shrink-0">
              {effectivePrice} ج
            </p>
          )}
        </div>

        {/* Offer date range */}
        {offerDateRange && (
          <div className="mt-1 pt-1 border-t border-[var(--color-border)]">
            {offerDateRange}
          </div>
        )}

        {/* Footer slot */}
        {footer && (
          <div className="mt-auto pt-1">{footer}</div>
        )}
      </div>
    </div>
  );
}
