"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const faqs = [
  {
    id: 1,
    q: "كيف أتتبع طلبي؟",
    a: "بعد تأكيد طلبك ستصلك إشعارات بكل مرحلة. يمكنك أيضاً متابعة الطلب من صفحة طلباتي.",
  },
  {
    id: 2,
    q: "كيف ألغي طلبي؟",
    a: "في حال أردت إلغاء طلبك، تواصل معنا فوراً عبر واتساب وسنبذل قصارى جهدنا لمساعدتك.",
  },
  {
    id: 3,
    q: "ما هي مناطق التوصيل؟",
    a: "نوصل حالياً لجميع أحياء مدينة الطور.",
  },
];

function Arrow({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"
      className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("whatsapp_number")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      });
  }, []);

  const whatsappHref = whatsappNumber ? `https://wa.me/2${whatsappNumber}` : "tel:+20";

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
            <h1 className="text-base font-black text-[var(--color-secondary)]">المساعدة</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-8 pb-10 flex flex-col gap-6">

          {/* ── واتساب ── */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] px-6 py-8 flex flex-col items-center text-center gap-3">
            <span className="text-6xl">💬</span>
            <p className="text-lg font-black text-[var(--color-secondary)]">هل تحتاج مساعدة؟</p>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              تواصل معنا عبر واتساب وسنرد عليك في أقل من دقيقة
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full bg-[#25D366] text-white text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-lg">💚</span>
              تواصل عبر واتساب
            </a>
          </div>

          {/* ── أسئلة شائعة ── */}
          <section>
            <h2 className="text-sm font-black text-[var(--color-secondary)] mb-3 px-1">
              أسئلة شائعة
            </h2>
            <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
              {faqs.map((faq, i) => (
                <div key={faq.id}
                  className={i < faqs.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between px-4 py-4 text-right"
                  >
                    <span className="text-sm font-semibold text-[var(--color-secondary)]">
                      {faq.q}
                    </span>
                    <Arrow open={openFaq === faq.id} />
                  </button>
                  {openFaq === faq.id && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
