export default function ClosedScreen({
  openTime,
  closeTime,
}: {
  openTime: string;
  closeTime: string;
}) {
  function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const period = h < 12 ? "ص" : "م";
    const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #011b3e 0%, #103258 100%)" }}
    >
      {/* الصورة */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/close.png"
        alt="مغلق"
        className="w-150 h-150 object-contain mb-6"
      />

      {/* اسم التطبيق */}
      <p className="text-4xl font-black mb-1" style={{ color: "#FF6000" }}>حالا</p>
      <p className="text-sm text-white/50 mb-6">دلفري</p>

      {/* الرسالة */}
      <p className="text-2xl font-black text-white mb-2">مغلق حالياً</p>
      <p className="text-sm text-white/60 mb-8 leading-relaxed">
       </p>

      {/* مواعيد العمل */}
      <div
        className="w-full max-w-xs rounded-2xl px-6 py-4 flex flex-col gap-3"
        style={{ background: "rgba(255,96,0,0.1)", border: "1px solid rgba(255,96,0,0.25)" }}
      >
        <p className="text-xs text-white/50">مواعيد العمل</p>
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-xs text-white/50 mb-0.5">بنفتح</p>
            <p className="text-xl font-black" style={{ color: "#FF6000" }}>
              {formatTime(openTime)}
            </p>
          </div>
          <div className="text-white/20 text-2xl">←</div>
          <div className="text-right">
            <p className="text-xs text-white/50 mb-0.5">بنقفل</p>
            <p className="text-xl font-black text-white/80">
              {formatTime(closeTime)}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-white/30 mt-6">هنكون معاك قريباً 🧡</p>
    </div>
  );
}
