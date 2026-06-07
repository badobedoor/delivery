"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/customer/BottomNav";

/* ── Egyptian phone validation ── */
function validateEgPhone(p: string): string | null {
  const c = p.replace(/\s/g, "");
  if (!c) return "رقم الهاتف مطلوب";
  if (!/^01[0125][0-9]{8}$/.test(c))
    return "رقم غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقمًا";
  return null;
}

/* ── Menu items (القسائم before الإشعارات) ── */
const menuItems = [
  {
    label: "طلباتي",          /* was: إعادة الطلب */
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
  const [name,         setName]         = useState("مرحبا");
  const [phone,        setPhone]        = useState("");
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [userId,       setUserId]       = useState<string | null>(null);

  /* ── Phone modal state ── */
  const [showModal,    setShowModal]    = useState(false);
  const [newPhone,     setNewPhone]     = useState("");
  const [phoneError,   setPhoneError]   = useState("");
  const [phoneSaving,  setPhoneSaving]  = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);

  /* ── Fetch user ── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setName(user.user_metadata?.full_name || user.email || "مرحبا");
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);

      const { data: profile } = await supabase
        .from("users")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      setPhone(profile?.phone ?? user.phone ?? "");
    });
  }, []);

  /* ── Save phone ── */
  async function handleSavePhone() {
    const err = validateEgPhone(newPhone);
    if (err) { setPhoneError(err); return; }
    if (!userId) return;

    setPhoneSaving(true);
    setPhoneError("");
    const { error } = await supabase
      .from("users")
      .update({ phone: newPhone.trim() })
      .eq("id", userId);

    setPhoneSaving(false);
    if (error) {
      const code = error.code ?? "";
      const msg  = (error.message ?? "").toLowerCase();
      if (code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
        setPhoneError("هذا الرقم مسجل لدى مستخدم آخر");
      } else if (msg.includes("blocked") || msg.includes("محظور")) {
        setPhoneError("هذا الرقم محظور");
      } else {
        setPhoneError("حصل خطأ، حاول تاني");
      }
      return;
    }
    setPhone(newPhone.trim());
    setShowModal(false);
    setNewPhone("");
    setPhoneSuccess(true);
    setTimeout(() => setPhoneSuccess(false), 2500);
  }

  function openModal() {
    setNewPhone(phone);
    setPhoneError("");
    setShowModal(true);
  }

  /* ── Logout ── */
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── 1. Header ── */}
        <header className="bg-white px-4 pt-12 pb-5 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">

            {/* يمين: ترحيب + اسم + هاتف */}
            <div>
              <h1 className="text-xl font-black text-[var(--color-secondary)]">مرحبا بك 👋</h1>
              <p className="text-sm text-[var(--color-muted)] mt-0.5">{name}</p>

              {/* Phone row */}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-[var(--color-muted)]">
                  {phone || "لا يوجد رقم هاتف"}
                </p>
                <button
                  onClick={openModal}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors active:scale-95"
                  style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                >
                  تعديل
                </button>
              </div>
            </div>

            {/* يسار: صورة الحساب */}
            <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
          </div>

          {/* Success toast */}
          {phoneSuccess && (
            <div className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold text-center"
              style={{ background: "#ECFDF5", color: "#059669" }}>
              ✓ تم تحديث رقم الهاتف بنجاح
            </div>
          )}
        </header>

        {/* ── 2. Menu List ── */}
        <main className="pb-24 px-4 pt-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {menuItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-4 py-4 active:bg-[var(--color-surface)] transition-colors ${
                  i < menuItems.length - 1 ? "border-b border-[var(--color-border)]" : ""
                }`}
              >
                <span className="text-sm font-semibold text-[var(--color-secondary)]">
                  {item.label}
                </span>
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

          {/* ── Logout button ── */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-4 bg-white rounded-2xl border transition-colors active:bg-red-50"
            style={{ borderColor: "#FECACA" }}
          >
            <span className="text-sm font-semibold" style={{ color: "#EF4444" }}>
              تسجيل الخروج
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#FEF2F2" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
          </button>
        </main>

        {/* ── 3. Bottom Navigation ── */}
        <BottomNav />

      </div>

      {/* ── Phone Edit Modal (bottom sheet) ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full bg-white rounded-t-3xl px-5 py-6 flex flex-col gap-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[var(--color-secondary)]">تعديل رقم الهاتف</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-sm"
                style={{ color: "var(--color-muted)" }}
              >✕</button>
            </div>

            {/* Current phone (readonly) */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">
                الرقم الحالي
              </label>
              <div className="w-full px-3 py-2.5 rounded-xl text-sm bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]">
                {phone || "لا يوجد رقم"}
              </div>
            </div>

            {/* New phone input */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">
                الرقم الجديد
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => { setNewPhone(e.target.value); setPhoneError(""); }}
                placeholder="01012345678"
                maxLength={11}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors"
                style={{
                  background:   "var(--color-surface)",
                  borderColor:  phoneError ? "#EF4444" : "var(--color-border)",
                  color:        "var(--color-secondary)",
                }}
              />
              {phoneError && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: "#EF4444" }}>
                  ⚠ {phoneError}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSavePhone}
                disabled={phoneSaving}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-60"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                {phoneSaving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={phoneSaving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-colors"
                style={{ color: "var(--color-muted)", borderColor: "var(--color-border)" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
