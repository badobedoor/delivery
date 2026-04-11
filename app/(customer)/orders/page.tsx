import Link from "next/link";

/* ── بيانات وهمية ── */
const pastOrders = [
  { id: 1, restaurant: "بيت البرجر",   date: "١٠ أبريل ٢٠٢٦", time: "٢:٣٠ م", items: 3, total: 138 },
  { id: 2, restaurant: "ليالي بيتزا",  date: "٨ أبريل ٢٠٢٦",  time: "٧:١٥ م", items: 2, total: 95  },
  { id: 3, restaurant: "شاورما الشام", date: "٥ أبريل ٢٠٢٦",  time: "١:٠٠ م", items: 4, total: 112 },
];

export default function OrdersPage() {
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

            <h1 className="text-base font-black text-[var(--color-secondary)]">طلباتي</h1>

            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-10 flex flex-col gap-3">
          {pastOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden"
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-black text-[var(--color-secondary)]">
                    {order.restaurant}
                  </p>
                  <span className="text-xs font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 px-2.5 py-1 rounded-full">
                    تم التوصيل
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-[var(--color-muted)]">{order.date} — {order.time}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
                  <span className="text-xs text-[var(--color-muted)]">{order.items} وجبات</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--color-muted)]" />
                  <span className="text-xs font-semibold text-[var(--color-secondary)]">{order.total} ج.م</span>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)]" />

              <div className="flex gap-2 px-4 py-3">
                <button className="flex-1 border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-bold py-2 rounded-xl active:scale-[0.98] transition-transform">
                  إعادة الطلب
                </button>
                <button className="flex-1 border-2 border-[var(--color-border)] text-[var(--color-muted)] text-sm font-bold py-2 rounded-xl active:scale-[0.98] transition-transform">
                  تقييم
                </button>
              </div>
            </div>
          ))}
        </main>

      </div>
    </div>
  );
}
