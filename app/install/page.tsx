"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { isInstalled, isMobile } from "@/lib/pwa";
import InstallBottomSheet from "@/components/customer/InstallBottomSheet";

/* ── Shared CTA button used throughout the page ── */
function InstallCta({
  label = "ثبت التطبيق الآن",
  onInstall,
  ready,
  size = "md",
}: {
  label?: string;
  onInstall: () => void;
  ready: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "px-5 py-2 text-sm",
    md: "px-8 py-3.5 text-base",
    lg: "px-10 py-4 text-lg",
  };

  return (
    <button
      onClick={ready ? onInstall : undefined}
      disabled={!ready}
      className={`inline-block rounded-xl font-black transition-all ${
        sizeClasses[size]
      } ${
        size === "lg" ? "shadow-lg" : "shadow-sm"
      } ${
        ready
          ? "bg-[var(--color-primary)] text-white hover:brightness-110 active:scale-[0.97] cursor-pointer"
          : "bg-[var(--color-primary)]/50 text-white cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Tagline shown across sections ── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full mb-4 tracking-wide">
      {children}
    </span>
  );
}

/* ── Desktop install info card (replaces InstallCta on desktop) ── */
function DesktopInstallCard() {
  const [copied, setCopied] = useState(false);
  const [qrStatus, setQrStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = typeof window !== "undefined" ? window.location.href : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-6 max-w-md mx-auto text-center">
      <h3 className="text-xl font-black text-[var(--color-secondary)] mb-2">
        ثبت التطبيق من هاتفك
      </h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-6">
        لأفضل تجربة، افتح هذا الرابط من متصفح Chrome على هاتفك.
      </p>
      <div className="flex flex-col items-center gap-4">
        {/* QR Code */}
        <div className="w-40 h-40 rounded-xl bg-white border border-[var(--color-border)] p-2 relative overflow-hidden">
          {qrStatus !== "error" && url && (
            <img
              src={qrUrl}
              alt="QR Code"
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                qrStatus === "loading" ? "opacity-0" : "opacity-100"
              }`}
              loading="lazy"
              onLoad={() => setQrStatus("loaded")}
              onError={() => setQrStatus("error")}
            />
          )}

          {/* Loading skeleton */}
          {qrStatus === "loading" && (
            <div className="absolute inset-2 rounded-lg bg-[var(--color-surface)] animate-pulse flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="opacity-40">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
          )}

          {/* Error fallback */}
          {qrStatus === "error" && (
            <div className="absolute inset-2 rounded-lg bg-[var(--color-surface)] flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">📱</span>
              <span className="text-xs font-bold text-[var(--color-muted)]">
                امسح الرابط من هاتفك
              </span>
            </div>
          )}
        </div>
        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-surface)] text-sm font-bold text-[var(--color-secondary)] hover:bg-[var(--color-border)] transition-colors active:scale-[0.97]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? "تم النسخ ✓" : "نسخ الرابط"}
        </button>
      </div>
    </div>
  );
}

export default function InstallPage() {
  const { isIOS, promptAvailable, install } = usePWAInstall();
  const [showSheet, setShowSheet] = useState(false);
  const alreadyInstalled = isInstalled();
  const desktop = !isMobile() && !alreadyInstalled;
  const androidWaiting = !isIOS && !promptAvailable && !alreadyInstalled && !desktop;

  let ctaLabel = "ثبت الآن";
  if (alreadyInstalled) ctaLabel = "فتح التطبيق";
  else if (isIOS) ctaLabel = "طريقة التثبيت";

  const ctaReady = alreadyInstalled || isIOS || promptAvailable;

  async function handleInstall() {
    if (alreadyInstalled) {
      window.location.href = "/";
      return;
    }
    if (isIOS) {
      setShowSheet(true);
      return;
    }
    await install();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navigtion bar ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-black text-[var(--color-secondary)]">
            حالا <span className="text-[var(--color-primary)]">دلفري</span>
          </Link>
          {!desktop && (
            <InstallCta
              label={alreadyInstalled ? "فتح التطبيق" : ctaLabel}
              onInstall={handleInstall}
              ready={ctaReady}
              size="sm"
            />
          )}
        </div>
      </header>

      <main>
        {/* ════════════════════════════════════════════
            1 — HERO
           ════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-10 md:pt-24 md:pb-16 text-center">
          <Pill>التطبيق الرسمي</Pill>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[var(--color-secondary)] leading-[1.12] mb-5">
            كل احتياجاتك
            <br />
            توصلك <span className="text-[var(--color-primary)]">حالاً</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-muted)] max-w-xl mx-auto mb-10 leading-relaxed">
            طلب أسرع، تتبع مباشر، ومطاعمك المفضلة في مكان واحد.
            <br />
            حمّل التطبيق الآن ووفّر وقتك.
          </p>
          {desktop ? (
            <DesktopInstallCard />
          ) : (
            <>
              <InstallCta label={ctaLabel} onInstall={handleInstall} ready={ctaReady} size="lg" />
              {androidWaiting && (
                <p className="text-xs text-[var(--color-muted)] mt-3 leading-relaxed max-w-xs mx-auto">
                  إذا لم يظهر زر التثبيت، افتح قائمة Chrome ثم اختر
                  &quot;إضافة إلى الشاشة الرئيسية&quot;.
                </p>
              )}
            </>
          )}
          <div className="mt-10 md:mt-14 flex justify-center">
            <div className="relative w-full max-w-[900px] aspect-[16/9]">
              <Image
                src="/images/landing/hero-home.webp"
                alt="واجهة تطبيق حالا دلفري"
                fill
                sizes="(max-width: 900px) 100vw, 900px"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            2 — FEATURES
           ════════════════════════════════════════════ */}
        <section className="bg-[var(--color-surface)] py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="text-center mb-12">
              <Pill>مميزات التطبيق</Pill>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--color-secondary)] mb-3">
                لماذا تطلب من حالا؟
              </h2>
              <p className="text-[var(--color-muted)] max-w-lg mx-auto">
                كل ما تحتاجه في تطبيق واحد، مصمم ليكون أسرع وأسهل.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-2xl shadow-sm p-6 text-right">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-[var(--color-secondary)] mb-1">
                  طلب أسرع
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  اطلب من مطعمك المفضل بلمسة واحدة واستلم طلبك في أسرع وقت.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl shadow-sm p-6 text-right">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-[var(--color-secondary)] mb-1">
                  حفظ المفضلة
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  احفظ مطاعمك وطلباتك المفضلة واطلبها تاني بضغطة واحدة.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl shadow-sm p-6 text-right">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-[var(--color-secondary)] mb-1">
                  تتبع مباشر
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  تابع طلبك لحظة بلحظة من المطعم لحد باب البيت.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            3 — SCREENSHOT: Discover (image left)
           ════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 w-full max-w-sm">
              <div className="relative w-full aspect-[3/4] rounded-2xl bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                <Image
                  src="/images/landing/discover-restaurants.webp"
                  alt="تصفّح المطاعم بسهولة"
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="flex-1 text-right">
              <Pill>تصفّح المطاعم</Pill>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--color-secondary)] mb-3 leading-snug">
                اكتشف مطاعم جديدة
                <br />
                في منطقتك
              </h2>
              <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed max-w-md mr-auto">
                تصفّح جميع المطاعم المتاحة في منطقتك، شاهد القوائم، الأسعار،
                والتقييمات بكل سهولة.
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            4 — SCREENSHOT: Order food (image right)
           ════════════════════════════════════════════ */}
        <section className="bg-[var(--color-surface)] py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="flex flex-col md:flex-row-reverse items-center gap-10 md:gap-16">
              <div className="flex-1 w-full max-w-sm">
                <div className="relative w-full aspect-[3/4] rounded-2xl bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <Image
                    src="/images/landing/order-food.webp"
                    alt="تخصيص الطلب بسهولة"
                    fill
                    sizes="(max-width: 768px) 100vw, 384px"
                    className="object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="flex-1 text-right">
                <Pill>تخصيص الطلب</Pill>
                <h2 className="text-3xl md:text-4xl font-black text-[var(--color-secondary)] mb-3 leading-snug">
                  خصّص طلبك زي ما
                  <br />
                  تحب بالظبط
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed max-w-md mr-auto">
                  اختر المقاسات، أضف الإضافات، وحدّد الكمية اللي تناسبك.
                  كل وجبة زي ما تحبها.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            5 — SCREENSHOT: Tracking (image left)
           ════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 w-full max-w-sm">
              <div className="relative w-full aspect-[3/4] rounded-2xl bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                <Image
                  src="/images/landing/order-tracking.webp"
                  alt="تتبع الطلب لحظة بلحظة"
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="flex-1 text-right">
              <Pill>تتبع مباشر</Pill>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--color-secondary)] mb-3 leading-snug">
                تابع طلبك خطوة
                <br />
                بخطوة
              </h2>
              <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed max-w-md mr-auto">
                من تجهيز الطلب في المطعم إلى التوصيل لباب البيت —
                عارف كل خطوة فين بالظبط.
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            6 — FINAL CTA
           ════════════════════════════════════════════ */}
        <section className="bg-[var(--color-surface)] py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
              <div className="flex-1 w-full max-w-sm">
                <div className="relative w-full aspect-[3/4] rounded-2xl bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <Image
                    src="/images/landing/install-now.webp"
                    alt="ثبت تطبيق حالا دلفري الآن"
                    fill
                    sizes="(max-width: 768px) 100vw, 384px"
                    className="object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="flex-1 text-right">
                <Pill>ابدأ الآن</Pill>
                <h2 className="text-3xl md:text-4xl font-black text-[var(--color-secondary)] mb-3 leading-snug">
                  خلّص طلبك في
                  <br />
                  <span className="text-[var(--color-primary)]">دقايق</span>
                </h2>
                <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed mb-8 max-w-md mr-auto">
                  حمّل التطبيق الآن واطلب من مطعمك المفضل بضغطة زر.
                  توصيل سريع، تتبع مباشر، وتجربة رائعة.
                </p>
                {desktop ? (
                  <DesktopInstallCard />
                ) : (
                  <>
                    <InstallCta label={ctaLabel} onInstall={handleInstall} ready={ctaReady} size="lg" />
                    {androidWaiting && (
                      <p className="text-xs text-[var(--color-muted)] mt-3 leading-relaxed max-w-xs">
                        إذا لم يظهر زر التثبيت، افتح قائمة Chrome ثم اختر
                        &quot;إضافة إلى الشاشة الرئيسية&quot;.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-12">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="border-t border-[var(--color-border)] pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-sm text-[var(--color-muted)] order-2 md:order-1">
                © {new Date().getFullYear()} حالا دلفري. كل الحقوق محفوظة.
              </p>
              <div className="flex items-center gap-8 order-1 md:order-2">
                <Link href="/privacy" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-secondary)] transition-colors">
                  الخصوصية
                </Link>
                <Link href="/terms" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-secondary)] transition-colors">
                  الشروط
                </Link>
                <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-secondary)] transition-colors">
                  الرئيسية
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* ── iOS Bottom Sheet (reused) ── */}
      {showSheet && <InstallBottomSheet onClose={() => setShowSheet(false)} />}
    </div>
  );
}
