# Project Status

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document describes the current implementation status of the Hala Delivery ecosystem.

It serves as a live snapshot of the project's capabilities.

Future contributors should read this before planning new work to avoid rebuilding features that already exist.

---

## Applications

| Application | Location | Status |
|---|---|---|
| Customer App | `app/(customer)/` | ✅ Active |
| Admin Dashboard | `app/admin/` | ✅ Active |
| Driver Dashboard | `app/driver/` | ✅ Active |
| Staff Dashboard | `app/staff/` | ✅ Active |

Each application owns its own UI. Business logic is shared whenever possible.

---

## Shared Systems

### Shared Restaurant Experience

**Status:** ✅ Implemented

The restaurant browsing experience is shared between Customer and Admin:
- Categories browsing
- Meal cards
- Meal configuration (sizes, extras, quantity, notes)
- Pricing presentation

Customer: Meal Selection → Cart
Admin: Meal Selection → Order Editing

### Meal Configuration

**Status:** ✅ Implemented

Shared hook: `useMealConfigurator()` in `hooks/useMealConfigurator.ts`

Responsible for:
- Quantity
- Required variant selection
- Optional extras selection
- Notes
- Price calculation (active price, effective price, total)

### Pricing

**Status:** ✅ Centralized

Single source of truth: `lib/pricing.ts`

Responsible for:
- Offer detection
- Effective price calculation
- Discount computation

### Restaurant Mapping

**Status:** ✅ Centralized

Shared mapper: `lib/restaurant/mappers.ts`

Transforms database models → UI models (e.g., `MenuItem` → `SheetMeal`)

### Restaurant Types

**Status:** ✅ Centralized

Shared types: `lib/restaurant/types.ts`

Contains: `MenuItem`, `Category`, `ExtraGroup`, `ItemExtra`, `Size`, `SheetMeal`, `ExtraGroupSheet`

---

## Order Editing

**Status:** ✅ Version 1 Complete

### Implemented Behaviors

| Behavior | Sprint | Status |
|---|---|---|
| Enter Edit Mode | Sprint 1 | ✅ |
| Cancel Editing (revert) | Sprint 1 | ✅ |
| Remove Item | Sprint 3 | ✅ |
| Edit Quantity | Sprint 4 | ✅ |
| Add Item (shared browsing) | Sprint 6 | ✅ |
| Atomic Save | Sprint 7.1 | ✅ |
| menu_item_id preservation | Bug fix | ✅ |
| size_name preservation | Bug fix | ✅ |
| category_name display | Bug fix | ✅ |
| Sized item price fix | Bug fix | ✅ |
| Dark theme for MealCard | Bug fix | ✅ |

### Current Guarantees
- `menu_item_id` preserved through entire flow
- `size_name` preserved through entire flow
- Category name displayed inline
- Pricing preserved correctly for sized items
- Atomic persistence (all-or-nothing save)
- Reversible editing (cancel restores original state)

---

## Theme System

**Status:** ✅ Implemented

| Context | Theme |
|---|---|
| Customer | Light (CSS `:root` variables) |
| Admin | Dark (inline style overrides) |
| Shared components | CSS variables (`var(--color-...)`) |

No duplicated UI exists for theme differences.

---

## Database

**Status:** ✅ Stable

| Feature | Status |
|---|---|
| Atomic order editing (`apply_order_edit`) | ✅ Deployed |
| Stable IDs | ✅ Enforced |
| Supabase backend | ✅ Active |
| Migrations | ✅ Tracked |

---

## Engineering Health

| Area | Status |
|---|---|
| Business Logic | ✅ Shared |
| Pricing | ✅ Centralized |
| Restaurant Types | ✅ Centralized |
| Restaurant Mapping | ✅ Centralized |
| Meal Configuration | ✅ Shared |
| Order Editing | ✅ Completed (V1) |
| Theme System | ✅ Shared |
| Atomic Saving | ✅ Implemented |
| Data Integrity | ✅ Preserved |

---

## Technical Debt

**Current known debt:** None requiring immediate action.

Potential future improvements should be discussed through ADRs before implementation.

---

## Checklist

- [ ] Does this capability already exist?
- [ ] Is there already a shared implementation?
- [ ] Is this feature already listed as completed?
- [ ] Am I accidentally rebuilding an existing feature?

If unsure — Investigate first.

---

## AI Acknowledgement

✓ I understand the current state of the project.

✓ I understand which systems are already complete.

✓ I will avoid rebuilding existing functionality.

✓ I will extend the current architecture rather than replacing it.
