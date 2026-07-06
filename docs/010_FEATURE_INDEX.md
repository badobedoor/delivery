# Feature Index

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document indexes every feature implemented in the Hala Delivery ecosystem.

It is a navigation aid — not a specification.

Use this file to quickly determine where a feature lives and which files implement it.

---

## Customer Application

### Restaurant Browsing

**Location:** `app/(customer)/page.tsx`

| File | Purpose |
|---|---|
| `app/(customer)/page.tsx` | Main restaurant page with category tabs and meal cards |
| `components/shared/restaurant/MealCard.tsx` | Individual meal card |
| `components/shared/restaurant/MealConfigPanel.tsx` | Meal configuration (sizes, extras, qty, notes) |
| `components/customer/MealBottomSheet.tsx` | Bottom sheet for meal configuration |
| `components/customer/ConfirmModal.tsx` | Cart conflict confirmation |
| `lib/restaurant/mappers.ts` | Database → UI model transformation |
| `lib/restaurant/types.ts` | Shared domain types |

### Cart

**Location:** `lib/cart.ts`

| File | Purpose |
|---|---|
| `lib/cart.ts` | Cart state, add/remove/clear, conflict detection |
| `app/(customer)/cart/page.tsx` | Cart page |

### Checkout

**Location:** `app/(customer)/checkout/`

| File | Purpose |
|---|---|
| `app/(customer)/checkout/page.tsx` | Checkout page |
| `app/api/orders/route.ts` | Order creation API |

### Orders

**Location:** `app/(customer)/orders/`

| File | Purpose |
|---|---|
| `app/(customer)/orders/page.tsx` | Order history |

---

## Admin Application

### Dashboard

**Location:** `app/admin/page.tsx`

### Orders Management

**Location:** `app/admin/orders/page.tsx`

| Sprint | Behavior | Key Files |
|---|---|---|
| Sprint 1 | Enter Edit Mode | `page.tsx` — `enterEditMode()`, `editMode` state |
| Sprint 1 | Cancel Editing | `page.tsx` — `cancelEdit()`, reverts session |
| Sprint 2 | Formal OrderEditSession model | `page.tsx` — `OrderEditSession`, `OrderEditItem` types |
| Sprint 3 | Remove Item | `page.tsx` — `handleRemoveItem()` |
| Sprint 4 | Edit Quantity | `page.tsx` — `handleEditQuantity()` |
| Sprint 6 | Add Item (shared browsing) | `components/admin/OrderItemAddPanel.tsx` |
| Sprint 7 | Persistence (Apply Changes) | `page.tsx` — `handleApplyEdit()`, saved to DB |
| Sprint 7.1 | Atomic save | `supabase/migrations/20260705_atomic_order_edit.sql` |
| — | menu_item_id preservation | Query fix in `page.tsx` (select `menu_item_id`) |
| — | size_name preservation | Query + mapper + session fix |
| — | category_name display | Query join + modal display |
| — | Sized item price fix | `OrderItemAddPanel.tsx` — `config.activePrice` |
| — | Dark theme for MealCard | `MealCard.tsx` — CSS variables |

### Add Item Panel

**Location:** `components/admin/OrderItemAddPanel.tsx`

| Feature | Detail |
|---|---|
| Browse categories + meals | Fetches restaurant menu |
| Select meal with extras | Opens `ConfigureMealView` |
| Direct add (no extras) | Inline "+" button on `MealCard` |
| Configure sizes + extras | Uses `useMealConfigurator` |
| Returns `OrderItemAddResult` | Includes `menuItemId`, `size_name`, `price` |

---

## Driver Application

**Location:** `app/driver/`

| Feature | Location |
|---|---|
| Assigned orders | `app/driver/orders/` |
| Delivery workflow | `app/driver/` |

---

## Staff Application

**Location:** `app/staff/`

| Feature | Location |
|---|---|
| Internal tools | `app/staff/` |
| Kitchen workflow | `app/staff/` |

---

## Shared Systems

### Pricing

**Location:** `lib/pricing.ts`

| Feature | Detail |
|---|---|
| Offer detection | Active offer based on date range |
| Effective price | `offer_price ?? base_price` |
| Discount calculation | Percentage display |

### Meal Configuration

**Location:** `hooks/useMealConfigurator.ts`

| Feature | Detail |
|---|---|
| Quantity | `qty`, `incrementQty()`, `decrementQty()` |
| Size selection | `selectedSize`, `setSelectedSize()` |
| Extra selection | `selectedExtras`, `toggleExtra()` |
| Notes | `note`, `setNote()` |
| Price calculation | `activePrice`, `effectivePrice`, `displayPrice`, `total` |

### Restaurant Mapping

**Location:** `lib/restaurant/mappers.ts`

| Function | Purpose |
|---|---|
| `toSheetMeal(menuItem)` | Transforms `MenuItem` → `SheetMeal`, splitting extra_groups into sizes and extras |

---

## Database

| Object | Purpose | Location |
|---|---|---|
| `apply_order_edit` | Atomic order edit persistence | `supabase/migrations/20260705_atomic_order_edit.sql` |
| `order_items` table | Order items with `menu_item_id`, `size_name`, `extras` | Supabase schema |
| `orders` table | Orders with `subtotal`, `total`, `notes` | Supabase schema |

---

## Theme System

| Context | Mechanism | Location |
|---|---|---|
| Light (Customer) | `:root` CSS variables | `app/globals.css` |
| Dark (Admin) | Inline style overrides | `OrderItemAddPanel.tsx` (root div) |
| Shared components | `var(--color-...)` references | `MealCard.tsx`, `MealConfigPanel.tsx` |

---

## How to Read This Index

Each feature entry shows:
- **What** the feature does
- **Where** the implementation lives
- **Which** files are involved

Use this index to:
1. Find existing implementations before building new ones.
2. Understand which files a change will affect.
3. Trace the history of a feature across sprints.

---

## Checklist

- [ ] Did I check this index to see if the feature already exists?
- [ ] Do I know which files I need to modify?
- [ ] Am I building something that already exists?

---

## AI Acknowledgement

✓ I understand this index maps features to files.

✓ I will consult this index before planning new work.

✓ I will update this index when adding new features.
