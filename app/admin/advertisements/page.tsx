"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  red:    "#EF4444",
  orange: "#F97316",
};

/* ─────────────────────── Types ─────────────────────── */

type Ad = {
  id:          string;        // UUID
  image_url:   string;        // NOT NULL
  link:        string | null;
  page:        string;
  order_index: number;
  starts_at:   string | null;
  ends_at:     string | null;
  is_active:   boolean;
};

type AdForm = {
  link:        string;
  page:        string;
  order_index: string;
  starts_at:   string;
  ends_at:     string;
  is_active:   boolean;
};

type AdErrors = Partial<Record<
  "image" | "link" | "page" | "order_index" | "starts_at" | "ends_at",
  string
>>;

const PAGES = ["الرئيسية", "المطاعم", "كل الصفحات"];

const emptyForm: AdForm = {
  link:        "",
  page:        "الرئيسية",
  order_index: "1",
  starts_at:   "",
  ends_at:     "",
  is_active:   true,
};

/* ─────────────────────── Image upload ──────────────── */

async function uploadAdImage(file: File): Promise<string | null> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `ads/ad-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("restaurants")
    .upload(path, file, { upsert: true });
  if (error) { console.error("Ad upload error:", error.message); return null; }
  const { data } = supabase.storage.from("restaurants").getPublicUrl(path);
  return data.publicUrl;
}

/* ─────────────────────── Validation ────────────────── */

function validate(form: AdForm, imageFile: File | null, isEdit: boolean, existingImage: string | null): AdErrors {
  const errs: AdErrors = {};

  if (!isEdit && !imageFile && !existingImage)
    errs.image = "صورة الإعلان مطلوبة";

  if (!form.page.trim())
    errs.page = "الصفحة مطلوبة";

  const ord = Number(form.order_index);
  if (!form.order_index.trim() || isNaN(ord) || !Number.isInteger(ord) || ord < 1)
    errs.order_index = "الترتيب لازم يكون رقم صحيح أكبر من صفر";

  if (form.link.trim() && !/^https?:\/\/.+/.test(form.link.trim()))
    errs.link = "الرابط لازم يبدأ بـ http:// أو https://";

  if (!form.starts_at)
    errs.starts_at = "تاريخ البداية مطلوب";

  if (!form.ends_at)
    errs.ends_at = "تاريخ النهاية مطلوب";
  else if (form.starts_at && form.ends_at < form.starts_at)
    errs.ends_at = "تاريخ النهاية لازم يكون بعد تاريخ البداية";

  return errs;
}

/* ─────────────────────── Shared UI ─────────────────── */

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium" style={{ color: C.red }}>{error}</p>}
    </div>
  );
}

function iStyle(hasError?: boolean) {
  return {
    background:  C.bg,
    border:      `1px solid ${hasError ? C.red : C.border}`,
    color:       C.text,
    colorScheme: "dark" as const,
  };
}

/* ─────────────────────── Delete modal ──────────────── */

function DeleteModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-base font-black text-center" style={{ color: C.text }}>حذف الإعلان</p>
        <p className="text-sm text-center" style={{ color: C.muted }}>هل تريد حذف هذا الإعلان؟ لا يمكن التراجع.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: C.red, color: "#fff" }}>حذف</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Ad modal ──────────────────── */

function AdModal({
  title, form, onChange, onSave, onClose,
  errors, saving, saveError,
  imagePreview, onImagePick, imageError,
}: {
  title:        string;
  form:         AdForm;
  onChange:     (f: AdForm) => void;
  onSave:       () => void;
  onClose:      () => void;
  errors:       AdErrors;
  saving:       boolean;
  saveError:    string | null;
  imagePreview: string | null;
  onImagePick:  (file: File) => void;
  imageError:   string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof AdForm>(k: K, v: AdForm[K]) {
    onChange({ ...form, [k]: v });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onImagePick(f);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (!saving && e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0"
          style={{ borderColor: C.border }}>
          <p className="text-base font-black" style={{ color: C.text }}>{title}</p>
          <button onClick={onClose} disabled={saving}
            className="text-xl leading-none disabled:opacity-40" style={{ color: C.muted }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">

          {/* General error banner */}
          {saveError && (
            <div className="rounded-xl px-3 py-2.5 text-sm"
              style={{ background: `${C.red}18`, border: `1px solid ${C.red}55`, color: C.red }}>
              {saveError}
            </div>
          )}

          {/* Image upload — required */}
          <Field label="صورة الإعلان" required error={imageError ?? errors.image}>
            <div
              className="rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-80"
              style={{ border: `2px dashed ${(imageError || errors.image) ? C.red : C.border}` }}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative w-full" style={{ aspectRatio: "16/6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.45)" }}>
                    <span className="text-xs font-bold text-white">تغيير الصورة</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6"
                  style={{ background: C.bg }}>
                  <span className="text-3xl">🖼️</span>
                  <p className="text-xs" style={{ color: C.muted }}>اضغط لرفع صورة الإعلان</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </Field>

          {/* Link (optional) */}
          <Field label="رابط الإعلان" error={errors.link}>
            <input
              type="url"
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={iStyle(!!errors.link)}
            />
          </Field>

          {/* Page */}
          <Field label="الصفحة" required error={errors.page}>
            <select
              value={form.page}
              onChange={(e) => set("page", e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={iStyle(!!errors.page)}
            >
              {PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {/* Order index */}
          <Field label="الترتيب" required error={errors.order_index}>
            <input
              type="number" min="1" step="1"
              value={form.order_index}
              onChange={(e) => set("order_index", e.target.value)}
              placeholder="1"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={iStyle(!!errors.order_index)}
            />
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البداية" required error={errors.starts_at}>
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={iStyle(!!errors.starts_at)}
              />
            </Field>
            <Field label="تاريخ النهاية" required error={errors.ends_at}>
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={iStyle(!!errors.ends_at)}
              />
            </Field>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: C.muted }}>الحالة</span>
            <button
              onClick={() => set("is_active", !form.is_active)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: form.is_active ? C.teal : C.border }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ right: form.is_active ? "2px" : "auto", left: form.is_active ? "auto" : "2px" }} />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t flex-shrink-0" style={{ borderColor: C.border }}>
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: C.orange, color: "#fff" }}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Page ──────────────────────── */

export default function AdminAdvertisementsPage() {
  const [rows,      setRows]      = useState<Ad[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [modal,     setModal]     = useState<"add" | "edit" | null>(null);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [form,      setForm]      = useState<AdForm>(emptyForm);
  const [errors,    setErrors]    = useState<AdErrors>({});
  const [deleteId,  setDeleteId]  = useState<string | null>(null);

  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError,   setImageError]   = useState<string | null>(null);

  /* ── Fetch ── */
  async function fetchAds() {
    setLoading(true);
    const { data, error } = await supabase
      .from("advertisements")
      .select("id, image_url, link, page, order_index, starts_at, ends_at, is_active")
      .order("order_index", { ascending: true });
    if (error) console.error("fetchAds:", error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAds(); }, []);

  /* ── Modal helpers ── */
  function openAdd() {
    setForm(emptyForm);
    setErrors({});
    setSaveError(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setEditingAd(null);
    setModal("add");
  }

  function openEdit(ad: Ad) {
    setForm({
      link:        ad.link        ?? "",
      page:        ad.page,
      order_index: String(ad.order_index),
      starts_at:   ad.starts_at   ?? "",
      ends_at:     ad.ends_at     ?? "",
      is_active:   ad.is_active,
    });
    setErrors({});
    setSaveError(null);
    setImageFile(null);
    setImagePreview(ad.image_url);
    setImageError(null);
    setEditingAd(ad);
    setModal("edit");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setEditingAd(null);
    setErrors({});
    setSaveError(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  }

  function handleImagePick(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setImageError("حجم الصورة أكبر من 5MB");
      return;
    }
    setImageError(null);
    setErrors((p) => ({ ...p, image: undefined }));
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  /* ── Save ── */
  async function handleSave() {
    const isEdit = modal === "edit";
    const errs   = validate(form, imageFile, isEdit, editingAd?.image_url ?? null);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setSaveError(null);

    /* Upload image if a new file was selected */
    let image_url: string = editingAd?.image_url ?? "";
    if (imageFile) {
      const url = await uploadAdImage(imageFile);
      if (!url) {
        setSaveError("فشل رفع الصورة، حاول مرة أخرى");
        setSaving(false);
        return;
      }
      image_url = url;
    }

    const payload = {
      image_url,
      link:        form.link.trim() || null,
      page:        form.page,
      order_index: Number(form.order_index),
      starts_at:   form.starts_at || null,
      ends_at:     form.ends_at   || null,
      is_active:   form.is_active,
    };

    if (isEdit && editingAd) {
      const { error } = await supabase
        .from("advertisements")
        .update(payload)
        .eq("id", editingAd.id);
      if (error) {
        console.error("updateAd:", error.message);
        setSaveError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("advertisements")
        .insert([payload]);
      if (error) {
        console.error("insertAd:", error.message);
        setSaveError("حدث خطأ أثناء الحفظ، حاول مرة أخرى");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeModal();
    fetchAds();
  }

  /* ── Toggle active (optimistic) ── */
  async function toggleActive(id: string, current: boolean) {
    const snapshot = rows;
    setRows((p) => p.map((r) => r.id === id ? { ...r, is_active: !current } : r));
    const { error } = await supabase
      .from("advertisements")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) {
      console.error("toggleAd:", error.message);
      setRows(snapshot);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase
      .from("advertisements")
      .delete()
      .eq("id", deleteId);
    if (error) console.error("deleteAd:", error.message);
    else setRows((p) => p.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-5">

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: C.orange, color: "#fff" }}
        >
          <span>+</span> إضافة إعلان
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "الصورة",        hide: ""                      },
                  { label: "الصفحة",         hide: ""                      },
                  { label: "الترتيب",        hide: " hidden sm:table-cell" },
                  { label: "البداية",        hide: " hidden md:table-cell" },
                  { label: "النهاية",        hide: " hidden md:table-cell" },
                  { label: "الحالة",         hide: ""                      },
                  { label: "إجراءات",        hide: ""                      },
                ].map(({ label, hide }) => (
                  <th key={label}
                    className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${hide}`}
                    style={{ color: C.muted }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm animate-pulse"
                    style={{ color: C.muted }}>جاري التحميل...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm"
                    style={{ color: C.muted }}>لا توجد إعلانات</td>
                </tr>
              ) : rows.map((ad, i) => (
                <tr key={ad.id}
                  style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>

                  {/* Image */}
                  <td className="px-4 py-3">
                    <div className="w-16 h-9 rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ad.image_url} alt="إعلان" className="w-full h-full object-cover" />
                    </div>
                  </td>

                  {/* Page */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>{ad.page}</span>
                    {ad.link && (
                      <p className="text-xs mt-0.5 truncate max-w-[140px]" style={{ color: C.muted }}>
                        🔗 {ad.link}
                      </p>
                    )}
                  </td>

                  {/* Order */}
                  <td className="hidden sm:table-cell px-4 py-3 text-center">
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${C.teal}20`, color: C.teal }}>
                      {ad.order_index}
                    </span>
                  </td>

                  {/* starts_at */}
                  <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: C.muted }}>{ad.starts_at ?? "—"}</td>

                  {/* ends_at */}
                  <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: C.muted }}>{ad.ends_at ?? "—"}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(ad.id, ad.is_active)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ background: ad.is_active ? C.teal : C.border }}
                    >
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ right: ad.is_active ? "2px" : "auto", left: ad.is_active ? "auto" : "2px" }} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(ad)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.teal}22`, color: C.teal }}>تعديل</button>
                      <button onClick={() => setDeleteId(ad.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                        style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {loading ? "..." : `${rows.length} إعلان`}
        </div>
      </div>

      {/* Ad modal */}
      {(modal === "add" || modal === "edit") && (
        <AdModal
          title={modal === "add" ? "إضافة إعلان" : "تعديل إعلان"}
          form={form}
          onChange={(f) => {
            setForm(f);
            if (Object.keys(errors).length > 0) setErrors({});
          }}
          onSave={handleSave}
          onClose={closeModal}
          errors={errors}
          saving={saving}
          saveError={saveError}
          imagePreview={imagePreview}
          onImagePick={handleImagePick}
          imageError={imageError}
        />
      )}

      {/* Delete modal */}
      {deleteId !== null && (
        <DeleteModal
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
