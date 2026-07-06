# Project Architecture

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document describes how the Hala Delivery project is organized.

Its goal is to explain ownership.

Every developer should understand where responsibilities belong before modifying any code.

If ownership is unclear, implementation should stop until it becomes clear.

---

## High-Level Architecture

Hala Delivery is organized as a collection of applications that share the same business domain.

Applications remain independent while sharing business logic and domain models.

```
                    Hala Delivery Ecosystem

                    ┌──────────────────┐
                    │  Shared Business │
                    │  Logic & Domain  │
                    │  Models & Types  │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    Customer App        Admin Dashboard     Driver/Staff Apps
    (app/(customer)/)   (app/admin/)        (app/driver/, app/staff/)
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌──────────────────┐
                    │  Shared UI Comps │
                    │  (components/    │
                    │   shared/)       │
                    └──────────────────┘
                             │
                    ┌──────────────────┐
                    │  Database        │
                    │  (Supabase)      │
                    └──────────────────┘
```

Each application owns its own UI. Business logic is shared whenever possible.

---

## Architectural Layers

The project is intentionally separated into layers.

Responsibilities must never move upward.

```
UI (app/, components/)
    ↓
Shared Components (components/shared/)
    ↓
Hooks (hooks/)
    ↓
Business Logic (lib/)
    ↓
Data Mappers (lib/restaurant/mappers.ts)
    ↓
Database (supabase/)
```

Business rules should **never** be implemented inside React components.

---

## Layer Ownership

### app/ — Application Pages

**Purpose:** Routing, screen composition, page-level state.

- `app/(customer)/` — Customer-facing pages (restaurant browsing, cart, checkout, orders)
- `app/admin/` — Admin dashboard (orders, restaurants, staff tools)
- `app/driver/` — Driver delivery workflow
- `app/staff/` — Internal tools, kitchen workflow

**Rules:**
- Pages coordinate behavior but never own reusable business logic.
- Pages connect shared components together.
- Page-level state stays local to the page.

### components/ — Reusable UI

**Purpose:** Presentation and user interaction.

- `components/shared/` — UI shared across multiple applications
- `components/customer/` — Customer-only UI
- `components/admin/` — Admin-only UI
- `components/driver/` — Driver-only UI
- `components/staff/` — Staff-only UI

**Rules:**
- Components never own business rules.
- Shared components never know which application uses them.
- Behavior is injected by parents through props (composition).

### hooks/ — Reusable Stateful Behavior

**Purpose:** State management, shared interaction logic.

Current shared hooks:
- `useMealConfigurator` — Meal configuration state (quantity, sizes, extras, pricing)
- `useCart` — Cart state management
- `useAuth` — Authentication state
- `useCurrentUser` — Current user identity
- `useAutoRefresh` — Periodic data refresh

**Rules:**
- Hooks own state, not rendering.
- Hooks should not know whether they are used by Customer or Admin.

### lib/ — Business Logic

**Purpose:** Everything that is not UI.

- `lib/pricing.ts` — Pricing, offers, effective prices (single source of truth)
- `lib/restaurant/types.ts` — Shared domain types
- `lib/restaurant/mappers.ts` — Database-to-UI model transformations
- `lib/cart.ts` — Cart operations
- `lib/auth/` — Authentication logic
- `lib/server/auth/` — Server-side authentication
- `lib/utils/` — Shared utility functions

**Rules:**
- Business rules belong here.
- Never duplicate business logic in components.

### supabase/ — Database

**Purpose:** Everything database-related.

- Migrations (`supabase/migrations/`)
- SQL functions (e.g., `apply_order_edit`)
- Seed scripts
- Database schema

**Rules:**
- Never place SQL inside React components.
- Critical operations should use SQL functions for atomicity.

---

## Shared Components Philosophy

Shared components must remain application-agnostic.

**Good:**
```tsx
<MealCard
  name={meal.name}
  price={meal.price}
  onClick={handleSelect}
  footer={<AddButton onClick={handleAdd} />}
/>
```

**Avoid:**
```tsx
<MealCard
  isAdmin={true}
  isCustomer={false}
  showCounter={true}
  editable={true}
/>
```

**Rules:**
- Parents own behavior through callbacks.
- Components own rendering.
- Use composition over feature flags.

---

## Theme System

Shared components are theme-aware through CSS Variables.

- Customer applications use light theme (`:root` variables)
- Admin applications use dark theme (inline style overrides)

The theme is provided by the parent container, not the component.

---

## Data Flow

Data moves through predictable layers:

```
Database (Supabase)
    ↓
Mapper transforms DB models → UI models
    ↓
Hook manages state (useMealConfigurator, etc.)
    ↓
Component renders UI
    ↓
User interaction triggers callback
    ↓
Business logic processes action (lib/)
    ↓
Database updated (atomic when critical)
```

Every transformation has a clear owner.

---

## Identity Rules

- Always prefer IDs over names.
- `menu_item_id`, `categoryId`, `extraId` are stable identifiers.
- Names are presentation and may change.
- Identity must always be based on immutable values.

---

## Ownership Summary

| Responsibility | Owner |
|---|---|
| Pricing | `lib/pricing.ts` |
| Restaurant mapping | `lib/restaurant/mappers.ts` |
| Restaurant types | `lib/restaurant/types.ts` |
| Meal configuration | `hooks/useMealConfigurator.ts` |
| Order editing session | Page state in `app/admin/orders/page.tsx` |
| UI rendering | Shared components |
| Routing | `app/` |
| Database transactions | Supabase SQL functions |

---

## Anti-Patterns

Never:
- Put pricing logic inside components.
- Put SQL logic inside UI.
- Duplicate hooks, mappers, or shared types.
- Create parallel implementations.
- Couple shared components to a specific application.
- Use feature flags when composition solves the problem.

---

## Checklist

- [ ] I know which architectural layer this file belongs to.
- [ ] I know which layer should own the requested behavior.
- [ ] I am not moving responsibilities into the wrong layer.
- [ ] I searched for an existing implementation.
- [ ] I understand the data flow.
- [ ] I understand the ownership.

---

## AI Acknowledgement

✓ I understand the project architecture.

✓ I understand folder ownership.

✓ I understand architectural layers.

✓ I understand shared component philosophy.

✓ I will preserve these architectural boundaries.
