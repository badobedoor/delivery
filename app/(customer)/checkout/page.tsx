import Link from "next/link";

/* ── بيانات وهمية ── */
const address = {
  label:   "البيت",
  details: "المعادي — عمارة 5، شقة 12، الدور 3",
};

const order = {
  restaurant: "بيت البرجر",
  meals: [
    { id: 1, name: "كشري كبير",  qty: 2, price: 25 },
    { id: 2, name: "طاجن فراخ",  qty: 1, price: 70 },
    { id: 3, name: "كشري وسط",   qty: 1, price: 18 },
  ],
};

const delivery = 15;
const service  = 5;

const subtotal = order.meals.reduce((s, m) => s + m.price * m.qty, 0);
const total    = subtotal + delivery + service;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-black text-[var(--color-secondary)]">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            {/* يمين: رجوع */}
            <Link href="/cart"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <h1 className="text-base font-black text-[var(--color-secondary)]">تأكيد الطلب</h1>

            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-36 flex flex-col gap-4">

          {/* ── 2. عنوان التوصيل ── */}
          <SectionCard title="عنوان التوصيل">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-secondary)]">{address.label}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{address.details}</p>
                </div>
              </div>
              <Link href="/address"
                className="text-sm font-bold text-[var(--color-primary)] flex-shrink-0">
                تغيير
              </Link>
            </div>
          </SectionCard>

          {/* ── 3. تفاصيل الطلب ── */}
          <SectionCard title="تفاصيل الطلب">
            <p className="text-sm font-bold text-[var(--color-secondary)] mb-3">
              {order.restaurant}
            </p>
            <div className="flex flex-col gap-2.5">
              {order.meals.map((meal) => (
                <div key={meal.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white bg-[var(--color-primary)] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {meal.qty}
                    </span>
                    <span className="text-sm text-[var(--color-secondary)]">{meal.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-secondary)]">
                    {meal.price * meal.qty} ج.م
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── 4. ملخص الدفع ── */}
          <SectionCard title="ملخص الدفع">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">المجموع</span>
                <span className="text-sm text-[var(--color-secondary)]">{subtotal} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">رسوم التوصيل</span>
                <span className="text-sm text-[var(--color-secondary)]">{delivery} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">رسوم الخدمة</span>
                <span className="text-sm text-[var(--color-secondary)]">{service} ج.م</span>
              </div>
              <div className="border-t border-[var(--color-border)] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-black text-[var(--color-secondary)]">قيمة الطلب</span>
                <span className="text-sm font-black text-[var(--color-secondary)]">{total} ج.م</span>
              </div>
            </div>
          </SectionCard>

          {/* ── 5. طريقة الدفع ── */}
          <SectionCard title="طريقة الدفع">
            <div className="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 14h2" />
                  <path d="M10 14h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-secondary)]">
                الدفع عند الاستلام (كاش)
              </p>
            </div>
          </SectionCard>

        </main>

        {/* ── Bottom button ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-[var(--color-border)]">
            <button className="w-full bg-[var(--color-primary)] text-white text-base font-bold py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-transform">
              تأكيد الطلب
            </button>
            <p className="text-center text-xs text-[var(--color-muted)] mt-2">
              سيتم إرسال طلبك فور التأكيد
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
