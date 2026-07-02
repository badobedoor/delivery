"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import InstallBottomSheet from "@/components/customer/InstallBottomSheet";

export default function InstallCard() {
  const { canInstall, isIOS, promptAvailable, install } = usePWAInstall();
  const [showSheet, setShowSheet] = useState(false);

  if (!canInstall) return null;

  const isAndroidButtonReady = isIOS || promptAvailable;

  async function handleInstall() {
    if (isIOS) {
      setShowSheet(true);
      return;
    }
    /* Android — trigger native prompt */
    const installed = await install();
    if (installed) {
      /* card unmounts automatically via canInstall → false */
    }
  }

  return (
    <>
      <section className="px-4 pt-4">
        <div className="w-full rounded-2xl border border-[#FFD5C0] bg-white px-5 py-4 flex items-center justify-between gap-3">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base text-[var(--color-secondary)]">
              ثبت تطبيق حالا
            </h3>
            <p className="text-sm text-[var(--color-muted)] mt-0.5 leading-relaxed">
              اطلب أسرع وافتح التطبيق بضغطة واحدة.
            </p>
          </div>

          {/* Button */}
          <button
            onClick={isAndroidButtonReady ? handleInstall : undefined}
            disabled={!isAndroidButtonReady}
            className={`flex-shrink-0 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm ${
              isAndroidButtonReady
                ? "bg-[var(--color-primary)] active:scale-[0.97] cursor-pointer"
                : "bg-[var(--color-primary)]/50 cursor-not-allowed"
            }`}
          >
            {isAndroidButtonReady ? "ثبت الآن" : "جارٍ تجهيز التثبيت..."}
          </button>
        </div>
      </section>

      {showSheet && (
        <InstallBottomSheet onClose={() => setShowSheet(false)} />
      )}
    </>
  );
}
