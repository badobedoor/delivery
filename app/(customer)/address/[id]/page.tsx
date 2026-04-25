"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Area = { id: string; name: string };

interface FormField {
  label: string;
  key: string;
  placeholder: string;
  required: boolean;
}

const fields: FormField[] = [
  { label: "تسمية العنوان", key: "label",     placeholder: "مثال: البيت، الشغل",    required: true  },
  { label: "رقم العمارة",   key: "building",  placeholder: "رقم العمارة",            required: true  },
  { label: "رقم الشقة",    key: "apartment", placeholder: "رقم الشقة",             required: false },
  { label: "الدور",         key: "floor",     placeholder: "رقم الدور",             required: false },
  { label: "علامة مميزة",   key: "landmark",  placeholder: "مثال: بجوار المسجد",    required: false },
];

export default function EditAddressPage() {
  const router   = useRouter();
  const { id }   = useParams<{ id: string }>();

  const [areas, setAreas]   = useState<Area[]>([]);
  const [area, setArea]     = useState("");
  const [form, setForm]     = useState<Record<string, string>>({
    label: "", building: "", apartment: "", floor: "", landmark: "",
  });
  const [isDefault, setIsDefault] = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: areasData }, { data: addrData }, { data: { user } }] = await Promise.all([
        supabase.from("areas").select("id, name"),
        supabase.from("addresses").select("id, label, area_id, building, apartment, floor, landmark, full_address, is_default").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);

      setAreas(areasData ?? []);
      setUserId(user?.id ?? null);

      if (addrData) {
        setArea(addrData.area_id ?? "");
        setForm({
          label:     addrData.label     ?? "",
          building:  addrData.building  ?? "",
          apartment: addrData.apartment ?? "",
          floor:     addrData.floor     ?? "",
          landmark:  addrData.landmark  ?? "",
        });
        setIsDefault(addrData.is_default ?? false);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setError(null);
    if (!area)       return setError("الرجاء اختيار الحي");
    if (!form.label) return setError("الرجاء إدخال تسمية العنوان");

    const full_address = [
      form.building  ? `عمارة ${form.building}` : null,
      form.apartment ? `شقة ${form.apartment}`   : null,
      form.floor     ? `الدور ${form.floor}`      : null,
      form.landmark  || null,
    ].filter(Boolean).join("، ") || form.landmark;

    setSaving(true);
    const { error: updateError } = await supabase
      .from("addresses")
      .update({ area_id: area, label: form.label, full_address })
      .eq("id", id);
    setSaving(false);

    if (updateError) { setError("حدث خطأ أثناء الحفظ، حاول مرة أخرى"); return; }
    router.push("/address");
  }

  async function handleSetDefault() {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true  }).eq("id", id);
    setIsDefault(true);
  }

  async function handleDelete() {
    if (!confirm("هل تريد حذف هذا العنوان؟")) return;
    setDeleting(true);
    await supabase.from("addresses").delete().eq("id", id);
    router.push("/address");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/address"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <h1 className="text-base font-black text-[var(--color-secondary)]">تعديل العنوان</h1>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center disabled:opacity-50"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </header>

        <main className="px-4 pt-5 pb-32 flex flex-col gap-4">

          {/* ── 1. الحي ── */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-3">
            <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1.5">
              الحي <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full text-sm bg-transparent outline-none text-[var(--color-secondary)] appearance-none cursor-pointer"
            >
              <option value="" disabled>اختر الحي</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* ── 2–6. حقول النص ── */}
          {fields.map((field) => (
            <div key={field.key}
              className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-3">
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1.5">
                {field.label}
                {field.required
                  ? <span className="text-[var(--color-danger)]"> *</span>
                  : <span className="text-[var(--color-muted)] font-normal"> (اختياري)</span>
                }
              </label>
              <input
                type="text"
                value={form[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full text-sm bg-transparent outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-[var(--color-danger)] font-semibold text-center">{error}</p>
          )}

        </main>

        {/* ── Bottom: حفظ ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-2 bg-white border-t border-[var(--color-border)] flex flex-col gap-2">
            {isDefault ? (
              <p className="text-sm font-semibold text-[var(--color-primary)] text-center py-1">
                ✓ هذا هو عنوانك الافتراضي
              </p>
            ) : (
              <button
                onClick={handleSetDefault}
                className="w-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                اجعله افتراضي
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[var(--color-primary)] text-white text-sm font-bold py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "حفظ العنوان"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
