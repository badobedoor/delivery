"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Address = {
  id: string;
  label: string;
  full_address: string;
  area_id: string | null;
};

function BackArrow() {
  return (
    <Link href="/"
      className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function AddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("addresses")
        .select("id, label, full_address, area_id")
        .eq("user_id", user.id);

      setAddresses(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            {/* يمين: رجوع */}
            <BackArrow />

            {/* وسط: العنوان */}
            <h1 className="text-base font-black text-[var(--color-secondary)]">العناوين</h1>

            {/* يسار: أضف */}
            <Link href="/address/new"
              className="text-sm font-bold text-[var(--color-primary)]">
              أضف
            </Link>
          </div>
        </header>

        <main className="px-4 pt-6 pb-10">

          {loading ? (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : addresses.length === 0 ? (
            /* ── حالة فارغة ── */
            <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
              <span className="text-7xl">📍</span>
              <p className="text-base font-bold text-[var(--color-secondary)]">
                يبدو أنك لم تحفظ عنواناً
              </p>
              <p className="text-sm text-[var(--color-muted)]">لا يوجد عنوان مسجل</p>
              <Link
                href="/address/new"
                className="mt-2 bg-[var(--color-primary)] text-white text-sm font-bold px-8 py-3 rounded-2xl"
              >
                أضف عنوان
              </Link>
            </div>
          ) : (
            /* ── قائمة العناوين ── */
            <div className="flex flex-col gap-3">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => router.push(`/address/${addr.id}`)}
                  className="w-full flex items-start gap-3 bg-white rounded-2xl p-4 border-2 border-[var(--color-border)] text-right transition-colors active:border-[var(--color-primary)]"
                >
                  {/* أيقونة */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--color-surface)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>

                  {/* النص */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)]">{addr.label}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{addr.full_address}</p>
                  </div>

                  {/* سهم */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round"
                    className="flex-shrink-0 mt-1">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
