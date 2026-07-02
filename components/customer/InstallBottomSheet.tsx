"use client";

interface Props {
  onClose: () => void;
}

export default function InstallBottomSheet({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full bg-white rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-3 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-black text-[var(--color-secondary)]">
            ثبت تطبيق حالا على جهازك
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0"
            aria-label="إغلاق"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">

          {/* Explanation */}
          <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-6">
            على أجهزة iPhone، لا تسمح Apple بإظهار نافذة التثبيت المباشر كما هو الحال على Android،
            لذلك يلزم اتباع الخطوات التالية لإضافة تطبيق حالا إلى الشاشة الرئيسية.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-5">

            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-black text-sm">1</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[var(--color-secondary)]">
                  اضغط على زر المشاركة
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">(Share)</p>
              </div>
              {/* Share icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-surface)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-black text-sm">2</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[var(--color-secondary)]">
                  اختر
                </p>
                <p className="text-base font-bold text-[var(--color-primary)] mt-0.5">
                  Add to Home Screen
                </p>
              </div>
              {/* Add to home screen icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-surface)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M9 9l3 3 3-3" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-black text-sm">3</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[var(--color-secondary)]">
                  اضغط
                </p>
                <p className="text-base font-bold text-[var(--color-primary)] mt-0.5">
                  Add
                </p>
              </div>
              {/* Checkmark icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-surface)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom button */}
        <div className="px-5 pb-6 pt-2 bg-white border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full bg-[var(--color-primary)] text-white font-black text-base py-3.5 rounded-2xl active:scale-[0.98] transition-transform shadow-md"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
