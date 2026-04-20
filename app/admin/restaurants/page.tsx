"use client";

import { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

/* ── Palette ── */
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
  yellow: "#EAB308",
};

/* ── Types ── */
type Restaurant = {
  id:               string;
  name:             string;
  description:      string | null;
  phone:            string | null;
  opens_at:         string | null;
  closes_at:        string | null;
  is_active:        boolean;
  image_url:        string | null;
  cover_image_url:  string | null;
};
type RestForm = {
  name: string; description: string; phone: string;
  opens_at: string; closes_at: string;
};
type FormErrors = Partial<Record<keyof RestForm, string>>;

type Category = { id: number; restaurantId: string; name: string };
type Extra    = { id: number; name: string; price: string };
type MenuItem = {
  id: number; categoryId: number; name: string;
  price: string; isBestSeller: boolean; extras: Extra[];
};

/* ── Helpers ── */
function formatHours(opens: string | null, closes: string | null) {
  if (!opens || !closes) return "—";
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "ص" : "م";
    const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
  };
  return `${fmt(opens)} – ${fmt(closes)}`;
}

/* ── Crop canvas helper ── */
async function getCroppedImg(src: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.src = src;
  await new Promise<void>((res) => { image.onload = () => res(); });

  const canvas  = document.createElement("canvas");
  canvas.width  = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas empty"))), "image/jpeg", 0.92),
  );
}

/* ── Crop modal ── */
type CompressOptions = {
  maxSizeMB: number;
  maxWidthOrHeight: number;
};

function CropModal({
  src, aspect, compressOptions, onConfirm, onCancel,
}: {
  src: string; aspect: number;
  compressOptions: CompressOptions;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop,          setCrop]          = useState({ x: 0, y: 0 });
  const [zoom,          setZoom]          = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [confirming,    setConfirming]    = useState(false);
  const [status,        setStatus]        = useState<"crop" | "compress">("crop");

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedPixels) return;
    setConfirming(true);
    try {
      /* 1. Extract cropped region */
      const croppedBlob = await getCroppedImg(src, croppedPixels);

      /* 2. Compress with target settings */
      setStatus("compress");
      const croppedFile     = new File([croppedBlob], "crop.jpg", { type: "image/jpeg" });
      const compressedFile  = await imageCompression(croppedFile, {
        ...compressOptions,
        useWebWorker:       true,
        fileType:           "image/jpeg",
        initialQuality:     0.92,
      });

      onConfirm(compressedFile);
    } finally {
      setConfirming(false);
      setStatus("crop");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#000" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onCancel} className="text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{ color: C.muted, background: `${C.muted}18` }}>
          إلغاء
        </button>
        <p className="text-sm font-black" style={{ color: C.text }}>اقتصاص الصورة</p>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="text-sm font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
          style={{ background: C.orange, color: "#fff" }}
        >
          {confirming
            ? (status === "compress" ? "جاري تحسين الصورة..." : "...")
            : "تأكيد"}
        </button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle:  { borderColor: C.orange },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderTop: `1px solid ${C.border}` }}>
        <span className="text-lg select-none">🔍</span>
        <input
          type="range" min={1} max={3} step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-orange-500"
        />
        <span className="text-xs font-mono w-8 text-center" style={{ color: C.muted }}>
          {zoom.toFixed(1)}×
        </span>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs font-medium" style={{ color: C.red }}>{error}</p>
      )}
    </div>
  );
}

function ImageUploadField({
  label, preview, onPickFile, maxSize, maxSizeMsg, sizeError, onSizeError, aspect, helperText,
}: {
  label: string;
  preview: string | null;
  onPickFile: (src: string) => void;
  maxSize: number;
  maxSizeMsg: string;
  sizeError: string | null;
  onSizeError: (msg: string | null) => void;
  aspect: number;           // 1 = square card, 16/9 = cover
  helperText: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;

    /* Size validation BEFORE crop */
    if (file.size > maxSize) {
      onSizeError(maxSizeMsg);
      return;
    }

    /* Valid file — clear any previous error then open crop */
    onSizeError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPickFile(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Field label={label} error={sizeError ?? undefined}>
      <label className="rounded-xl cursor-pointer overflow-hidden transition-opacity hover:opacity-80 block"
        style={{ background: C.bg, border: `1px dashed ${sizeError ? C.red : C.border}` }}>
        {preview ? (
          <div className="relative w-full overflow-hidden"
            style={{
              aspectRatio: `${aspect === 1 ? "1/1" : "16/9"}`,
              borderRadius: aspect === 1 ? "16px" : "12px",
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="معاينة"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.45)" }}>
              <span className="text-xs font-bold text-white">تغيير الصورة</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${C.orange}22` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={C.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: C.text }}>اختر صورة...</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{helperText}</p>
            </div>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </label>
    </Field>
  );
}

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";
const inputSty = { background: C.bg, border: `1px solid ${C.border}`, color: C.text };

const emptyRestForm: RestForm = { name: "", description: "", phone: "", opens_at: "10:00", closes_at: "23:00" };
const emptyItemForm = { name: "", price: "", categoryId: 0, isBestSeller: false };

let nextId = 100;
const uid = () => ++nextId;

/* ── Image upload to Supabase Storage ── */
async function uploadImage(file: File, prefix: string): Promise<string | null> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("restaurants")
    .upload(path, file, { upsert: true });
  if (error) { console.error("Upload error:", error.message, error); return null; }
  const { data } = supabase.storage.from("restaurants").getPublicUrl(path);
  return data.publicUrl;
}

/* ════════════════════════════════════════════════════════════ */
export default function AdminRestaurantsPage() {

  /* ── Restaurant state ── */
  const [rows,         setRows]         = useState<Restaurant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"الكل" | "نشط" | "غير نشط">("الكل");

  /* ── Modal state ── */
  const [showModal,   setShowModal]   = useState(false);
  const [editingRest, setEditingRest] = useState<Restaurant | null>(null);
  const [restForm,    setRestForm]    = useState<RestForm>(emptyRestForm);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [touched,     setTouched]     = useState<Partial<Record<keyof RestForm, boolean>>>({});

  /* ── Image state ── */
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError,   setImageError]   = useState<string | null>(null);
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError,   setCoverError]   = useState<string | null>(null);

  /* ── Crop state ── */
  type CropTarget = { src: string; aspect: number; field: "image" | "cover"; compress: CompressOptions };
  const [cropState, setCropState] = useState<CropTarget | null>(null);

  /* ── Menu view state ── */
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [menuItems,    setMenuItems]    = useState<MenuItem[]>([]);

  /* ── Category modal ── */
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat,      setEditCat]      = useState<Category | null>(null);
  const [catName,      setCatName]      = useState("");

  /* ── Item modal ── */
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem,      setEditItem]      = useState<MenuItem | null>(null);
  const [itemForm,      setItemForm]      = useState(emptyItemForm);

  /* ── Extras modal ── */
  const [extrasTarget, setExtrasTarget] = useState<MenuItem | null>(null);
  const [draftExtras,  setDraftExtras]  = useState<Extra[]>([]);
  const [extraForm,    setExtraForm]    = useState({ name: "", price: "" });

  /* ── Fetch from Supabase ── */
  async function fetchRestaurants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, description, phone, opens_at, closes_at, is_active, image_url, cover_image_url")
      .order("created_at", { ascending: false });
    if (error) console.error("Fetch restaurants error:", error.message, error);
    if (data)  setRows(data);
    setLoading(false);
  }

  useEffect(() => { fetchRestaurants(); }, []);

  /* ── Filtered list ── */
  const filtered = rows.filter((r) => {
    const q = search.trim();
    const matchSearch = !q || r.name.includes(q) || (r.phone ?? "").includes(q);
    const matchStatus =
      statusFilter === "الكل"     ? true :
      statusFilter === "نشط"     ? r.is_active :
                                    !r.is_active;
    return matchSearch && matchStatus;
  });

  /* ── Modal helpers ── */
  function openCreate() {
    setEditingRest(null);
    setRestForm(emptyRestForm);
    setImageFile(null);  setImagePreview(null);
    setCoverFile(null);  setCoverPreview(null);
    setShowModal(true);
  }
  function openEdit(r: Restaurant) {
    setEditingRest(r);
    setRestForm({
      name:        r.name,
      description: r.description ?? "",
      phone:       r.phone       ?? "",
      opens_at:    r.opens_at    ?? "10:00",
      closes_at:   r.closes_at   ?? "23:00",
    });
    setImageFile(null);  setImagePreview(r.image_url       ?? null);
    setCoverFile(null);  setCoverPreview(r.cover_image_url ?? null);
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditingRest(null);
    setRestForm(emptyRestForm);
    setErrors({});
    setTouched({});
    setSaveError(null);
    setCropState(null);
    setImageFile(null);  setImagePreview(null);  setImageError(null);
    setCoverFile(null);  setCoverPreview(null);  setCoverError(null);
  }

  /* ── Validation ── */
  function validate(form: RestForm): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim())
      e.name = "اسم المطعم مطلوب";
    else if (form.name.trim().length < 2)
      e.name = "الاسم يجب أن يكون حرفين على الأقل";

    if (form.phone.trim()) {
      if (!/^\d{11}$/.test(form.phone.trim()))
        e.phone = "رقم الهاتف لازم يكون 11 رقم";
    }

    if (!form.opens_at)
      e.opens_at = "وقت الفتح مطلوب";

    if (!form.closes_at)
      e.closes_at = "وقت الغلق مطلوب";
    else if (form.opens_at && form.closes_at === form.opens_at)
      e.closes_at = "وقت الغلق يجب أن يختلف عن وقت الفتح";

    return e;
  }

  function touchField(field: keyof RestForm) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate({ ...restForm }));
  }

  function setField<K extends keyof RestForm>(field: K, value: RestForm[K]) {
    const next = { ...restForm, [field]: value };
    setRestForm(next);
    if (touched[field]) setErrors(validate(next));
  }

  /* ── Crop handlers ── */
  const COMPRESS: Record<"image" | "cover", CompressOptions> = {
    image: { maxSizeMB: 0.7, maxWidthOrHeight: 400  },
    cover: { maxSizeMB: 1,   maxWidthOrHeight: 1200 },
  };

  function openCrop(field: "image" | "cover", aspect: number) {
    return (src: string) => setCropState({ src, aspect, field, compress: COMPRESS[field] });
  }

  function handleCropConfirm(blob: Blob) {
    if (!cropState) return;
    const file    = new File([blob], `${cropState.field}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const preview = URL.createObjectURL(blob);
    if (cropState.field === "image") {
      setImageFile(file);
      setImagePreview(preview);
    } else {
      setCoverFile(file);
      setCoverPreview(preview);
    }
    setCropState(null);
  }

  function handleCropCancel() { setCropState(null); }

  /* ── Save restaurant ── */
  async function handleSaveRest() {
    /* Mark all fields touched and run full validation */
    const allTouched = { name: true, description: true, phone: true, opens_at: true, closes_at: true };
    setTouched(allTouched);
    const errs = validate(restForm);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setSaveError(null);

    let image_url:       string | null = editingRest?.image_url       ?? null;
    let cover_image_url: string | null = editingRest?.cover_image_url ?? null;

    if (imageFile) {
      const url = await uploadImage(imageFile, "card");
      if (url) image_url = url;
    }
    if (coverFile) {
      const url = await uploadImage(coverFile, "cover");
      if (url) cover_image_url = url;
    }

    const payload = {
      name:            restForm.name.trim(),
      description:     restForm.description.trim() || null,
      phone:           restForm.phone.trim()        || null,
      opens_at:        restForm.opens_at            || null,
      closes_at:       restForm.closes_at           || null,
      image_url,
      cover_image_url,
      is_active:       true,
    };

    console.log("Insert payload:", payload);

    if (editingRest) {
      const { error } = await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", editingRest.id);
      if (error) {
        console.error("UPDATE ERROR:", error.message, error);
        setSaveError("فشل في حفظ المطعم");
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("restaurants")
        .insert([payload])
        .select();
      if (error) {
        console.error("INSERT ERROR:", error.message, error);
        setSaveError("فشل في حفظ المطعم");
        setSaving(false);
        return;
      }
      console.log("Inserted:", data);
    }

    setSaving(false);
    closeModal();
    fetchRestaurants();
  }

  /* ── Toggle active ── */
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from("restaurants")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) { console.error("Toggle active error:", error.message, error); return; }
    setRows((p) => p.map((r) => r.id === id ? { ...r, is_active: !current } : r));
  }

  /* ── Menu view ── */
  function openMenu(r: Restaurant) { setSelectedRest(r); }
  function closeMenu()             { setSelectedRest(null); }

  /* ── Category actions ── */
  function openAddCat()             { setEditCat(null);  setCatName("");       setShowCatModal(true); }
  function openEditCat(c: Category) { setEditCat(c);     setCatName(c.name);  setShowCatModal(true); }
  function saveCat() {
    if (!catName.trim() || !selectedRest) return;
    if (editCat) {
      setCategories((p) => p.map((c) => c.id === editCat.id ? { ...c, name: catName.trim() } : c));
    } else {
      setCategories((p) => [...p, { id: uid(), restaurantId: selectedRest.id, name: catName.trim() }]);
    }
    setShowCatModal(false);
  }
  function deleteCat(id: number) {
    setCategories((p) => p.filter((c) => c.id !== id));
    setMenuItems((p) => p.filter((i) => i.categoryId !== id));
  }

  /* ── Item actions ── */
  function openAddItem(catId: number) {
    setEditItem(null);
    setItemForm({ ...emptyItemForm, categoryId: catId });
    setShowItemModal(true);
  }
  function openEditItem(item: MenuItem) {
    setEditItem(item);
    setItemForm({ name: item.name, price: item.price, categoryId: item.categoryId, isBestSeller: item.isBestSeller });
    setShowItemModal(true);
  }
  function saveItem() {
    if (!itemForm.name.trim() || !itemForm.price.trim()) return;
    if (editItem) {
      setMenuItems((p) => p.map((i) => i.id === editItem.id
        ? { ...i, name: itemForm.name.trim(), price: itemForm.price.trim(), categoryId: itemForm.categoryId, isBestSeller: itemForm.isBestSeller }
        : i
      ));
    } else {
      setMenuItems((p) => [...p, {
        id: uid(), categoryId: itemForm.categoryId,
        name: itemForm.name.trim(), price: itemForm.price.trim(),
        isBestSeller: itemForm.isBestSeller, extras: [],
      }]);
    }
    setShowItemModal(false);
  }
  function deleteItem(id: number) { setMenuItems((p) => p.filter((i) => i.id !== id)); }

  /* ── Extras actions ── */
  function openExtras(item: MenuItem) {
    setExtrasTarget(item);
    setDraftExtras([...item.extras]);
    setExtraForm({ name: "", price: "" });
  }
  function addExtra() {
    if (!extraForm.name.trim()) return;
    setDraftExtras((p) => [...p, { id: uid(), name: extraForm.name.trim(), price: extraForm.price.trim() || "0 ج.م" }]);
    setExtraForm({ name: "", price: "" });
  }
  function removeExtra(id: number) { setDraftExtras((p) => p.filter((e) => e.id !== id)); }
  function saveExtras() {
    if (!extrasTarget) return;
    setMenuItems((p) => p.map((i) => i.id === extrasTarget.id ? { ...i, extras: draftExtras } : i));
    setExtrasTarget(null);
  }

  /* ── Derived ── */
  const restCats = selectedRest ? categories.filter((c) => c.restaurantId === selectedRest.id) : [];

  /* ════════════════════ LOADING ════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</p>
      </div>
    );
  }

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <>
      <div className="flex flex-col gap-5" dir="rtl">

        {/* ════════ MENU VIEW ════════ */}
        {selectedRest ? (
          <div className="flex flex-col gap-4">

            {/* Top bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={closeMenu}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}44` }}
              >
                ← رجوع
              </button>
              <div className="flex items-center gap-2">
                <span className="text-lg">🍽</span>
                <h2 className="text-base font-black" style={{ color: C.text }}>{selectedRest.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.orange}22`, color: C.orange }}>المنيو</span>
              </div>
              <div className="mr-auto">
                <button
                  onClick={openAddCat}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: C.teal, color: "#fff" }}
                >
                  <span>+</span> إضافة قسم
                </button>
              </div>
            </div>

            {/* Categories */}
            {restCats.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center gap-3 py-14"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 40 }}>📂</span>
                <p className="text-sm" style={{ color: C.muted }}>لا يوجد أقسام بعد — ابدأ بإضافة قسم</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {restCats.map((cat) => {
                  const items = menuItems.filter((i) => i.categoryId === cat.id);
                  return (
                    <div key={cat.id} className="rounded-2xl overflow-hidden"
                      style={{ background: C.card, border: `1px solid ${C.border}` }}>

                      {/* Category header */}
                      <div className="flex items-center gap-2 px-4 py-3"
                        style={{ borderBottom: `1px solid ${C.border}`, background: `${C.teal}0d` }}>
                        <span className="text-sm font-black" style={{ color: C.teal }}>▸</span>
                        <span className="text-sm font-bold flex-1" style={{ color: C.text }}>{cat.name}</span>
                        <span className="text-xs mr-2" style={{ color: C.muted }}>{items.length} عنصر</span>
                        <button onClick={() => openAddItem(cat.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.teal}22`, color: C.teal }}>
                          + وجبة
                        </button>
                        <button onClick={() => openEditCat(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.yellow}22`, color: C.yellow }}>
                          تعديل
                        </button>
                        <button onClick={() => deleteCat(cat.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.red}22`, color: C.red }}>
                          حذف
                        </button>
                      </div>

                      {/* Items */}
                      {items.length === 0 ? (
                        <p className="px-4 py-5 text-center text-xs" style={{ color: C.muted }}>
                          لا يوجد وجبات في هذا القسم
                        </p>
                      ) : (
                        <div className="divide-y" style={{ borderColor: C.border }}>
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                              <div className="flex-1 flex flex-col gap-0.5 min-w-[140px]">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold" style={{ color: C.text }}>{item.name}</span>
                                  {item.isBestSeller && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                      style={{ background: `${C.orange}22`, color: C.orange }}>
                                      ⭐ الأكثر طلباً
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-bold" style={{ color: C.teal }}>{item.price}</span>
                                {item.extras.length > 0 && (
                                  <span className="text-[10px]" style={{ color: C.muted }}>
                                    {item.extras.length} إضافة متاحة
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => openExtras(item)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.teal}22`, color: C.teal }}>
                                  إضافات ({item.extras.length})
                                </button>
                                <button onClick={() => openEditItem(item)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.yellow}22`, color: C.yellow }}>
                                  تعديل
                                </button>
                                <button onClick={() => deleteItem(item.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.red}22`, color: C.red }}>
                                  حذف
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : (

        /* ════════ RESTAURANTS LIST VIEW ════════ */
        <>
          {/* ── Top bar ── */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 min-w-[180px]"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مطعم..."
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: C.text }}
                dir="rtl"
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: C.muted }}>✕</button>
              )}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}
            >
              <option value="الكل">الكل</option>
              <option value="نشط">نشط</option>
              <option value="غير نشط">غير نشط</option>
            </select>

            {/* Add button */}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-90"
              style={{ background: C.orange, color: "#fff" }}
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">إضافة مطعم</span>
            </button>
          </div>

          {/* ── Table card ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {[
                      { label: "المطعم",       cls: "" },
                      { label: "الوصف",         cls: " hidden lg:table-cell" },
                      { label: "التليفون",      cls: " hidden sm:table-cell" },
                      { label: "ساعات العمل",  cls: " hidden md:table-cell" },
                      { label: "الحالة",        cls: "" },
                      { label: "إجراءات",      cls: "" },
                    ].map(({ label, cls }) => (
                      <th key={label}
                        className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${cls}`}
                        style={{ color: C.muted }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                        لا توجد مطاعم مطابقة
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id}
                        style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                        {/* المطعم */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {r.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.image_url} alt={r.name}
                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                style={{ border: `1px solid ${C.border}` }} />
                            ) : (
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                                style={{ background: `${C.orange}22`, border: `1px solid ${C.border}` }}>
                                🍽
                              </div>
                            )}
                            <p className="text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                          </div>
                        </td>

                        {/* الوصف */}
                        <td className="hidden lg:table-cell px-4 py-3 max-w-[220px]">
                          <p className="text-xs line-clamp-2" style={{ color: C.muted }}>
                            {r.description ?? "—"}
                          </p>
                        </td>

                        {/* التليفون */}
                        <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                          {r.phone ?? "—"}
                        </td>

                        {/* ساعات العمل */}
                        <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                          {formatHours(r.opens_at, r.closes_at)}
                        </td>

                        {/* الحالة */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(r.id, r.is_active)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                            style={{
                              background: r.is_active ? `${C.green}22` : `${C.red}22`,
                              color:      r.is_active ? C.green : C.red,
                            }}
                          >
                            {r.is_active ? "نشط" : "غير نشط"}
                          </button>
                        </td>

                        {/* إجراءات */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                              style={{ background: `${C.teal}22`, color: C.teal }}
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => openMenu(r)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                              style={{ background: `${C.orange}22`, color: C.orange }}
                            >
                              المنيو
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
              {filtered.length} مطعم
            </div>
          </div>
        </>
        )}
      </div>

      {/* ════════ MODAL: إضافة / تعديل مطعم ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {editingRest ? "تعديل المطعم" : "إضافة مطعم جديد"}
              </h2>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" dir="rtl">

              <Field label="اسم المطعم" required error={touched.name ? errors.name : undefined}>
                <input
                  type="text"
                  value={restForm.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onBlur={() => touchField("name")}
                  placeholder="مثال: بيت البرجر"
                  className={inputCls}
                  style={{ ...inputSty, borderColor: touched.name && errors.name ? C.red : C.border }}
                />
              </Field>

              <Field label="الوصف" error={touched.description ? errors.description : undefined}>
                <textarea
                  value={restForm.description}
                  onChange={(e) => setField("description", e.target.value)}
                  onBlur={() => touchField("description")}
                  placeholder="وصف مختصر للمطعم..." rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={inputSty}
                />
              </Field>

              <Field label="التليفون" error={touched.phone ? errors.phone : undefined}>
                <input
                  type="tel"
                  value={restForm.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  onBlur={() => touchField("phone")}
                  placeholder="01XX-XXX-XXXX"
                  className={inputCls}
                  style={{ ...inputSty, borderColor: touched.phone && errors.phone ? C.red : C.border }}
                />
              </Field>

              <div className="flex gap-3">
                <Field label="بيفتح الساعة" error={touched.opens_at ? errors.opens_at : undefined}>
                  <input
                    type="time"
                    value={restForm.opens_at}
                    onChange={(e) => setField("opens_at", e.target.value)}
                    onBlur={() => touchField("opens_at")}
                    className={inputCls}
                    style={{ ...inputSty, colorScheme: "dark", borderColor: touched.opens_at && errors.opens_at ? C.red : C.border }}
                  />
                </Field>
                <Field label="بيقفل الساعة" error={touched.closes_at ? errors.closes_at : undefined}>
                  <input
                    type="time"
                    value={restForm.closes_at}
                    onChange={(e) => setField("closes_at", e.target.value)}
                    onBlur={() => touchField("closes_at")}
                    className={inputCls}
                    style={{ ...inputSty, colorScheme: "dark", borderColor: touched.closes_at && errors.closes_at ? C.red : C.border }}
                  />
                </Field>
              </div>

              <ImageUploadField
                label="لوجو المطعم"
                preview={imagePreview}
                onPickFile={openCrop("image", 1)}
                maxSize={3 * 1024 * 1024}
                maxSizeMsg="حجم صورة الكارت أكبر من 3MB"
                sizeError={imageError}
                onSizeError={setImageError}
                aspect={1}
                helperText="PNG أو JPG - بحد أقصى 3MB - يفضل 400×400 (مربع)"
              />

              <ImageUploadField
                label="صورة الغلاف"
                preview={coverPreview}
                onPickFile={openCrop("cover", 16 / 9)}
                maxSize={5 * 1024 * 1024}
                maxSizeMsg="حجم صورة الغلاف أكبر من 5MB"
                sizeError={coverError}
                onSizeError={setCoverError}
                aspect={16 / 9}
                helperText="PNG أو JPG - بحد أقصى 5MB - يفضل 1200×675 (16:9)"
              />

            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: C.border }}>
              {saveError && (
                <p className="text-xs font-semibold text-center" style={{ color: C.red }}>
                  {saveError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveRest}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.orange, color: "#fff" }}
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: إضافة / تعديل قسم ════════ */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCatModal(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {editCat ? "تعديل القسم" : "إضافة قسم"}
              </h2>
              <button onClick={() => setShowCatModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4" dir="rtl">
              <Field label="اسم القسم" required>
                <input type="text" value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="مثال: برجر، بيتزا، مشروبات..."
                  className={inputCls} style={inputSty} />
              </Field>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={saveCat}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
                style={{ background: C.teal, color: "#fff" }}>حفظ</button>
              <button onClick={() => setShowCatModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: إضافة / تعديل وجبة ════════ */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowItemModal(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {editItem ? "تعديل الوجبة" : "إضافة وجبة"}
              </h2>
              <button onClick={() => setShowItemModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4" dir="rtl">
              <Field label="اسم الوجبة" required>
                <input type="text" value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="مثال: برجر دبل تشيز"
                  className={inputCls} style={inputSty} />
              </Field>
              <Field label="السعر" required>
                <input type="text" value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="مثال: 85 ج.م"
                  className={inputCls} style={inputSty} />
              </Field>
              <Field label="القسم" required>
                <select value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ ...inputSty, colorScheme: "dark" }}>
                  <option value={0} disabled>اختر القسم</option>
                  {restCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setItemForm({ ...itemForm, isBestSeller: !itemForm.isBestSeller })}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    background: itemForm.isBestSeller ? C.orange : C.bg,
                    border: `2px solid ${itemForm.isBestSeller ? C.orange : C.border}`,
                  }}
                >
                  {itemForm.isBestSeller && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                </div>
                <span className="text-sm" style={{ color: C.text }}>⭐ الأكثر طلباً</span>
              </label>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={saveItem}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
                style={{ background: C.teal, color: "#fff" }}>حفظ</button>
              <button onClick={() => setShowItemModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: الإضافات ════════ */}
      {extrasTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setExtrasTarget(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh]"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-base font-black" style={{ color: C.text }}>إضافات الوجبة</h2>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{extrasTarget.name}</p>
              </div>
              <button onClick={() => setExtrasTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" dir="rtl">
              {draftExtras.length === 0 ? (
                <p className="text-center text-xs py-4" style={{ color: C.muted }}>لا يوجد إضافات بعد</p>
              ) : (
                draftExtras.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                    <span className="flex-1 text-sm" style={{ color: C.text }}>{ex.name}</span>
                    <span className="text-xs font-bold" style={{ color: C.teal }}>{ex.price}</span>
                    <button onClick={() => removeExtra(ex.id)}
                      className="text-xs px-2 py-0.5 rounded-lg hover:opacity-80"
                      style={{ background: `${C.red}22`, color: C.red }}>حذف</button>
                  </div>
                ))
              )}

              <div className="flex gap-2 mt-1">
                <input type="text" value={extraForm.name}
                  onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                  placeholder="اسم الإضافة"
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputSty} />
                <input type="text" value={extraForm.price}
                  onChange={(e) => setExtraForm({ ...extraForm, price: e.target.value })}
                  placeholder="السعر"
                  className="w-24 rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputSty} />
                <button onClick={addExtra}
                  className="px-3 py-2 rounded-xl text-sm font-bold hover:opacity-90"
                  style={{ background: C.teal, color: "#fff" }}>+</button>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: C.border }}>
              <button onClick={saveExtras}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
                style={{ background: C.teal, color: "#fff" }}>حفظ</button>
              <button onClick={() => setExtrasTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ CROP MODAL ════════ */}
      {cropState && (
        <CropModal
          src={cropState.src}
          aspect={cropState.aspect}
          compressOptions={cropState.compress}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
