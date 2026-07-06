# Knowledge Base

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document records practical engineering knowledge gained while building the Hala Delivery project.

Unlike Architecture Decision Records (ADR), which explain WHY architectural decisions were made, the Knowledge Base documents lessons learned while diagnosing, debugging, and improving the system.

It exists so future contributors do not repeat the same investigations.

Every entry answers:
- What happened?
- How was it diagnosed?
- What was the real root cause?
- What was the lesson?

---

## KB-001 — Lost menu_item_id During Order Editing

### Problem

Orders lost their original meal identity after editing. The database eventually stored NULL inside `menu_item_id`.

### Symptoms

- WhatsApp messages lost meal identity.
- Driver workflow became unreliable.
- Database integrity was broken.

### Investigation Method

Traced the complete data flow:
```
Database → Query → Mapper → OrderEditSession → RPC → Database
```

The loss occurred at the **query** layer — `menu_item_id` was never selected from the database.

### Root Cause

The modal query in `app/admin/orders/page.tsx` never selected `menu_item_id` from the `order_items` table. The value disappeared before entering `OrderEditSession`. The persistence layer (`apply_order_edit` RPC) worked correctly — the source data was already missing.

### Lesson

Never investigate from the UI backwards. Always trace the complete data flow from database to display. Losses often occur at query or mapping layers, not persistence.

---

## KB-002 — Lost size_name During Editing

### Problem

Required variants (size_name) disappeared after editing an order.

### Root Cause

Same pattern as KB-001. The modal query never fetched `size_name` from the `order_items` table. The mapper discarded it. The edit session never received it.

### Lesson

When information disappears, check every transformation layer — not only the database. Query → Mapper → State → Persistence. The failure is almost never where you expect it.

---

## KB-003 — Price Became Zero for Sized Items

### Problem

Meals using required variants (sizes) displayed price 0 when added during order editing.

### Root Cause

`OrderItemAddPanel` (in `ConfigureMealView.handleAdd()`) hardcoded `price: 0` for sized items instead of using `config.activePrice` from `useMealConfigurator`. The pricing engine was correct — the wrong value entered the pipeline.

### Fix

Replaced `hasSizes ? 0 : config.effectivePrice` with `hasSizes ? config.activePrice : config.effectivePrice`.

### Lesson

Never replace an already computed business value. Reuse existing calculations from hooks and business logic layers.

---

## KB-004 — Atomic Persistence for Order Editing

### Original Design

Three independent REST requests:
1. DELETE old order_items
2. INSERT new order_items
3. UPDATE orders (totals)

### Problem

Partial failures could corrupt orders. If step 2 failed after step 1 succeeded, the order would lose all items.

### Final Solution

Single PostgreSQL function (`apply_order_edit`) wrapping all three operations in one transaction.

```sql
CREATE OR REPLACE FUNCTION apply_order_edit(...)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.order_items WHERE order_id = p_order_id;
    INSERT INTO public.order_items ...;
    UPDATE public.orders SET subtotal = ..., total = ... WHERE id = p_order_id;
END;
$$;
```

### Lesson

Critical persistence operations should always be atomic. Three HTTP calls → one RPC call. Database transactions guarantee consistency.

---

## KB-005 — Shared Restaurant Experience Decision

### Original Proposal

Build a separate mini-menu for the Admin order editing flow.

### Why It Was Rejected

A separate implementation would duplicate:
- Categories browsing
- Meal cards
- Meal configuration (sizes, extras, quantity, notes)
- Pricing presentation

### Final Solution

Extracted shared restaurant components (`MealCard`, `MealConfigPanel`). Customer injects cart behavior. Admin injects order editing behavior.

### Lesson

Reuse behavior. Never duplicate UI. Composition solves the problem without feature flags.

---

## KB-006 — Theme Support for Shared Components

### Problem

Shared components were designed for the customer light theme. When rendered inside the admin dark theme, text was unreadable.

### Solution

Replaced hardcoded colors in `MealCard.tsx` with CSS variables (`var(--color-secondary)`, `var(--color-muted)`, `var(--color-primary)`, `var(--color-border)`). Admin container (`OrderItemAddPanel`) provides dark theme overrides via inline styles.

### Lesson

Theme belongs to the parent container, not the component. CSS variables allow one component implementation to work in multiple themes without duplication or feature flags.

---

## KB-007 — Schema Assumption Bug

### Problem

The `apply_order_edit` SQL function referenced a `name` column on `order_items` that does not exist in the actual database schema.

### Root Cause

The function was written based on assumed schema rather than verified schema. The real `order_items` table has columns: `id`, `order_id`, `menu_item_id`, `quantity`, `price_at_order`, `extras`, `notes`, `size_name`.

### Lesson

Never assume the database schema. Always verify against the actual table definition. Schema assumptions are a common source of bugs.

---

## Knowledge Base Rules

1. Every difficult investigation should become a KB entry.
2. Future engineers should learn from previous investigations rather than repeating them.
3. Knowledge should never depend on memory — document it.

---

## How to Add an Entry

When you discover a lesson worth preserving:

1. Assign the next KB number.
2. Write: Problem, Symptoms, Investigation Method, Root Cause, Lesson.
3. Keep it specific to this project.
4. Cross-reference relevant ADRs or code files.

---

## Checklist

- [ ] Have I searched the Knowledge Base for related issues before starting a new investigation?
- [ ] Did I learn something during this investigation that should be documented?

---

## AI Acknowledgement

✓ I understand that the Knowledge Base exists to prevent repeated investigations.

✓ I will search the Knowledge Base before starting a new investigation.

✓ I will contribute new entries when I learn something valuable.

✓ I will follow the complete data flow when debugging — never jump to conclusions.
