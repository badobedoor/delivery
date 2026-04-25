"use client";

import Link from "next/link";

const notifications = [
  {
    id: 1,
    title: "طلبك في الطريق",
    body: "المندوب على بعد ١٠ دقائق من موقعك",
    time: "منذ ٥ دقائق",
    read: false,
    icon: "🛵",
  },
  {
    id: 2,
    title: "تم تأكيد طلبك",
    body: "تم استلام طلبك من بيت البرجر وجاري التحضير",
    time: "منذ ٢٠ دقيقة",
    read: false,
    icon: "✅",
  },
  {
    id: 3,
    title: "عرض خاص لك",
    body: "استخدم كود HALA50 واحصل على خصم ٥٠٪ على طلبك القادم",
    time: "منذ ساعتين",
    read: true,
    icon: "🎁",
  },
  {
    id: 4,
    title: "تم توصيل طلبك",
    body: "استمتع بوجبتك من ليالي بيتزا 🍕",
    time: "أمس",
    read: true,
    icon: "✅",
  },
  {
    id: 5,
    title: "وفر على طلبك القادم",
    body: "توصيل مجاني على أول طلب تاني من شاورما الشام",
    time: "منذ يومين",
    read: true,
    icon: "🎁",
  },
];

export default function NotificationsPage() {
  const hasNotifications = notifications.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <h1 className="text-base font-black text-[var(--color-secondary)]">الإشعارات</h1>

            <div className="w-9" />
          </div>
        </header>

        <main className="pb-10">

          {hasNotifications ? (
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-4 ${
                    !n.read ? "bg-[var(--color-primary)]/5" : "bg-white"
                  }`}
                >
                  {/* أيقونة — يمين */}
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xl flex-shrink-0">
                    {n.icon}
                  </div>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{n.title}</p>
                      {/* نقطة برتقالية لو غير مقروء */}
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── حالة فارغة ── */
            <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center px-4">
              <span className="text-6xl">🔔</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا توجد إشعارات</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
