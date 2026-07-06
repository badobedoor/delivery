# Terminology

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document defines every important term used throughout the Hala Delivery project.

Definitions are concise and project-specific.

When in doubt about a term's meaning, consult this document.

---

## A

### Atomic Save

A persistence operation that either completes entirely or not at all. In Hala Delivery, order editing is saved atomically via a single PostgreSQL function (`apply_order_edit`) that deletes old items, inserts new items, and updates totals in one transaction.

**See:** ADR-006 in `004_ADR.md`, KB-004 in `008_KNOWLEDGE_BASE.md`

---

## B

### Business Logic

Code that implements business rules — as opposed to UI rendering or data routing. In Hala Delivery, business logic lives in `lib/`. Pricing, validation, and calculations are business logic. Components and hooks consume business logic but should not own it.

**See:** `001_PROJECT_ARCHITECTURE.md` (Layers), `002_ENGINEERING_MANUAL.md` (Rule 7)

---

## C

### Cart Item

A configured meal ready for checkout. A Cart Item is not the same as a Menu Item — it represents the customer's specific selection including quantity, chosen variant, extras, and notes. Defined in `lib/cart.ts`.

**See:** `003_DOMAIN_REFERENCE.md` (Cart Item)

### Category

A logical grouping of menu items within a restaurant (e.g., Sandwiches, Pizza, Drinks). Identity is based on `category.id`, not `category.name`.

**See:** `003_DOMAIN_REFERENCE.md` (Category)

### Composition

A design pattern where parents inject behavior into shared components through props (e.g., `onClick`, `footer`) rather than using boolean feature flags (`isAdmin`, `isCustomer`). The core mechanism for keeping shared components application-agnostic.

**See:** ADR-004 in `004_ADR.md`

### CSS Variables

Custom properties (`var(--color-primary)`, `var(--color-secondary)`, etc.) used for theming. Customer provides light theme defaults via `:root` in `globals.css`. Admin overrides them via inline styles. Shared components use CSS variables instead of hardcoded colors.

**See:** ADR-005 in `004_ADR.md`, `009_CODING_STANDARDS.md`

---

## D

### Domain Model

A representation of a business entity (e.g., Restaurant, Menu Item, Order). Domain models are NOT UI models, page models, or API responses. They describe the business itself.

**See:** `003_DOMAIN_REFERENCE.md`

---

## E

### Extra

One selectable option within an Extra Group (e.g., Extra Cheese, Balady Bread). Each Extra has an `id`, `name`, and `price`. Identity is based on `extra.id`.

**See:** `003_DOMAIN_REFERENCE.md` (Extra)

### Extra Group

A selectable group of options attached to a Menu Item. Groups have a `type` field: `"size"` groups represent required variants; `"extras"` groups represent optional add-ons. Groups also define whether selection is required and the maximum number of selections.

**See:** `003_DOMAIN_REFERENCE.md` (Extra Group)

---

## I

### Identity

The stable, immutable property that uniquely identifies a business entity. Always an ID (`restaurantId`, `categoryId`, `menuItemId`, `extraId`). Names are presentation and may change — IDs should not.

**See:** ADR-002 in `004_ADR.md`, Rule 10 in `002_ENGINEERING_MANUAL.md`

---

## M

### Mapper

A function that transforms data from one layer to another. The primary mapper is `toSheetMeal()` in `lib/restaurant/mappers.ts`, which transforms a database `MenuItem` into a UI-friendly `SheetMeal` by splitting `extra_groups` into sizes and extras.

**See:** `001_PROJECT_ARCHITECTURE.md` (Data Flow), `006_PROJECT_MAP.md`

### Meal Configuration

The state and logic for configuring a meal: selecting a variant (size), choosing optional extras, setting quantity, adding notes, and calculating the final price. Owned by the `useMealConfigurator` hook.

**See:** `005_PROJECT_STATUS.md` (Meal Configuration), `010_FEATURE_INDEX.md`

### Menu Item

A product that customers can order. A Menu Item owns its name, description, base price, image, availability, offers, and extra groups. It does NOT own UI state. Defined in `lib/restaurant/types.ts`.

**See:** `003_DOMAIN_REFERENCE.md` (Menu Item)

---

## O

### Optional Extra

An extra that the customer may choose but is not required. Belongs to an Extra Group with `required = false`.

**See:** `003_DOMAIN_REFERENCE.md` (Extra Group)

### Order

A completed purchase. Orders should be immutable whenever possible. Editing creates an OrderEditSession rather than mutating the order directly.

**See:** `003_DOMAIN_REFERENCE.md` (Order)

### OrderEditSession

Temporary editing state during admin order modification. Local, reversible, not persisted until Apply is executed. The single source of truth while editing. Defined locally in `app/admin/orders/page.tsx`.

**See:** ADR-001 in `004_ADR.md`, `003_DOMAIN_REFERENCE.md` (Order Edit Session)

### Order Item

One purchased meal within an Order. Persisted in the `order_items` table with columns: `id`, `order_id`, `menu_item_id`, `quantity`, `price_at_order`, `extras`, `notes`, `size_name`. Identity is based on `menu_item_id`; display uses `name`.

**See:** `003_DOMAIN_REFERENCE.md` (Order Item)

---

## P

### Pricing

The system for calculating what a customer pays. Includes base price, offer price, effective price, active price (for sized items), and totals. Single source of truth in `lib/pricing.ts`.

**See:** `006_PROJECT_MAP.md` (lib/), `010_FEATURE_INDEX.md`

---

## R

### Required Variant

A mandatory selection within a `type = "size"` Extra Group. The customer must choose one option (e.g., Large or Small). The selected variant's name is persisted as `size_name` in `order_items`.

**See:** `003_DOMAIN_REFERENCE.md` (Extra Group), ADR-008 in `004_ADR.md`

### Restaurant

A business entity representing a restaurant. Owns identity, basic information, availability, and categories of menu items.

**See:** `003_DOMAIN_REFERENCE.md` (Restaurant)

---

## S

### Shared Component

A UI component in `components/shared/` that is used by multiple applications. Shared components are application-agnostic: they receive data and callbacks from parents and never use feature flags like `isAdmin` or `isCustomer`.

**See:** ADR-004 in `004_ADR.md`, `001_PROJECT_ARCHITECTURE.md`

### Single Source of Truth

The principle that every business rule should exist in exactly one place. Pricing in `lib/pricing.ts`. Types in `lib/restaurant/types.ts`. Mappers in `lib/restaurant/mappers.ts`. Never duplicate business logic.

**See:** Rule 7 in `002_ENGINEERING_MANUAL.md`

---

## T

### Theme

The visual styling context for UI components. Customer uses a light theme (defined in `:root` CSS variables). Admin uses a dark theme (defined via inline style overrides). Shared components adapt through CSS variables.

**See:** ADR-005 in `004_ADR.md`, `009_CODING_STANDARDS.md`

---

## U

### useMealConfigurator

The shared hook in `hooks/useMealConfigurator.ts` that manages meal configuration state: quantity, variant selection, extras selection, notes, and all price calculations (`activePrice`, `effectivePrice`, `displayPrice`, `total`). Application-agnostic — used by both Customer and Admin.

**See:** `005_PROJECT_STATUS.md` (Meal Configuration), `010_FEATURE_INDEX.md`

---

## Quick Reference

| Term | Category | Location |
|---|---|---|
| Atomic Save | Pattern | `supabase/migrations/20260705_atomic_order_edit.sql` |
| Business Logic | Layer | `lib/` |
| Cart Item | Domain | `lib/cart.ts` |
| Category | Domain | `lib/restaurant/types.ts` |
| Composition | Pattern | Shared component props |
| CSS Variables | Pattern | `app/globals.css`, inline styles |
| Extra | Domain | `lib/restaurant/types.ts` |
| Extra Group | Domain | `lib/restaurant/types.ts` |
| Identity | Principle | IDs, not names |
| Mapper | Layer | `lib/restaurant/mappers.ts` |
| Meal Configuration | Hook | `hooks/useMealConfigurator.ts` |
| Menu Item | Domain | `lib/restaurant/types.ts` |
| Optional Extra | Concept | Extra Group with `required = false` |
| Order | Domain | Database `orders` table |
| OrderEditSession | Pattern | Local state in `app/admin/orders/page.tsx` |
| Order Item | Domain | Database `order_items` table |
| Pricing | Logic | `lib/pricing.ts` |
| Required Variant | Concept | Extra Group with `type = "size"` |
| Restaurant | Domain | Database `restaurants` table |
| Shared Component | UI | `components/shared/` |
| Theme | Pattern | CSS variables |
| useMealConfigurator | Hook | `hooks/useMealConfigurator.ts` |

---

## AI Acknowledgement

✓ I understand the terminology used in this project.

✓ I will use these terms consistently in code and documentation.

✓ I will consult this document when I encounter an unfamiliar term.

✓ I will update this document when new terms are introduced.
