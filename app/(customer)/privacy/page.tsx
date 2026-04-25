import Link from "next/link";

const sections = [
  {
    title: "البيانات التي نجمعها",
    body: "نقوم بجمع بعض المعلومات الأساسية مثل الاسم ورقم الموبايل والعنوان، وذلك بهدف واحد فقط: إيصال طلبك بأسرع وقت وبأعلى دقة ممكنة.",
  },
  {
    title: "كيف نستخدم بياناتك",
    body: "بياناتك لا تُستخدم إلا لتنفيذ طلباتك وتحسين تجربتك داخل التطبيق. لن نشارك معلوماتك مع أي طرف خارجي تحت أي ظرف.",
  },
  {
    title: "حماية بياناتك",
    body: "نحرص على حفظ بياناتك بشكل آمن. أنت دائمًا في أمان معنا.",
  },
  {
    title: "موافقتك",
    body: "باستخدامك لتطبيق حالا، فأنت توافق على هذه السياسة بشكل كامل.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]" dir="rtl">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/about"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">سياسة الخصوصية</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-6 pb-10 flex flex-col gap-4">
          {sections.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-4 flex flex-col gap-2">
              <h2 className="text-sm font-black text-[var(--color-secondary)]">{s.title}</h2>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </main>

      </div>
    </div>
  );
}
