"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Restaurant = { id: string; name: string; phone: string | null };

export default function RequestDeliveryPage() {
  const router = useRouter();
  const [restaurants,  setRestaurants]  = useState<Restaurant[]>([]);
  const [selected,     setSelected]     = useState<Restaurant | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [newName,      setNewName]      = useState("");
  const [newPhone,     setNewPhone]     = useState("");
  const [adding,       setAdding]       = useState(false);
  const [modalError,   setModalError]   = useState("");

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, phone")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => setRestaurants(data ?? []));
  }, []);

  async function handleAddRestaurant() {
    if (!newName.trim()) { setModalError("اسم المطعم مطلوب"); return; }
    if (!newPhone.trim()) { setModalError("رقم الهاتف مطلوب"); return; }
    setAdding(true);
    setModalError("");
    const { data, error } = await supabase
      .from("restaurants")
      .insert({ name: newName.trim(), phone: newPhone.trim(), is_active: true, status: "قيد الإنشاء" })
      .select("id, name, phone")
      .single();
    setAdding(false);
    if (error || !data) {
      console.error("Error adding restaurant:", error);
      setModalError("فشل الإضافة: " + (error?.message ?? "خطأ غير معروف"));
      return;
    }
    setRestaurants((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name, "ar")));
    setSelected(data);
    setShowModal(false);
    setNewName(""); setNewPhone("");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl"
      style={{ fontFamily: "var(--font-cairo, Cairo, sans-serif)" }}>

      <div className="mx-auto w-full max-w-[430px] flex flex-col flex-1 px-4 pt-12 pb-8 gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">طلب دليفري</h1>
          <p className="text-sm text-[#6B7280] mt-1">اختر المطعم اللي عاوز توصّل منه</p>
        </div>

        {/* Dropdown + زرار إضافة */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-[#1A1A1A]">اختر المطعم</label>
          <select
            value={selected?.id ?? ""}
            onChange={(e) => {
              const r = restaurants.find((x) => x.id === e.target.value) ?? null;
              setSelected(r);
            }}
            className="w-full rounded-2xl border border-[#E5E7EB] px-4 py-3.5 text-sm outline-none bg-[#F9FAFB] text-[#1A1A1A]"
          >
            <option value="" disabled>اختر مطعماً</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setShowModal(true); setModalError(""); }}
            className="self-start text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            style={{ background: "#D1FAE5", color: "#059669" }}
          >
            + إضافة مطعم توصيل فقط
          </button>
        </div>

        {/* زرار التالي */}
        <div className="mt-auto">
          <button
            disabled={!selected}
            onClick={() => router.push(`/request-delivery/confirm?restaurant=${selected!.id}`)}
            className="w-full py-4 rounded-2xl text-base font-black text-white transition-opacity disabled:opacity-40"
            style={{ background: "#FF6000" }}
          >
            التالي ←
          </button>
        </div>
      </div>

      {/* Modal إضافة مطعم */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-5 py-6 flex flex-col gap-4" dir="rtl">
            <h2 className="text-base font-black text-[#1A1A1A]">إضافة مطعم توصيل فقط</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">اسم المطعم *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: شاورما حسن"
                className="rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">رقم الهاتف *</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none" />
            </div>

            {modalError && <p className="text-xs text-red-500">{modalError}</p>}

            <div className="flex gap-3">
              <button onClick={handleAddRestaurant} disabled={adding}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#FF6000" }}>
                {adding ? "جاري الإضافة..." : "إضافة"}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold border border-[#E5E7EB] text-[#6B7280]">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
