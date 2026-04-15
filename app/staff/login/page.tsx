"use client";

import { useState } from "react";
import { supabasePublic } from "@/lib/supabasePublic";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  orange: "#F97316",
  red:    "#EF4444",
};

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m1 1 22 22" />
    </svg>
  );
}

export default function StaffLoginPage() {
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!phone.trim())    { setError("أدخل رقم الهاتف"); return; }
    if (!password.trim()) { setError("أدخل كلمة المرور"); return; }

    console.log("PHONE:", phone);
    console.log("PASSWORD:", password);

    setError("");
    setLoading(true);

    const { data, error } = await supabasePublic
      .from("staff")
      .select("*")
      .eq("phone", phone.trim())
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("بيانات غير صحيحة");
      setLoading(false);
      return;
    }

    localStorage.setItem("staff_user", JSON.stringify(data));
    /* Set a cookie so the Edge middleware allows /admin/* access */
    document.cookie = "staff_session=1; path=/; SameSite=Lax";
    window.location.href = "/admin/orders";
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: C.bg, fontFamily: "var(--font-cairo), Arial, sans-serif", direction: "rtl" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8 flex flex-col gap-6"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        {/* ── Logo ── */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1"
            style={{ background: `${C.teal}20`, border: `1px solid ${C.teal}40` }}>
            ⚡
          </div>
          <p className="text-2xl font-black" style={{ color: C.teal }}>حالا</p>
          <p className="text-xs"            style={{ color: C.muted }}>لوحة التحكم</p>
        </div>

        {/* ── Title ── */}
        <p className="text-center text-lg font-black" style={{ color: C.text }}>
          تسجيل دخول الموظف
        </p>

        {/* ── Form ── */}
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="flex flex-col gap-4">

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: C.bg,
                border: `1px solid ${error ? C.red : C.border}`,
                color: C.text,
              }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: C.muted }}>
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: C.bg,
                  border: `1px solid ${error ? C.red : C.border}`,
                  color: C.text,
                  paddingLeft: "40px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute top-1/2 -translate-y-1/2 left-3 transition-colors"
                style={{ color: C.muted }}
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-center py-2 px-3 rounded-xl"
              style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` }}>
              ⚠ {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-black transition-opacity hover:opacity-90 mt-1"
            style={{ background: C.orange, color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
