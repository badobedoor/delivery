"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

type Category = { id: number; name: string; restaurant_id: string };
type ExtraGroup = { key: number; name: string; required: boolean; max_select: number; type: string; extras: { key: number; name: string; price: number }[] };
type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number;
  restaurant_id: string;
  image_url: string | null;
  extra_groups: { type: string; item_extras: { price: number }[] }[];
};

/* ── Helpers ── */
function safeMinPrice(extras: { price: number }[] | undefined): number | null {
  const prices = (extras ?? []).map((e) => e.price).filter((p) => typeof p === "number" && isFinite(p));
  return prices.length > 0 ? Math.min(...prices) : null;
}

function displayPrice(basePrice: number, groups: { type: string; item_extras: { price: number }[] }[]): string {
  const variantGroup = (groups ?? []).find((g) => g.type === "variant");
  const min = safeMinPrice(variantGroup?.item_extras);
  return min !== null ? `يبدأ من ${min} ج.م` : `${basePrice} ج.م`;
}

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
const emptyItemForm = { name: "", description: "", price: "", category_id: 0 };

/* ── Image upload to Supabase Storage ──
   bucket : "restaurants" (shared — no strong reason to split)
   folder : optional subfolder, e.g. "menu-items"
   prefix : filename prefix, e.g. "card", "cover", "item"
   Usage  :
     uploadImage(file, "card")                     // restaurants/card-{ts}.jpg
     uploadImage(file, "item", "menu-items")        // restaurants/menu-items/item-{ts}.jpg
── */
async function uploadImage(file: File, prefix: string, folder?: string): Promise<string | null> {
  const ext      = file.name.split(".").pop() ?? "jpg";
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const path     = folder ? `${folder}/${filename}` : filename;
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
  type CropTarget = { src: string; aspect: number; field: "image" | "cover" | "item"; compress: CompressOptions };
  const [cropState, setCropState] = useState<CropTarget | null>(null);

  /* ── Menu view state ── */
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [menuItems,    setMenuItems]    = useState<MenuItem[]>([]);
  const [catLoading,   setCatLoading]   = useState(false);

  /* ── Category modal ── */
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat,      setEditCat]      = useState<Category | null>(null);
  const [catName,      setCatName]      = useState("");
  const [catSaving,    setCatSaving]    = useState(false);
  const [catError,     setCatError]     = useState<string | null>(null);

  /* ── Item modal ── */
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem,      setEditItem]      = useState<MenuItem | null>(null);
  const [itemForm,      setItemForm]      = useState(emptyItemForm);
  const [itemSaving,        setItemSaving]        = useState(false);
  const [isUploadingImage,  setIsUploadingImage]  = useState(false);
  const [itemError,         setItemError]         = useState<string | null>(null);
  const [itemImageFile,     setItemImageFile]      = useState<File | null>(null);
  const [itemImagePreview,setItemImagePreview]= useState<string | null>(null);
  const [itemImageError,  setItemImageError]  = useState<string | null>(null);
  const [extraGroups,      setExtraGroups]      = useState<ExtraGroup[]>([]);
  const [collapsedGroups,  setCollapsedGroups]  = useState<Set<number>>(new Set());
  const [groupNameErrors,  setGroupNameErrors]  = useState<Set<number>>(new Set());
  const [toastMsg,         setToastMsg]         = useState<string | null>(null);


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
    } else if (cropState.field === "cover") {
      setCoverFile(file);
      setCoverPreview(preview);
    } else {
      setItemImageFile(file);
      setItemImagePreview(preview);
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
  async function fetchMenuItems(restaurantId: string) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, description, price, category_id, restaurant_id, image_url, extra_groups(type, item_extras(price))")
      .eq("restaurant_id", restaurantId)
      .order("id", { ascending: true });
    if (error) { console.error("Fetch menu items error:", error.message, error); return; }
    if (data) {
      type RawGroup = { type: string; item_extras: { price: number }[] };
      setMenuItems(
        (data as (typeof data[0] & { extra_groups: RawGroup[] })[]).map((item) => ({
          id:            item.id,
          name:          item.name,
          description:   item.description,
          price:         item.price,
          category_id:   item.category_id,
          restaurant_id: item.restaurant_id,
          image_url:     item.image_url ?? null,
          extra_groups:  item.extra_groups ?? [],
        })),
      );
    }
  }

  async function openMenu(r: Restaurant) {
    setSelectedRest(r);
    setCategories([]);
    setMenuItems([]);
    setCatLoading(true);
    const [catsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, restaurant_id")
        .eq("restaurant_id", r.id)
        .order("id", { ascending: true }),
      fetchMenuItems(r.id),
    ]);
    if (catsResult.error) console.error("Fetch categories error:", catsResult.error.message, catsResult.error);
    if (catsResult.data) setCategories(catsResult.data);
    setCatLoading(false);
  }
  function closeMenu() {
    setSelectedRest(null);
    setCategories([]);
    setMenuItems([]);
  }

  /* ── Category modal helpers ── */
  function openAddCat()             { setEditCat(null); setCatName(""); setCatError(null); setShowCatModal(true); }
  function openEditCat(c: Category) { setEditCat(c);    setCatName(c.name); setCatError(null); setShowCatModal(true); }
  function closeCatModal()          { setShowCatModal(false); setCatError(null); }

  /* ── Category CRUD ── */
  async function saveCat() {
    if (!catName.trim() || !selectedRest) return;
    setCatSaving(true);
    setCatError(null);

    if (editCat) {
      const { error } = await supabase
        .from("categories")
        .update({ name: catName.trim() })
        .eq("id", editCat.id);
      if (error) {
        console.error("Update category error:", error.message, error);
        setCatError("حدث خطأ أثناء حفظ القسم");
        setCatSaving(false);
        return;
      }
      setCategories((p) => p.map((c) => c.id === editCat.id ? { ...c, name: catName.trim() } : c));
    } else {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: catName.trim(), restaurant_id: selectedRest.id }])
        .select("id, name, restaurant_id")
        .maybeSingle();
      if (error) {
        console.error("Insert category error:", error.message, error);
        setCatError("حدث خطأ أثناء حفظ القسم");
        setCatSaving(false);
        return;
      }
      if (data) setCategories((p) => [...p, data]);
    }

    setCatSaving(false);
    closeCatModal();
  }

  async function deleteCat(id: number) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (error) { console.error("Delete category error:", error.message, error); return; }
    setCategories((p) => p.filter((c) => c.id !== id));
    setMenuItems((p)  => p.filter((i) => i.category_id !== id));
  }

  /* ── Item modal helpers ── */
  function openAddItem(catId: number) {
    setEditItem(null);
    setItemForm({ ...emptyItemForm, category_id: catId });
    setExtraGroups([]);
    setCollapsedGroups(new Set()); setGroupNameErrors(new Set());
    setItemError(null);
    setItemImageFile(null); setItemImagePreview(null); setItemImageError(null);
    setIsUploadingImage(false);
    setShowItemModal(true);
  }
  function closeItemModal() {
    setShowItemModal(false);
    setExtraGroups([]);
    setCollapsedGroups(new Set()); setGroupNameErrors(new Set());
    setItemError(null);
    setItemImageFile(null); setItemImagePreview(null); setItemImageError(null);
    setIsUploadingImage(false);
  }
  function toggleGroupCollapse(key: number) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  }
  const SUGGESTED_NAMES: Record<string, string> = { variant: "الحجم", checkbox: "إضافات" };

  function handleGroupTypeChange(key: number, newType: string) {
    const group = extraGroups.find((g) => g.key === key);
    if (!group) return;

    /* Auto-swap suggested name only if the current name is still the other type's suggestion */
    const currentSuggested = SUGGESTED_NAMES[group.type] ?? "";
    const autoName = group.name.trim() === "" || group.name === currentSuggested
      ? (SUGGESTED_NAMES[newType] ?? group.name)
      : group.name;

    if (newType === "variant") {
      if (group.extras.length > 1) {
        const confirmed = window.confirm("سيتم تحويل المجموعة لاختيار واحد فقط — هل تريد المتابعة؟");
        if (!confirmed) return;
        updateExtraGroup(key, { type: "variant", required: true, max_select: 1, name: autoName, extras: [group.extras[0]] });
      } else {
        updateExtraGroup(key, { type: "variant", required: true, max_select: 1, name: autoName });
      }
      showToast("تم تحويل المجموعة إلى اختيار واحد");
    } else {
      updateExtraGroup(key, { type: newType, name: autoName });
    }
    /* Clear name error for this group since we just set a valid name */
    setGroupNameErrors((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  /* ── Focus management ── */
  const pendingFocusKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocusKey.current) return;
    const el = document.querySelector<HTMLInputElement>(`[data-focus-key="${pendingFocusKey.current}"]`);
    if (el) { el.focus(); el.select(); }
    pendingFocusKey.current = null;
  });

  /* ── Extra group handlers (local state only) ── */
  function addExtraGroup() {
    const key = Date.now();
    setExtraGroups((p) => [...p, { key, name: "إضافات", required: false, max_select: 1, type: "checkbox", extras: [] }]);
    setCollapsedGroups((prev) => { const next = new Set(prev); next.delete(key); return next; });
    pendingFocusKey.current = `group-name-${key}`;
  }
  function removeExtraGroup(key: number) {
    setExtraGroups((p) => p.filter((g) => g.key !== key));
  }
  function updateExtraGroup(key: number, patch: Partial<ExtraGroup>) {
    setExtraGroups((p) => p.map((g) => g.key === key ? { ...g, ...patch } : g));
  }
  function addExtraToGroup(groupKey: number) {
    const extraKey = Date.now();
    pendingFocusKey.current = `extra-name-${groupKey}-${extraKey}`;
    setExtraGroups((p) => p.map((g) =>
      g.key === groupKey
        ? { ...g, extras: [...g.extras, { key: extraKey, name: "", price: 0 }] }
        : g,
    ));
  }
  function removeExtraFromGroup(groupKey: number, extraKey: number) {
    setExtraGroups((p) => p.map((g) =>
      g.key === groupKey
        ? { ...g, extras: g.extras.filter((e) => e.key !== extraKey) }
        : g,
    ));
  }
  function updateExtraInGroup(groupKey: number, extraKey: number, patch: { name?: string; price?: number }) {
    setExtraGroups((p) => p.map((g) =>
      g.key === groupKey
        ? { ...g, extras: g.extras.map((e) => e.key === extraKey ? { ...e, ...patch } : e) }
        : g,
    ));
  }

  /* ── Insert extra groups + item_extras one group at a time (guarantees correct FK mapping) ── */
  async function insertGroupsAndExtras(menuItemId: number): Promise<boolean> {
    /* ── ENTRY: log raw closure state before any filtering ── */
    console.log("[insertGroupsAndExtras] called with menuItemId:", menuItemId);
    console.log("[insertGroupsAndExtras] extraGroups from closure:", JSON.stringify(extraGroups));

    const validGroups = extraGroups.filter((g) => g.name.trim());
    console.log("[insertGroupsAndExtras] validGroups after name filter:", validGroups.length, validGroups.map(g => g.name));

    if (validGroups.length === 0) {
      console.log("[insertGroupsAndExtras] no valid groups → early return true (nothing to insert)");
      return true;
    }

    try {
      for (const g of validGroups) {
        /* 1. Insert the group and get its real DB id */
        const groupPayload = {
          name:         g.name.trim(),
          menu_item_id: menuItemId,
          required:     g.required,
          max_select:   g.max_select,
          type:         g.type || "checkbox",
        };
        console.log("[insertGroupsAndExtras] inserting extra_group payload:", JSON.stringify(groupPayload));

        const { data: groupRow, error: groupError } = await supabase
          .from("extra_groups")
          .insert(groupPayload)
          .select("id")
          .maybeSingle();

        if (groupError || !groupRow) {
          console.error("[insertGroupsAndExtras] extra_group INSERT FAILED:", groupError?.message, groupError);
          setItemError("حدث خطأ أثناء حفظ مجموعة الإضافات");
          return false;
        }
        console.log("[insertGroupsAndExtras] extra_group inserted OK — id:", groupRow.id);

        /* 2. Insert this group's extras using the exact group id we just got */
        const validExtras = g.extras.filter((e) => e.name.trim());
        console.log("[insertGroupsAndExtras] group", groupRow.id, "— validExtras:", validExtras.length, validExtras.map(e => e.name));

        if (validExtras.length === 0) {
          console.log("[insertGroupsAndExtras] no extras for group", groupRow.id, "→ skip item_extras insert");
          continue;
        }

        const extrasPayload = validExtras.map((e) => ({
          name:     e.name.trim(),
          price:    e.price,
          group_id: groupRow.id,
        }));
        console.log("[insertGroupsAndExtras] inserting item_extras payload:", JSON.stringify(extrasPayload));

        const { error: extrasError } = await supabase
          .from("item_extras")
          .insert(extrasPayload);

        if (extrasError) {
          console.error("[insertGroupsAndExtras] item_extras INSERT FAILED:", extrasError.message, extrasError, "| group_id:", groupRow.id);
          setItemError("حدث خطأ أثناء حفظ الاختيارات");
          return false;
        }
        console.log("[insertGroupsAndExtras] item_extras inserted OK —", validExtras.length, "rows for group_id:", groupRow.id);
      }
    } catch (err) {
      console.error("[insertGroupsAndExtras] UNEXPECTED EXCEPTION:", err);
      setItemError("خطأ غير متوقع أثناء حفظ الإضافات");
      return false;
    }

    console.log("[insertGroupsAndExtras] all groups and extras inserted successfully");
    return true;
  }

  /* ── Open edit item modal ── */
  async function openEditItem(item: MenuItem) {
    setEditItem(item);
    setItemForm({
      name:        item.name,
      description: item.description ?? "",
      price:       String(item.price),
      category_id: item.category_id,
    });
    setItemError(null);
    setItemImageFile(null);
    setItemImagePreview(item.image_url ?? null);
    setItemImageError(null);
    setExtraGroups([]);
    setCollapsedGroups(new Set()); setGroupNameErrors(new Set());
    setShowItemModal(true);

    /* Fetch extra groups + their extras in one query */
    const { data: dbGroups, error: groupsErr } = await supabase
      .from("extra_groups")
      .select("id, name, required, max_select, type, item_extras(id, name, price)")
      .eq("menu_item_id", item.id)
      .order("id", { ascending: true });

    if (groupsErr) {
      console.error("Fetch extra groups error:", groupsErr.message, groupsErr);
      return;
    }
    if (!dbGroups || dbGroups.length === 0) return;

    setExtraGroups(dbGroups.map((g) => ({
      key:        g.id,
      name:       g.name,
      required:   g.required,
      max_select: g.max_select,
      type:       g.type ?? "checkbox",
      extras:     (g.item_extras ?? []).map((e) => ({ key: e.id, name: e.name, price: e.price })),
    })));
  }

  /* ── Create / edit menu item ── */
  async function saveItem() {
    if (!selectedRest) return;

    if (!itemForm.name.trim()) { setItemError("اسم الوجبة مطلوب"); return; }
    const priceNum = Number(itemForm.price);
    if (!itemForm.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setItemError("السعر مطلوب ويجب أن يكون رقماً أكبر من صفر");
      return;
    }
    if (!itemForm.category_id) { setItemError("يجب اختيار القسم"); return; }
    const unnamedGroups = extraGroups.filter((g) => !g.name.trim());
    if (unnamedGroups.length > 0) {
      setGroupNameErrors(new Set(unnamedGroups.map((g) => g.key)));
      setItemError("كل مجموعة لازم يكون ليها اسم");
      return;
    }
    const emptyVariant = extraGroups.find((g) => g.type === "variant" && g.extras.length === 0);
    if (emptyVariant) {
      setItemError(`لازم تضيف اختيار واحد على الأقل للحجم في "${emptyVariant.name || "مجموعة بدون اسم"}"`);
      return;
    }

    setItemSaving(true);
    setItemError(null);

    let image_url: string | null = editItem?.image_url ?? null;
    if (itemImageFile) {
      setIsUploadingImage(true);
      const uploaded = await uploadImage(itemImageFile, "item", "menu-items");
      setIsUploadingImage(false);
      if (!uploaded) {
        showToast("فشل رفع الصورة");
        setItemSaving(false);
        return;
      }
      image_url = uploaded;
    }

    const itemPayload = {
      name:        itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price:       priceNum,
      category_id: itemForm.category_id,
      image_url,
    };

    console.log("[saveItem] groups to save:", extraGroups.length, extraGroups.map(g => ({ name: g.name, type: g.type, extras: g.extras.length })));

    /* ── EDIT ── */
    if (editItem) {
      console.log("[saveItem] EDIT path — menu_item id:", editItem.id);

      const { error: updateError } = await supabase
        .from("menu_items")
        .update(itemPayload)
        .eq("id", editItem.id);

      if (updateError) {
        console.error("[saveItem] update menu_item failed:", updateError.message, updateError);
        setItemError("حدث خطأ أثناء التعديل");
        setItemSaving(false);
        return;
      }
      console.log("[saveItem] menu_item updated OK");

      /* Delete old item_extras first (FK), then extra_groups */
      const { data: oldGroups, error: fetchOldErr } = await supabase
        .from("extra_groups")
        .select("id")
        .eq("menu_item_id", editItem.id);

      if (fetchOldErr) {
        console.error("[saveItem] fetch old groups failed:", fetchOldErr.message, fetchOldErr);
        setItemError("حدث خطأ أثناء التعديل");
        setItemSaving(false);
        return;
      }

      if (oldGroups && oldGroups.length > 0) {
        const { error: delExtrasErr } = await supabase
          .from("item_extras")
          .delete()
          .in("group_id", oldGroups.map((g) => g.id));
        if (delExtrasErr) console.error("[saveItem] delete old item_extras failed:", delExtrasErr.message);
      }

      const { error: delGroupsErr } = await supabase
        .from("extra_groups")
        .delete()
        .eq("menu_item_id", editItem.id);
      if (delGroupsErr) console.error("[saveItem] delete old extra_groups failed:", delGroupsErr.message);

      console.log("[saveItem] old groups/extras cleared — calling insertGroupsAndExtras");
      const ok = await insertGroupsAndExtras(editItem.id);
      if (!ok) { setItemSaving(false); return; }

      if (selectedRest) await fetchMenuItems(selectedRest.id);
      setItemSaving(false);
      closeItemModal();
      return;
    }

    /* ── CREATE ── */
    console.log("[saveItem] CREATE path");

    const { data, error } = await supabase
      .from("menu_items")
      .insert([{ ...itemPayload, restaurant_id: selectedRest.id }])
      .select("id, name, description, price, category_id, restaurant_id")
      .maybeSingle();

    if (error || !data) {
      console.error("[saveItem] insert menu_item failed:", error?.message, error);
      setItemError("حدث خطأ أثناء حفظ الوجبة");
      setItemSaving(false);
      return;
    }
    console.log("[saveItem] menu_item inserted id:", data.id, "— calling insertGroupsAndExtras");

    const ok = await insertGroupsAndExtras(data.id);
    if (!ok) { setItemSaving(false); return; }

    if (selectedRest) await fetchMenuItems(selectedRest.id);
    setItemSaving(false);
    closeItemModal();
  }

  async function deleteItem(id: number) {
    const { data: groups } = await supabase
      .from("extra_groups").select("id").eq("menu_item_id", id);
    if (groups && groups.length > 0) {
      await supabase.from("item_extras").delete().in("group_id", groups.map((g) => g.id));
      await supabase.from("extra_groups").delete().eq("menu_item_id", id);
    }
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) { console.error("Delete menu item error:", error.message, error); return; }
    setMenuItems((p) => p.filter((i) => i.id !== id));
  }


  /* ── Derived ── */
  const restCats = categories;

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
            {catLoading ? (
              <div className="rounded-2xl flex items-center justify-center py-14"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <p className="text-sm animate-pulse" style={{ color: C.muted }}>جاري التحميل...</p>
              </div>
            ) : restCats.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center gap-3 py-14"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 40 }}>📂</span>
                <p className="text-sm" style={{ color: C.muted }}>لا يوجد أقسام بعد — ابدأ بإضافة قسم</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {restCats.map((cat) => {
                  const items = menuItems.filter((i) => i.category_id === cat.id);
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
                              {item.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image_url} alt={item.name}
                                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                  style={{ border: `1px solid ${C.border}` }} />
                              ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                                  style={{ background: `${C.teal}18`, border: `1px solid ${C.border}` }}>
                                  🍽
                                </div>
                              )}
                              <div className="flex-1 flex flex-col gap-0.5 min-w-[140px]">
                                <span className="text-sm font-semibold" style={{ color: C.text }}>{item.name}</span>
                                {item.description && (
                                  <span className="text-xs line-clamp-1" style={{ color: C.muted }}>{item.description}</span>
                                )}
                                <span className="text-xs font-bold" style={{ color: C.teal }}>
                                  {displayPrice(item.price, item.extra_groups ?? [])}
                                </span>
                                {(() => {
                                  const groups = item.extra_groups ?? [];
                                  const hasVariant  = groups.some((g) => g.type === "variant");
                                  const extraItems  = groups
                                    .filter((g) => g.type !== "variant")
                                    .reduce((n, g) => n + (g.item_extras?.length ?? 0), 0);
                                  if (groups.length === 0) return null;
                                  return (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {hasVariant && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                          style={{ background: `${C.orange}22`, color: C.orange }}>
                                          أحجام
                                        </span>
                                      )}
                                      {extraItems > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                          style={{ background: `${C.teal}22`, color: C.teal }}>
                                          إضافات ({extraItems})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
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
          onClick={(e) => { if (e.target === e.currentTarget) closeCatModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>
                {editCat ? "تعديل القسم" : "إضافة قسم"}
              </h2>
              <button onClick={closeCatModal}
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
              {catError && (
                <p className="text-xs font-semibold" style={{ color: C.red }}>{catError}</p>
              )}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={saveCat} disabled={catSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
                style={{ background: C.teal, color: "#fff" }}>
                {catSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={closeCatModal} disabled={catSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL: إضافة / تعديل وجبة ════════ */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeItemModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl flex flex-col max-h-[90vh]" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>{editItem ? "تعديل وجبة" : "إضافة وجبة"}</h2>
              <button onClick={closeItemModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" dir="rtl">
              <Field label="اسم الوجبة" required>
                <input type="text" value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="مثال: برجر دبل تشيز"
                  className={inputCls} style={inputSty} />
              </Field>
              <Field label="الوصف">
                <textarea value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="وصف مختصر للوجبة..." rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={inputSty} />
              </Field>
              <Field label="السعر (ج.م)" required>
                <input type="number" min="0" step="0.5" value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="85"
                  className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
              </Field>
              <Field label="القسم" required>
                <select value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ ...inputSty, colorScheme: "dark" }}>
                  <option value={0} disabled>اختر القسم</option>
                  {restCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <ImageUploadField
                label="صورة الوجبة"
                preview={itemImagePreview}
                onPickFile={(src) => setCropState({ src, aspect: 1, field: "item", compress: COMPRESS.image })}
                maxSize={3 * 1024 * 1024}
                maxSizeMsg="حجم الصورة أكبر من 3MB"
                sizeError={itemImageError}
                onSizeError={setItemImageError}
                aspect={1}
                helperText="PNG أو JPG - بحد أقصى 3MB - مربع 1:1"
              />
              {/* ── Extra groups ── */}
              <div className="flex flex-col gap-3">

                {/* Section header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wide uppercase" style={{ color: C.muted }}>
                    مجموعات الإضافات
                  </span>
                  <button
                    type="button"
                    onClick={addExtraGroup}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold transition-opacity hover:opacity-80"
                    style={{ background: `${C.teal}22`, color: C.teal }}
                  >
                    + إضافة مجموعة
                  </button>
                </div>

                {extraGroups.length === 0 && (
                  <p className="text-xs text-center py-3 rounded-xl" style={{ color: C.muted, background: C.bg }}>
                    لا توجد مجموعات — اضغط لإضافة
                  </p>
                )}

                {/* Groups list */}
                <div className="flex flex-col space-y-4">
                  {extraGroups.map((g) => {
                    const isCollapsed = collapsedGroups.has(g.key);
                    const liveMin     = g.type === "variant" ? safeMinPrice(g.extras) : null;
                    return (
                      <div key={g.key} className="rounded-2xl overflow-hidden"
                        style={{ background: C.bg, border: `1px solid ${C.border}` }}>

                        {/* Clickable header — toggles collapse */}
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                          style={{ borderBottom: isCollapsed ? "none" : `1px solid ${C.border}`, background: `${C.teal}0a` }}
                          onClick={() => toggleGroupCollapse(g.key)}
                        >
                          {/* Chevron */}
                          <span className="text-xs flex-shrink-0 transition-transform"
                            style={{ color: C.muted, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block" }}>
                            ▾
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: g.type === "variant" ? `${C.orange}22` : `${C.teal}22`,
                              color:      g.type === "variant" ? C.orange        : C.teal,
                            }}>
                            {g.type === "variant" ? "اختيار إجباري" : "اختياري"}
                          </span>

                          {/* Name input — isolated from collapse toggle */}
                          <div className="flex-1 flex flex-col min-w-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5">
                              <input
                                type="text"
                                value={g.name}
                                data-focus-key={`group-name-${g.key}`}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateExtraGroup(g.key, { name: v });
                                  if (v.trim()) setGroupNameErrors((prev) => { const next = new Set(prev); next.delete(g.key); return next; });
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder={SUGGESTED_NAMES[g.type] ?? "اسم المجموعة"}
                                className="flex-1 bg-transparent text-sm font-semibold outline-none min-w-0"
                                style={{
                                  color: C.text,
                                  borderBottom: groupNameErrors.has(g.key) ? `1px solid ${C.red}` : "1px solid transparent",
                                }}
                              />
                              <span style={{ color: C.red, fontSize: 12, lineHeight: 1 }}>*</span>
                            </div>
                            {groupNameErrors.has(g.key) && (
                              <span className="text-[10px] mt-0.5" style={{ color: C.red }}>اسم المجموعة مطلوب</span>
                            )}
                          </div>

                          {/* Live pricing preview (variant groups only) */}
                          {liveMin !== null && (
                            <span className="text-xs font-bold flex-shrink-0 mt-1"
                              style={{ color: C.orange }}>
                              يبدأ من {liveMin} ج.م
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeExtraGroup(g.key); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs hover:opacity-80"
                            style={{ background: `${C.red}18`, color: C.red }}
                          >✕</button>
                        </div>

                        {/* Collapsible body */}
                        {!isCollapsed && (
                          <>
                            {/* Type selector */}
                            <div className="flex items-center gap-1 px-3 py-2"
                              style={{ borderBottom: `1px solid ${C.border}` }}>
                              {([
                                { value: "checkbox", label: "إضافات اختيارية" },
                                { value: "variant",  label: "حجم / نوع"        },
                              ] as { value: string; label: string }[]).map((opt) => {
                                const active = g.type === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleGroupTypeChange(g.key, opt.value)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{
                                      background: active
                                        ? (opt.value === "variant" ? `${C.orange}33` : `${C.teal}33`)
                                        : "transparent",
                                      color: active
                                        ? (opt.value === "variant" ? C.orange : C.teal)
                                        : C.muted,
                                      border: `1px solid ${active
                                        ? (opt.value === "variant" ? `${C.orange}66` : `${C.teal}66`)
                                        : "transparent"}`,
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Controls row — hidden for variant (required+max locked) */}
                            {g.type !== "variant" && (
                              <div className="flex items-center gap-4 px-3 py-2 flex-wrap"
                                style={{ borderBottom: `1px solid ${C.border}` }}>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <div
                                    onClick={() => updateExtraGroup(g.key, { required: !g.required })}
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                                    style={{
                                      background: g.required ? C.teal : "transparent",
                                      border: `2px solid ${g.required ? C.teal : C.border}`,
                                    }}
                                  >
                                    {g.required && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                                  </div>
                                  <span className="text-xs" style={{ color: C.text }}>مطلوب</span>
                                </label>

                                <div className="flex items-center gap-2 mr-auto">
                                  <span className="text-xs" style={{ color: C.muted }}>الحد الأقصى</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={g.max_select}
                                    onChange={(e) => updateExtraGroup(g.key, { max_select: Math.max(1, Number(e.target.value)) })}
                                    className="w-14 rounded-lg px-2 py-1 text-sm text-center outline-none"
                                    style={{ ...inputSty, colorScheme: "dark" }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Extras list */}
                            <div className="px-3 py-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold" style={{ color: C.muted }}>
                                  الاختيارات
                                  {g.extras.length > 0 && (
                                    <span className="mr-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                                      style={{ background: `${C.border}88`, color: C.muted }}>
                                      {g.extras.length}
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addExtraToGroup(g.key)}
                                  className="px-3 py-1 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
                                  style={{ background: `${C.orange}30`, color: C.orange }}
                                >
                                  + إضافة اختيار
                                </button>
                              </div>

                              {g.extras.length === 0 && (
                                <p className="text-[11px] text-center py-2 rounded-lg"
                                  style={{ color: C.muted, background: `${C.border}44` }}>
                                  لا يوجد اختيارات بعد
                                </p>
                              )}

                              <div className="flex flex-col space-y-2">
                                {g.extras.map((ex) => (
                                  <div key={ex.key} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                                    style={{ background: C.card, border: `1px solid ${C.border}` }}>
                                    <input
                                      type="text"
                                      value={ex.name}
                                      data-focus-key={`extra-name-${g.key}-${ex.key}`}
                                      onChange={(e) => { const v = e.target.value; updateExtraInGroup(g.key, ex.key, { name: v }); }}
                                      placeholder="مثال: كبير، جبنة إضافية..."
                                      className="flex-1 bg-transparent text-sm outline-none min-w-0"
                                      style={{ color: C.text }}
                                    />
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={ex.price}
                                        onChange={(e) => { const v = e.target.value; updateExtraInGroup(g.key, ex.key, { price: Math.max(0, Number(v)) }); }}
                                        className="w-16 rounded-lg px-2 py-1 text-sm text-center outline-none"
                                        style={{ ...inputSty, colorScheme: "dark" }}
                                      />
                                      <span className="text-[11px]" style={{ color: C.muted }}>ج.م</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeExtraFromGroup(g.key, ex.key)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs hover:opacity-80 flex-shrink-0"
                                      style={{ background: `${C.red}18`, color: C.red }}
                                    >✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {itemError && (
                <p className="text-xs font-semibold" style={{ color: C.red }}>{itemError}</p>
              )}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={saveItem} disabled={itemSaving || isUploadingImage}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
                style={{ background: C.teal, color: "#fff" }}>
                {isUploadingImage
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block">⏳</span>جاري رفع الصورة...</span>
                  : itemSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={closeItemModal} disabled={itemSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
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

      {/* ════════ TOAST ════════ */}
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg pointer-events-none"
          style={{ background: C.orange, color: "#fff", whiteSpace: "nowrap" }}
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}
