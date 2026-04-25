"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Area = { id: string; name: string };

interface FormField {
  label: string;
  key: string;
  placeholder: string;
  required: boolean;
  type?: string;
}

const fields: FormField[] = [
  { label: "تسمية العنوان", key: "label",     placeholder: "مثال: البيت، الشغل",    required: true  },
  { label: "رقم العمارة",   key: "building",  placeholder: "رقم العمارة",            required: true  },
  { label: "رقم الشقة",    key: "apartment", placeholder: "رقم الشقة",             required: false },
  { label: "الدور",         key: "floor",     placeholder: "رقم الدور",             required: false },
  { label: "علامة مميزة",   key: "landmark",  placeholder: "مثال: بجوار المسجد",    required: false },
];

export default function NewAddressPage() {
  const router = useRouter();

  const [areas, setAreas]   = useState<Area[]>([]);
  const [area, setArea]     = useState("");
  const [form, setForm]     = useState<Record<string, string>>({
    label: "", building: "", apartment: "", floor: "", landmark: "",
  });
  const [phone, setPhone]       = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: areasData }, { data: { user } }] = await Promise.all([
        supabase.from("areas").select("id, name"),
        supabase.auth.getUser(),
      ]);
      setAreas(areasData ?? []);
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("phone")
          .eq("id", user.id)
          .single();
        const p = userData?.phone ?? "";
        setPhone(p);
        setSavedPhone(p);
      }
    }
    load();
  }, []);

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setError(null);
    if (!area)         return setError("الرجاء اختيار الحي");
    if (!form.label)   return setError("الرجاء إدخال تسمية العنوان");
    if (!form.building) return setError("الرجاء إدخال رقم العمارة");
    if (!savedPhone) {
      if (!phone)              return setError("الرجاء إدخال رقم الهاتف");
      if (phone.length !== 11) return setError("رقم الهاتف يجب أن يكون 11 رقم");
    }

    const full_address = [
      `عمارة ${form.building}`,
      form.apartment ? `شقة ${form.apartment}` : null,
      form.floor     ? `الدور ${form.floor}`   : null,
      form.landmark  || null,
    ].filter(Boolean).join("، ");

    setSaving(true);
    if (phone !== savedPhone && userId) {
      await supabase.from("users").update({ phone }).eq("id", userId);
    }
    const { count } = await supabase
      .from("addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const is_default = count === 0;

    const { error: insertError } = await supabase.from("addresses").insert({
      user_id:      userId,
      area_id:      area,
      label:        form.label,
      building:     form.building,
      apartment:    form.apartment || null,
      floor:        form.floor     || null,
      landmark:     form.landmark  || null,
      full_address,
      is_default,
    });
    setSaving(false);

    if (insertError) {
      setError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
      return;
    }
    router.push("/address");
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-[430px]">

        {/* ── Header ── */}
        <header className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            {/* يمين: رجوع */}
            <Link href="/address"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            {/* وسط */}
            <h1 className="text-base font-black text-[var(--color-secondary)]">عنوان جديد</h1>

            {/* فراغ توازن */}
            <div className="w-9" />
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
                type={field.type ?? "text"}
                value={form[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full text-sm bg-transparent outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
              />
            </div>
          ))}

          {/* ── 7. رقم الهاتف ── */}
          {!savedPhone && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-3">
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1.5">
                رقم الهاتف <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full text-sm bg-transparent outline-none text-[var(--color-secondary)] placeholder:text-[var(--color-muted)]"
                dir="ltr"
              />
            </div>
          )}

          {/* ── خطأ ── */}
          {error && (
            <p className="text-sm text-[var(--color-danger)] font-semibold text-center">{error}</p>
          )}

        </main>

        {/* ── Bottom: حفظ ── */}
        <div className="fixed bottom-0 right-0 left-0 z-20">
          <div className="mx-auto w-full max-w-[430px] px-4 pb-6 pt-2 bg-white border-t border-[var(--color-border)]">
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
