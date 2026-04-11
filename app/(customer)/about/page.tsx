import Link from "next/link";

const links = [
  { label: "سياسة الخصوصية", href: "/privacy" },
  { label: "شروط الاستخدام",  href: "/terms"   },
  { label: "تواصل معنا",      href: "/help"    },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/account"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">حول التطبيق</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-10 pb-10 flex flex-col gap-6">

          {/* ── لوجو واسم التطبيق ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
            </div>
            <p className="text-2xl font-black text-[var(--color-secondary)]">حالا</p>
            <p className="text-sm text-[var(--color-muted)]">الإصدار ١.٠.٠</p>
          </div>

          {/* ── روابط ── */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {links.map((link, i) => (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center justify-between px-4 py-4 active:bg-[var(--color-surface)] transition-colors ${
                  i < links.length - 1 ? "border-b border-[var(--color-border)]" : ""
                }`}
              >
                <span className="text-sm font-semibold text-[var(--color-secondary)]">
                  {link.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            ))}
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-sm text-[var(--color-muted)] pt-4">
            صنع بـ ❤️ في مصر
          </p>

        </main>
      </div>
    </div>
  );
}
