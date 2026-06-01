"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCart } from "@/lib/cart";

type Address = {
  id: string;
  label: string;
  full_address: string;
  area_id: string | null;
  is_default: boolean;
};

function BackArrow() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

export default function AddressPage() {
  const router          = useRouter();
  const [addresses,     setAddresses]     = useState<Address[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [hasCart,       setHasCart]       = useState(false);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const cart = getCart();
    setHasCart((cart?.items?.length ?? 0) > 0);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("addresses")
        .select("id, label, full_address, area_id, is_default")
        .eq("user_id", user.id);

      setAddresses(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function setDefault(addressId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true  }).eq("id", addressId);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === addressId })));
  }

  async function deleteAddress(addressId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setDeletingId(addressId);

    const target     = addresses.find((a) => a.id === addressId);
    const wasDefault = target?.is_default ?? false;

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId);

    if (error) { setDeletingId(null); return; }

    const remaining = addresses.filter((a) => a.id !== addressId);

    if (wasDefault && remaining.length > 0) {
      await supabase.from("addresses").update({ is_default: true }).eq("id", remaining[0].id);
      remaining[0] = { ...remaining[0], is_default: true };
    }

    setAddresses(remaining);
    setDeletingId(null);
  }

  const hasDefault      = addresses.some((a) => a.is_default);
  const showCheckoutBtn = hasCart && hasDefault;

  /* BottomNav height ≈ 56px → button sits at bottom-14 (3.5rem = 56px) */
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="w-full">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <BackArrow />
            <h1 className="text-base font-black text-[var(--color-secondary)]">العناوين</h1>
            <Link href="/address/new"
              className="text-sm font-bold text-[var(--color-primary)]">
              أضف
            </Link>
          </div>
        </header>

        <main className={`px-4 pt-6 ${showCheckoutBtn ? "pb-40" : "pb-24"}`}>

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
                <div
                  key={addr.id}
                  className="w-full flex items-start gap-3 bg-white rounded-2xl p-4 border-2 border-[var(--color-border)] text-right transition-colors active:border-[var(--color-primary)]"
                >
                  {/* أيقونة */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--color-surface)] cursor-pointer"
                    onClick={() => router.push(`/address/${addr.id}`)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>

                  {/* النص */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/address/${addr.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--color-secondary)]">{addr.label}</p>
                      {addr.is_default && (
                        <span className="text-[10px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)] px-2 py-0.5 rounded-full">
                          افتراضي ✓
                        </span>
                      )}
                    </div>
                    {!addr.is_default && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDefault(addr.id); }}
                        className="text-[11px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)] px-2.5 py-0.5 rounded-lg mt-1 active:scale-[0.97] transition-transform"
                      >
                        تعيين كافتراضي
                      </button>
                    )}
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{addr.full_address}</p>
                  </div>

                  {/* حذف */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(addr.id); }}
                    disabled={deletingId === addr.id}
                    className="flex-shrink-0 mt-1 w-7 h-7 rounded-full bg-red-50 flex items-center justify-center disabled:opacity-40"
                  >
                    {deletingId === addr.id ? (
                      <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* ── زرار متابعة تأكيد الطلب (فوق الـ BottomNav بـ 56px) ── */}
        {showCheckoutBtn && (
          <div className="fixed bottom-14 left-0 right-0 z-30 px-4 py-2">
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
            >
              متابعة تأكيد الطلب
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          </div>
        )}

      </div>

      {/* ── Confirm Delete Popup ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl mx-4 p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <p className="text-base font-black text-[var(--color-secondary)]">حذف العنوان؟</p>
              <p className="text-sm text-[var(--color-muted)]">
                {addresses.find((a) => a.id === confirmDelete)?.label ?? "هذا العنوان"} — لن تتمكن من استعادته
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border-2 border-[var(--color-border)] text-[var(--color-secondary)] text-sm font-bold py-2.5 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const id = confirmDelete;
                  setConfirmDelete(null);
                  deleteAddress(id);
                }}
                className="flex-1 bg-[#EF4444] text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
