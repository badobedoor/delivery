import Link from "next/link";

/* ── بيانات وهمية ── */
const notifications = [
  {
    id: 1,
    icon: "🛵",
    title: "طلبك في الطريق",
    desc: "المندوب على بعد ١٠ دقائق من موقعك",
    time: "منذ ٥ دقائق",
    unread: true,
  },
  {
    id: 2,
    icon: "✅",
    title: "تم تأكيد طلبك",
    desc: "تم استلام طلبك من بيت البرجر وجاري التحضير",
    time: "منذ ٢٠ دقيقة",
    unread: true,
  },
  {
    id: 3,
    icon: "🎁",
    title: "عرض خاص لك",
    desc: "استخدم كود HALA50 واحصل على خصم ٥٠٪ على طلبك القادم",
    time: "منذ ساعتين",
    unread: false,
  },
  {
    id: 4,
    icon: "✅",
    title: "تم توصيل طلبك",
    desc: "استمتع بوجبتك من ليالي بيتزا 🍕",
    time: "أمس",
    unread: false,
  },
  {
    id: 5,
    icon: "🎁",
    title: "وفر على طلبك القادم",
    desc: "توصيل مجاني على أول طلب تاني من شاورما الشام",
    time: "منذ يومين",
    unread: false,
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
            <Link href="/account"
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
                    n.unread ? "bg-[var(--color-primary-light)]/10" : "bg-white"
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
                      {n.unread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">
                      {n.desc}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-1.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── حالة فارغة ── */
            <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center px-4">
              <span className="text-6xl">🔔</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد إشعارات</p>
              <p className="text-sm text-[var(--color-muted)]">إشعاراتك ستظهر هنا</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
