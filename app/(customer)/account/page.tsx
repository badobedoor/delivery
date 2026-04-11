import Link from "next/link";

const menuItems = [
  {
    label: "إعادة الطلب",
    href: "/orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    ),
  },
  {
    label: "العروض",
    href: "/offers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    label: "الإشعارات",
    href: "/notifications",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    label: "القسائم",
    href: "/coupons",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 12V22H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    label: "احصل على المساعدة",
    href: "/help",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    label: "حول التطبيق",
    href: "/about",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
];

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── 1. Header ── */}
        <header className="bg-white px-4 pt-12 pb-5 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            {/* يمين: ترحيب */}
            <div>
              <h1 className="text-xl font-black text-[var(--color-secondary)]">مرحبا بك 👋</h1>
              <p className="text-sm text-[var(--color-muted)] mt-0.5">أحمد محمد</p>
            </div>

            {/* يسار: صورة الحساب */}
            <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </header>

        {/* ── 2. Menu List ── */}
        <main className="pb-24 px-4 pt-4">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {menuItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-4 active:bg-[var(--color-surface)] transition-colors ${
                  i < menuItems.length - 1 ? "border-b border-[var(--color-border)]" : ""
                }`}
              >
                {/* يمين: النص */}
                <span className="text-sm font-semibold text-[var(--color-secondary)]">
                  {item.label}
                </span>

                {/* يسار: أيقونة + سهم */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </main>

        {/* ── 3. Bottom Navigation ── */}
        <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">
          {/* الرئيسية */}
          <Link href="/" className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-muted)" stroke="none">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">الرئيسية</span>
          </Link>

          {/* بحث */}
          <button className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-muted)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">بحث</span>
          </button>

          {/* حسابي — active */}
          <button className="flex flex-col items-center gap-0.5 px-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-primary)" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[10px] font-semibold text-[var(--color-primary)]">حسابي</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
