"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BlockedScreen() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("whatsapp_number")
      .single()
      .then(({ data }) => {
        if (data?.whatsapp_number) setWhatsapp(data.whatsapp_number);
      });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`
    : "https://wa.me/";

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center"
      style={{ direction: "rtl" }}
    >
      <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <span style={{ fontSize: 48 }}>🚫</span>
      </div>

      <h1 className="text-xl font-black text-[#1A1A1A] mb-3">
        تم حظر حسابك
      </h1>

      <p className="text-sm text-gray-500 leading-relaxed max-w-[300px] mb-8">
        تم إيقاف حسابك من قِبل الإدارة.
        <br />
        للاستفسار تواصل معنا على واتساب.
      </p>

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-[300px] py-4 rounded-2xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 mb-3 active:scale-[0.97] transition-transform"
      >
        <span>💬</span>
        تواصل مع الإدارة على واتساب
      </a>

      <button
        onClick={handleLogout}
        className="text-xs text-gray-400 underline mt-2"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
