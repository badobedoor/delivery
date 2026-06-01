"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Coupon = {
  id:                   string;
  code:                 string;
  type:                 string;
  value:                number | null;
  applies_to:           string | null;
  expires_at:           string | null;
  is_active:            boolean;
  ad_title?:            string | null;
  ad_description?:      string | null;
  used_count?:          number | null;
  usage_limit_total?:   number | null;
  usage_limit_per_user?: number | null;
};

type TabKey = "valid" | "used";

const tabs: { key: TabKey; label: string }[] = [
  { key: "valid", label: "صالح"         },
  { key: "used",  label: "تم الاستخدام" },
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

function CouponCard({ coupon, isUsed }: { coupon: Coupon; isUsed: boolean }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-md transition-opacity ${isUsed ? "opacity-60" : ""}`}
      style={{ background: "linear-gradient(135deg, #F97316 0%, #C2410C 100%)" }}
    >
      <div className="px-5 pt-5 pb-4">

        {/* العنوان */}
        <p className="text-lg font-black text-white">
          {coupon.ad_title || formatDiscount(coupon)}
        </p>

        {/* الوصف */}
        {coupon.ad_description && (
          <p className="text-sm text-white/80 mt-1 leading-relaxed">{coupon.ad_description}</p>
        )}

        {/* الكود */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 border-2 border-dashed border-white/60 rounded-xl px-3 py-2">
            <p className="text-base font-black text-white tracking-widest text-center">
              {coupon.code}
            </p>
          </div>

          {isUsed ? (
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-2.5 rounded-xl flex-shrink-0 text-center">
              تم الاستخدام
            </span>
          ) : (
            <button
              onClick={copyCode}
              className="bg-white text-[#FF6000] text-sm font-bold px-4 py-2.5 rounded-xl flex-shrink-0 active:scale-[0.97] transition-transform"
            >
              {copied ? "✓ تم النسخ" : "انسخ الكود"}
            </button>
          )}
        </div>

        {/* تاريخ الانتهاء */}
        {coupon.expires_at && (
          <p className="text-xs text-white/70 mt-3">
            ينتهي في {formatArabicDate(coupon.expires_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("valid");
  const [valid,   setValid]   = useState<Coupon[]>([]);
  const [used,    setUsed]    = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      console.log("[coupons] user.id:", user.id);

      const [publicRes, usageRes] = await Promise.all([
        /* تاب "صالح" — الكوبونات العامة النشطة */
        supabase
          .from("coupons")
          .select("id, code, type, value, applies_to, min_order, expires_at, is_active, used_count, usage_limit_total, usage_limit_per_user, visibility, ad_title, ad_description")
          .eq("visibility", "public")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),

        /* تاب "تم الاستخدام" — كوبونات العميل المستخدمة */
        supabase
          .from("coupon_usages")
          .select("*, coupons(id, code, type, value, applies_to, expires_at, ad_title, ad_description)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      console.log("[coupons] publicRes data:", publicRes.data, "| error:", publicRes.error);
      console.log("[coupons] usageRes data:", usageRes.data,  "| error:", usageRes.error);

      /* map: coupon_id → user's personal used_count */
      const userUsage: Record<string, number> = {};
      for (const row of (usageRes.data ?? [])) {
        userUsage[row.coupon_id] = row.used_count ?? 0;
      }

      const allValid = (publicRes.data ?? []) as Coupon[];
      const filtered = allValid.filter((c) => {
        if (c.usage_limit_total != null && (c.used_count ?? 0) >= c.usage_limit_total) return false;
        if (c.usage_limit_per_user != null && (userUsage[c.id] ?? 0) >= c.usage_limit_per_user) return false;
        return true;
      });

      setValid(filtered);

      const usedCoupons: Coupon[] = (usageRes.data ?? []).map((row: any) => ({
        id:             row.coupons?.id             ?? row.coupon_id,
        code:           row.coupons?.code           ?? "",
        type:           row.coupons?.type           ?? "",
        value:          row.coupons?.value          ?? null,
        applies_to:     row.coupons?.applies_to     ?? null,
        expires_at:     row.coupons?.expires_at     ?? null,
        is_active:      true,
        ad_title:       row.coupons?.ad_title       ?? null,
        ad_description: row.coupons?.ad_description ?? null,
      }));

      console.log("[coupons] usedCoupons mapped:", usedCoupons);
      setUsed(usedCoupons);
      setLoading(false);
    }
    load();
  }, []);

  const lists: Record<TabKey, Coupon[]> = { valid, used };
  const current = lists[activeTab];

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

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
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  isUsed={activeTab === "used"}
                />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
