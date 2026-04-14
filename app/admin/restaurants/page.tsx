"use client";

import { useState } from "react";

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
  id: number; name: string; desc: string; phone: string;
  opens: string; closes: string; rating: number; active: boolean;
};
type Category  = { id: number; restaurantId: number; name: string };
type Extra     = { id: number; name: string; price: string };
type MenuItem  = {
  id: number; categoryId: number; name: string;
  price: string; isBestSeller: boolean; extras: Extra[];
};

/* ── Seed data ── */
const seed: Restaurant[] = [
  { id: 1, name: "بيت البرجر",   desc: "أشهى البرجر الأمريكي بأفضل المكونات الطازجة",   phone: "0100-111-2233", opens: "10:00", closes: "00:00", rating: 4.8, active: true  },
  { id: 2, name: "ليالي بيتزا",  desc: "بيتزا إيطالية أصيلة بعجينة رقيقة مقرمشة",      phone: "0101-222-3344", opens: "12:00", closes: "01:00", rating: 4.6, active: true  },
  { id: 3, name: "شاورما الشام", desc: "شاورما لحم ودجاج بالطريقة الشامية الأصيلة",     phone: "0102-333-4455", opens: "09:00", closes: "23:00", rating: 4.5, active: true  },
  { id: 4, name: "كشري التحرير", desc: "كشري مصري أصيل بأفضل الأسعار في القاهرة",      phone: "0103-444-5566", opens: "08:00", closes: "22:00", rating: 4.3, active: false },
  { id: 5, name: "سوشي تايم",   desc: "سوشي ياباني طازج يومياً بأيدي خبراء يابانيين", phone: "0104-555-6677", opens: "13:00", closes: "00:00", rating: 4.7, active: true  },
  { id: 6, name: "حلويات النصر", desc: "حلويات شرقية وغربية وكيك مناسبات بالطلب",      phone: "0105-666-7788", opens: "10:00", closes: "23:00", rating: 4.4, active: false },
];

const seedCategories: Category[] = [
  { id: 1, restaurantId: 1, name: "برجر" },
  { id: 2, restaurantId: 1, name: "مشروبات" },
  { id: 3, restaurantId: 1, name: "إضافات جانبية" },
];

const seedItems: MenuItem[] = [
  {
    id: 1, categoryId: 1, name: "برجر دبل تشيز", price: "85 ج.م", isBestSeller: true,
    extras: [
      { id: 1, name: "صوص حار",      price: "5 ج.م"  },
      { id: 2, name: "جبنة إضافية",  price: "10 ج.م" },
    ],
  },
  {
    id: 2, categoryId: 1, name: "برجر كريسبي دجاج", price: "75 ج.م", isBestSeller: false,
    extras: [{ id: 3, name: "صوص تارتار", price: "5 ج.م" }],
  },
  {
    id: 3, categoryId: 2, name: "كولا",          price: "20 ج.م", isBestSeller: false, extras: [],
  },
  {
    id: 4, categoryId: 2, name: "عصير ليمون",   price: "25 ج.م", isBestSeller: false, extras: [],
  },
  {
    id: 5, categoryId: 3, name: "بطاطس مقلية كبيرة", price: "28 ج.م", isBestSeller: true,
    extras: [{ id: 4, name: "صوص كيتشاب إضافي", price: "3 ج.م" }],
  },
];

/* ── Helpers ── */
function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={C.orange} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function formatHours(opens: string, closes: string) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h < 12 ? "ص" : "م";
    const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
  };
  return `${fmt(opens)} – ${fmt(closes)}`;
}

/* ── Shared field component ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";
const inputSty = { background: C.bg, border: `1px solid ${C.border}`, color: C.text };

const emptyRestForm = { name: "", desc: "", phone: "", opens: "10:00", closes: "23:00", image: "" };
const emptyItemForm = { name: "", price: "", categoryId: 0, isBestSeller: false };

let nextId = 100;
const uid = () => ++nextId;

/* ════════════════════════════════════════════════════════════ */
export default function AdminRestaurantsPage() {

  /* ── Restaurant list state ── */
  const [rows,        setRows]        = useState<Restaurant[]>(seed);
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<"الكل" | "نشط" | "غير نشط">("الكل");
  const [showModal,   setShowModal]   = useState(false);
  const [restForm,    setRestForm]    = useState(emptyRestForm);
  const [imageLabel,  setImageLabel]  = useState("اختر صورة...");

  /* ── Menu view state ── */
  const [selectedRest,  setSelectedRest]  = useState<Restaurant | null>(null);
  const [categories,    setCategories]    = useState<Category[]>(seedCategories);
  const [menuItems,     setMenuItems]     = useState<MenuItem[]>(seedItems);

  /* ── Category modal ── */
  const [showCatModal,  setShowCatModal]  = useState(false);
  const [editCat,       setEditCat]       = useState<Category | null>(null);
  const [catName,       setCatName]       = useState("");

  /* ── Item modal ── */
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem,      setEditItem]      = useState<MenuItem | null>(null);
  const [itemForm,      setItemForm]      = useState(emptyItemForm);

  /* ── Extras modal ── */
  const [extrasTarget,  setExtrasTarget]  = useState<MenuItem | null>(null);
  const [draftExtras,   setDraftExtras]   = useState<Extra[]>([]);
  const [extraForm,     setExtraForm]     = useState({ name: "", price: "" });

  /* ── Filtered restaurants ── */
  const filtered = rows.filter((r) => {
    const q = search.trim();
    const matchSearch = !q || r.name.includes(q) || r.phone.includes(q);
    const matchStatus =
      statusFilter === "الكل"    ? true :
      statusFilter === "نشط"    ? r.active :
                                   !r.active;
    return matchSearch && matchStatus;
  });

  /* ── Restaurant actions ── */
  function toggleActive(id: number) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }
  function handleSaveRest() {
    if (!restForm.name.trim()) return;
    const newR: Restaurant = {
      id: uid(), name: restForm.name.trim(), desc: restForm.desc.trim() || "—",
      phone: restForm.phone.trim() || "—", opens: restForm.opens,
      closes: restForm.closes, rating: 5.0, active: true,
    };
    setRows((p) => [newR, ...p]);
    setRestForm(emptyRestForm); setImageLabel("اختر صورة..."); setShowModal(false);
  }
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageLabel(file ? file.name : "اختر صورة...");
  }

  /* ── Menu open ── */
  function openMenu(r: Restaurant) { setSelectedRest(r); }
  function closeMenu()              { setSelectedRest(null); }

  /* ── Category actions ── */
  function openAddCat()            { setEditCat(null); setCatName(""); setShowCatModal(true); }
  function openEditCat(c: Category){ setEditCat(c);    setCatName(c.name); setShowCatModal(true); }
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
      setMenuItems((p) => [...p, { id: uid(), categoryId: itemForm.categoryId, name: itemForm.name.trim(), price: itemForm.price.trim(), isBestSeller: itemForm.isBestSeller, extras: [] }]);
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

  /* ── Derived for menu view ── */
  const restCats   = selectedRest ? categories.filter((c) => c.restaurantId === selectedRest.id) : [];
  const catOptions = restCats;

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
                        <button
                          onClick={() => openAddItem(cat.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.teal}22`, color: C.teal }}
                        >+ وجبة</button>
                        <button
                          onClick={() => openEditCat(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.yellow}22`, color: C.yellow }}
                        >تعديل</button>
                        <button
                          onClick={() => deleteCat(cat.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.red}22`, color: C.red }}
                        >حذف</button>
                      </div>

                      {/* Items */}
                      {items.length === 0 ? (
                        <p className="px-4 py-5 text-center text-xs" style={{ color: C.muted }}>لا يوجد وجبات في هذا القسم</p>
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
                                <button
                                  onClick={() => openExtras(item)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.teal}22`, color: C.teal }}
                                >إضافات ({item.extras.length})</button>
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.yellow}22`, color: C.yellow }}
                                >تعديل</button>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                  style={{ background: `${C.red}22`, color: C.red }}
                                >حذف</button>
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
              onClick={() => setShowModal(true)}
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
                    {["الاسم", "الوصف", "التليفون", "ساعات العمل", "التقييم", "الحالة", "إجراءات"].map((col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-right font-semibold text-xs whitespace-nowrap${
                          i === 1 ? " hidden lg:table-cell" :
                          i === 2 ? " hidden sm:table-cell" :
                          i === 3 ? " hidden md:table-cell" : ""
                        }`}
                        style={{ color: C.muted }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                        لا توجد مطاعم مطابقة
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id}
                        style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>

                        {/* الاسم */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold whitespace-nowrap" style={{ color: C.text }}>{r.name}</p>
                        </td>

                        {/* الوصف */}
                        <td className="hidden lg:table-cell px-4 py-3 max-w-[220px]">
                          <p className="text-xs line-clamp-2" style={{ color: C.muted }}>{r.desc}</p>
                        </td>

                        {/* التليفون */}
                        <td className="hidden sm:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                          {r.phone}
                        </td>

                        {/* ساعات العمل */}
                        <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                          {formatHours(r.opens, r.closes)}
                        </td>

                        {/* التقييم */}
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs font-bold whitespace-nowrap" style={{ color: C.text }}>
                            <StarIcon />
                            {r.rating.toFixed(1)}
                          </span>
                        </td>

                        {/* الحالة */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(r.id)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                            style={{
                              background: r.active ? `${C.green}22` : `${C.red}22`,
                              color:      r.active ? C.green : C.red,
                            }}
                          >
                            {r.active ? "نشط" : "مش نشط"}
                          </button>
                        </td>

                        {/* إجراءات */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
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

      {/* ════════ MODAL: إضافة مطعم ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>

            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>إضافة مطعم جديد</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              <Field label="اسم المطعم" required>
                <input type="text" value={restForm.name} onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
                  placeholder="مثال: بيت البرجر" className={inputCls} style={inputSty} />
              </Field>

              <Field label="الوصف">
                <textarea value={restForm.desc} onChange={(e) => setRestForm({ ...restForm, desc: e.target.value })}
                  placeholder="وصف مختصر للمطعم..." rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={inputSty} />
              </Field>

              <Field label="التليفون">
                <input type="tel" value={restForm.phone} onChange={(e) => setRestForm({ ...restForm, phone: e.target.value })}
                  placeholder="01XX-XXX-XXXX" className={inputCls} style={inputSty} />
              </Field>

              <div className="flex gap-3">
                <Field label="بيفتح الساعة">
                  <input type="time" value={restForm.opens} onChange={(e) => setRestForm({ ...restForm, opens: e.target.value })}
                    className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
                </Field>
                <Field label="بيقفل الساعة">
                  <input type="time" value={restForm.closes} onChange={(e) => setRestForm({ ...restForm, closes: e.target.value })}
                    className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
                </Field>
              </div>

              <Field label="صورة المطعم">
                <label className="flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: C.bg, border: `1px dashed ${C.border}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${C.orange}22` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={C.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{imageLabel}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>PNG, JPG حتى 5MB</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </Field>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: C.border }}>
              <button onClick={handleSaveRest}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.orange, color: "#fff" }}>حفظ</button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>إلغاء</button>
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
              <h2 className="text-base font-black" style={{ color: C.text }}>{editCat ? "تعديل القسم" : "إضافة قسم"}</h2>
              <button onClick={() => setShowCatModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <Field label="اسم القسم" required>
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
                  placeholder="مثال: برجر، بيتزا، مشروبات..." className={inputCls} style={inputSty} />
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
              <h2 className="text-base font-black" style={{ color: C.text }}>{editItem ? "تعديل الوجبة" : "إضافة وجبة"}</h2>
              <button onClick={() => setShowItemModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <Field label="اسم الوجبة" required>
                <input type="text" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="مثال: برجر دبل تشيز" className={inputCls} style={inputSty} />
              </Field>
              <Field label="السعر" required>
                <input type="text" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="مثال: 85 ج.م" className={inputCls} style={inputSty} />
              </Field>
              <Field label="القسم" required>
                <select value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ ...inputSty, colorScheme: "dark" }}>
                  <option value={0} disabled>اختر القسم</option>
                  {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setItemForm({ ...itemForm, isBestSeller: !itemForm.isBestSeller })}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: itemForm.isBestSeller ? C.orange : C.bg, border: `2px solid ${itemForm.isBestSeller ? C.orange : C.border}` }}
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

            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-base font-black" style={{ color: C.text }}>إضافات الوجبة</h2>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{extrasTarget.name}</p>
              </div>
              <button onClick={() => setExtrasTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {/* Existing extras */}
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

              {/* Add extra row */}
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
    </>
  );
}
