import Link from "next/link";

const sections = [
  {
    title: "الطلبات",
    body: "كل طلب يتم من مطعم واحد فقط. في حال أردت الطلب من أكثر من مطعم، يمكنك إنشاء طلب جديد بعد اكتمال الأول.",
  },
  {
    title: "الدفع",
    body: "الدفع يتم نقداً عند استلام الطلب فقط. لا يوجد حاليًا خيار للدفع الإلكتروني.",
  },
  {
    title: "إلغاء الطلب",
    body:"بمجرد تأكيد طلبك، لا يمكن إلغاؤه. إذا واجهت أي مشكلة، تواصل معنا وهنحاول نساعدك.",
  },
  {
    title: "التواصل مع المندوب",
    body: "جميع الطلبات تتم من خلال التطبيق فقط، ولا يُسمح بالتواصل المباشر مع مندوبي التوصيل خارج التطبيق.",
  },
  {
    title: "الرد على المندوب",
    body: "فور استلام المندوب لطلبك، سيتصل بك على رقم هاتفك المسجل. يجب الرد على الاتصال لضمان وصول طلبك.",
  },
  {
    title: "رفض الاستلام",
    body: "في حال رفض استلام الطلب بدون سبب وجيه، أو عدم التواجد في العنوان المحدد، أو عدم الرد على اتصال المندوب، يحق للمنصة إيقاف حسابه.",
  },
  {
    title: "صحة عنوان التوصيل",
    body: "يجب التأكد من صحة عنوان التوصيل قبل تأكيد الطلب. المنصة غير مسؤولة عن التأخير الناتج عن بيانات عنوان خاطئة.",
  },
  {
    title: "سياسة الحساب",
    body: "نحتفظ بحق تعليق أو إيقاف أي حساب يثبت إساءة استخدام التطبيق أو مخالفة هذه الشروط.",
  },
  {
    title: "موافقتك",
    body: "باستخدامك لتطبيق حالا، فأنت توافق على هذه الشروط كاملةً وتلتزم بها.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]" dir="rtl">
      <div className="w-full">

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
            <h1 className="text-base font-black text-[var(--color-secondary)]">شروط الاستخدام</h1>
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
