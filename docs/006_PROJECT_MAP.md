# Project Map

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document explains where every responsibility lives inside the Hala Delivery ecosystem.

It is a navigation guide, not a business rules document.

Always consult this file before searching randomly through the project.

---

## High-Level Structure

```
app/          — Application entry points (routing, pages)
components/   — Reusable UI
hooks/        — Reusable stateful behavior
lib/          — Shared business logic
supabase/     — Database (migrations, SQL functions)
types/        — Shared domain models (when not in lib/restaurant/types.ts)
public/       — Static assets
docs/         — Engineering documentation
```

---

## app/ — Application Pages

### Customer: `app/(customer)/`
- Restaurant browsing
- Cart
- Checkout
- Order history

### Admin: `app/admin/`
- Dashboard
- Orders management (including Order Editing)
- Restaurants management
- Staff tools

### Driver: `app/driver/`
- Assigned orders
- Navigation
- Delivery workflow

### Staff: `app/staff/`
- Internal tools
- Kitchen workflow
- Customer service

**Rules:**
- Pages coordinate behavior but never own reusable business logic.
- Pages connect shared components together.
- Page-level state stays local to the page.

---

## components/ — Reusable UI

### `components/shared/`
Application-agnostic UI used across multiple apps.

| Component | Purpose |
|---|---|
| `restaurant/MealCard.tsx` | Meal card display (image, name, price, description, footer slot) |
| `restaurant/MealConfigPanel.tsx` | Configuration UI (sizes, extras, quantity, notes) |

### `components/customer/`
Customer-only UI (e.g., `MealBottomSheet.tsx`, `ConfirmModal.tsx`).

### `components/admin/`
Admin-only UI (e.g., `OrderItemAddPanel.tsx`).

**Rules:**
- Shared components never know who uses them.
- Parents inject behavior through props (composition).
- No `isAdmin`/`isCustomer` feature flags.

---

## hooks/ — Reusable Stateful Behavior

| Hook | Location | Purpose |
|---|---|---|
| `useMealConfigurator` | `hooks/useMealConfigurator.ts` | Meal configuration state, pricing calculation |
| `useCart` | `hooks/useCart.ts` | Cart state management |
| `useAuth` | `hooks/useAuth.ts` | Authentication state |
| `useCurrentUser` | `hooks/useCurrentUser.ts` | Current user identity |
| `useAutoRefresh` | `hooks/useAutoRefresh.ts` | Periodic data refresh |

**Rules:**
- Hooks own state, not rendering.
- Hooks should not know which application consumes them.

---

## lib/ — Shared Business Logic

| File | Responsibility |
|---|---|
| `lib/pricing.ts` | Offers, effective prices, discount calculations (single source of truth) |
| `lib/restaurant/types.ts` | Shared domain types (MenuItem, Category, ExtraGroup, etc.) |
| `lib/restaurant/mappers.ts` | Database model → UI model transformations |
| `lib/cart.ts` | Cart operations (add, remove, clear, conflict detection) |
| `lib/supabase.ts` | Supabase client initialization |
| `lib/auth/` | Authentication logic |
| `lib/server/auth/` | Server-side authentication |
| `lib/utils/` | Shared utility functions |

---

## supabase/ — Database

| Path | Purpose |
|---|---|
| `supabase/migrations/` | SQL migrations (e.g., `20260705_atomic_order_edit.sql`) |
| `supabase/functions/` | Database functions |

**Rules:**
- Never place SQL inside React components.
- Critical operations use SQL functions for atomicity.

---

## Domain Models Location

| Model | Location |
|---|---|
| MenuItem, Category, ExtraGroup, ItemExtra, Size | `lib/restaurant/types.ts` |
| SheetMeal, ExtraGroupSheet | `lib/restaurant/types.ts` (output of mappers) |
| CartItem | `lib/cart.ts` |
| OrderEditSession, OrderEditItem | Local in `app/admin/orders/page.tsx` |

---

## Shared UI Components

| Component | Location |
|---|---|
| MealCard | `components/shared/restaurant/MealCard.tsx` |
| MealConfigPanel | `components/shared/restaurant/MealConfigPanel.tsx` |
| MealBottomSheet | `components/customer/MealBottomSheet.tsx` |
| OrderItemAddPanel | `components/admin/OrderItemAddPanel.tsx` |

---

## Database Functions

| Function | Purpose | Location |
|---|---|---|
| `apply_order_edit` | Atomic delete/insert/update for order editing | `supabase/migrations/20260705_atomic_order_edit.sql` |

---

## Where Should New Code Go?

| If it is ... | Put it in ... |
|---|---|
| UI | `components/` (shared or app-specific) |
| Business logic | `lib/` |
| Stateful behavior | `hooks/` |
| Routing / pages | `app/` |
| Database | `supabase/` |
| Shared types | `lib/restaurant/types.ts` or `types/` |

**If ownership is unclear — Stop. Investigate first.**

---

## Checklist

- [ ] Does a similar file already exist?
- [ ] Am I placing this in the correct layer?
- [ ] Am I duplicating an existing responsibility?
- [ ] Is this folder the real owner?

Only after answering YES should implementation begin.

---

## AI Acknowledgement

✓ I understand where each responsibility lives.

✓ I will use this map to find existing code before creating new files.

✓ I will place new code in the correct layer.

✓ I will stop and investigate if ownership is unclear.
