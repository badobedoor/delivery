"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCartCount, getCartTotal } from "@/lib/cart";

export default function CartBar() {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  function refresh() {
    setCount(getCartCount());
    setTotal(getCartTotal());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("storage",           refresh);
    window.addEventListener("hala-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage",           refresh);
      window.removeEventListener("hala-cart-updated", refresh);
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 left-0 z-50">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-2">
        <Link
          href="/cart"
          className="flex items-center justify-between bg-[var(--color-primary)] rounded-2xl px-4 py-3.5 shadow-xl active:scale-[0.98] transition-transform"
        >
          {/* يمين: دائرة العدد + النص */}
          <div className="flex items-center gap-2">
            <span className="bg-[var(--color-primary-dark)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
              {count}
            </span>
            <span className="text-white text-base font-bold">سلة المشتريات</span>
          </div>

          {/* يسار: الإجمالي */}
          <span className="text-white text-lg font-black">{total} ج.م</span>
        </Link>
      </div>
    </div>
  );
}
