"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ── Types ── */
type OrderItem = {
  id: string;
  quantity: number;
  price_at_order: number;
  extras: { name: string; price: number }[] | null;
  menu_items: { name: string; image_url: string | null } | null;
};

type Order = {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  notes: string | null;
  addresses: { label: string; full_address: string } | null;
  order_items: OrderItem[];
};

/* ── Status config ── */
const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  new:         { label: "جديد",          bg: "bg-orange-100",  text: "text-orange-600"  },
  pending:     { label: "قيد التنفيذ",   bg: "bg-yellow-100",  text: "text-yellow-700"  },
  on_the_way:  { label: "في الطريق",     bg: "bg-blue-100",    text: "text-blue-600"    },
  delivered:   { label: "تم التوصيل",    bg: "bg-green-100",   text: "text-green-600"   },
  cancelled:   { label: "ملغي",          bg: "bg-red-100",     text: "text-red-600"     },
};

function statusConfig(status: string) {
  return STATUS_MAP[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";

export default function OrderDetailPage() {
  const { id }  = useParams<{ id: string }>();

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, subtotal, delivery_fee, total, created_at, notes,
          addresses (label, full_address),
          order_items (
            id, quantity, price_at_order, extras,
            menu_items (name, image_url)
          )
        `)
        .eq("id", id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setOrder(data as Order);
      setLoading(false);
    }
    load();
  }, [id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-base font-bold text-[var(--color-secondary)]">الطلب غير موجود</p>
        <Link href="/orders" className="text-sm text-[var(--color-primary)] underline">
          العودة للطلبات
        </Link>
      </div>
    );
  }

  const status = statusConfig(order.status);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── 1. Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/orders"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <div className="text-center">
              <h1 className="text-base font-black text-[var(--color-secondary)]">تفاصيل الطلب</h1>
              <p className="text-[10px] text-[var(--color-muted)] mt-0.5 font-mono">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 pt-4 pb-36">

          {/* ── 2. حالة الأوردر ── */}
          <section className="bg-white rounded-2xl p-4 mb-3 flex flex-col items-center gap-2">
            <span className={`text-sm font-black px-5 py-2 rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <p className="text-xs text-[var(--color-muted)]">{formatDate(order.created_at)}</p>
          </section>

          {/* ── 3. عنوان التوصيل ── */}
          {order.addresses && (
            <section className="bg-white rounded-2xl p-4 mb-3">
              <p className="text-[10px] font-bold text-[var(--color-muted)] mb-2 uppercase tracking-wide">
                عنوان التوصيل
              </p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-secondary)]">{order.addresses.label}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{order.addresses.full_address}</p>
                </div>
              </div>
            </section>
          )}

          {/* ── 4. تفاصيل الطلب ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              تفاصيل الطلب
            </p>
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  {/* صورة */}
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={item.menu_items?.image_url ?? FALLBACK_IMG}
                      alt={item.menu_items?.name ?? ""}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* معلومات */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-secondary)] truncate">
                      {item.menu_items?.name ?? "—"}
                    </p>
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                        {item.extras.map((e) => e.name).join("، ")}
                      </p>
                    )}
                  </div>
                  {/* الكمية والسعر */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-white bg-[var(--color-primary)] w-5 h-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-secondary)]">
                      {item.price_at_order * item.quantity} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. ملخص الدفع ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              ملخص الدفع
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">المجموع</span>
                <span className="text-sm text-[var(--color-secondary)]">{order.subtotal} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--color-muted)]">رسوم التوصيل</span>
                <span className="text-sm text-[var(--color-secondary)]">{order.delivery_fee} ج.م</span>
              </div>
              <div className="border-t border-[var(--color-border)] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-black text-[var(--color-secondary)]">قيمة الطلب</span>
                <span className="text-sm font-black text-[var(--color-secondary)]">{order.total} ج.م</span>
              </div>
            </div>
          </section>

          {/* ── 6. طريقة الدفع ── */}
          <section className="bg-white rounded-2xl p-4 mb-3">
            <p className="text-[10px] font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wide">
              طريقة الدفع
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 14h2" />
                  <path d="M10 14h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-secondary)]">الدفع عند الاستلام (كاش)</p>
            </div>
          </section>

        </main>

        {/* ── Bottom Bar ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-[var(--color-border)]">
            <Link
              href="/"
              className="w-full bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
