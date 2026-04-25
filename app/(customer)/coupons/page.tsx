"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number | null;
  applies_to: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type TabKey = "valid" | "used" | "expired";

const tabs: { key: TabKey; label: string }[] = [
  { key: "valid",   label: "صالح"   },
  { key: "used",    label: "استخدم" },
  { key: "expired", label: "انتهت"  },
];

function formatDiscount(coupon: Coupon): string {
  const target = coupon.applies_to === "توصيل" ? "التوصيل" : "الطلب";
  if (coupon.type === "نسبة مئوية") return `خصم ${coupon.value}% على ${target}`;
  if (coupon.type === "قيمة ثابتة") return `خصم ${coupon.value} جنيه على ${target}`;
  return "توصيل مجاني";
}

function formatArabicDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center">
      <span className="text-6xl">🎫</span>
      <p className="text-base font-bold text-[var(--color-secondary)]">لا يوجد قسائم</p>
    </div>
  );
}

function CouponCard({ coupon, showUse }: { coupon: Coupon; showUse: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden flex">
      <div className="w-1.5 bg-[var(--color-primary)] flex-shrink-0" />
      <div className="flex-1 py-4 px-4">
        <p className="text-base font-black text-[var(--color-primary)] tracking-widest">
          {coupon.code}
        </p>
        <p className="text-sm font-semibold text-[var(--color-secondary)] mt-0.5">
          {formatDiscount(coupon)}
        </p>
        {coupon.expires_at && (
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            ينتهي في {formatArabicDate(coupon.expires_at)}
          </p>
        )}
        {showUse && (
          <>
            <div className="border-t-2 border-dashed border-[var(--color-border)] my-3" />
            <div className="flex justify-end">
              <button
                onClick={handleCopy}
                className="text-sm font-bold text-[var(--color-primary)] border-2 border-[var(--color-primary)] px-4 py-1.5 rounded-xl active:scale-[0.98] transition-transform"
              >
                {copied ? "تم النسخ ✓" : "نسخ الكود"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("valid");
  const [valid,   setValid]   = useState<Coupon[]>([]);
  const [used,    setUsed]    = useState<Coupon[]>([]);
  const [expired, setExpired] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      const [couponsRes, usageRes] = await Promise.all([
        supabase.from("coupons").select("id, code, type, value, applies_to, expires_at, is_active"),
        user
          ? supabase.from("coupon_usage").select("coupon_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { coupon_id: string }[], error: null }),
      ]);

      const coupons: Coupon[] = couponsRes.data ?? [];
      const usedIds = new Set((usageRes.data ?? []).map((r) => r.coupon_id));
      const now = new Date();

      setUsed(coupons.filter((c) => usedIds.has(c.id)));
      setExpired(coupons.filter((c) =>
        !usedIds.has(c.id) && (!c.is_active || (c.expires_at ? new Date(c.expires_at) < now : false))
      ));
      setValid(coupons.filter((c) =>
        !usedIds.has(c.id) && c.is_active && (!c.expires_at || new Date(c.expires_at) >= now)
      ));

      setLoading(false);
    }
    load();
  }, []);

  const lists: Record<TabKey, Coupon[]> = { valid, used, expired };
  const current = lists[activeTab];

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-0 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between pb-4">
            <Link href="/account"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <h1 className="text-base font-black text-[var(--color-secondary)]">القسائم</h1>
            <div className="w-9" />
          </div>

          {/* ── Tabs ── */}
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-sm font-bold text-center border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pt-4 pb-10">
          {loading ? (
            <div className="flex justify-center pt-24">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : current.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {current.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} showUse={activeTab === "valid"} />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
