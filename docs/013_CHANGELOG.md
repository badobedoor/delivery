# Engineering Changelog

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document records the major engineering milestones of the Hala Delivery project.

It is NOT a git log.

It explains what changed, why it mattered, and the engineering impact of each milestone.

Versions use semantic numbering to reflect architectural significance, not release cadence.

---

## Version History

---

### v0.1.0 — Initial Project Architecture

**What changed:**
- Established the multi-application ecosystem structure (Customer, Admin, Driver, Staff)
- Created shared business logic layer (`lib/`)
- Created shared UI component layer (`components/shared/`)
- Defined folder ownership rules

**Why it mattered:**
Without this foundation, each application would have evolved independently with duplicated logic and inconsistent architecture.

**Engineering impact:**
Set the precedent that all applications share business logic and domain models. Prevented the project from becoming a collection of unrelated apps.

**ADR:** ADR-003 (Shared Restaurant Experience), ADR-007 (Rule of Three)

---

### v0.2.0 — Shared Restaurant Experience

**What changed:**
- Extracted `MealCard` as a shared component
- Extracted `MealConfigPanel` as a shared configuration UI
- Customer and Admin now browse the same restaurant UI

**Why it mattered:**
Admin was originally going to build a separate mini-menu. This would have duplicated categories, meal cards, configuration, and pricing across two codebases.

**Engineering impact:**
One UI implementation serves multiple applications. Parents inject behavior through composition. No feature flags needed.

**ADR:** ADR-003 (Shared Restaurant Experience)

---

### v0.3.0 — Centralized Pricing

**What changed:**
- Created `lib/pricing.ts` as the single source of truth for pricing logic
- Offers, effective prices, and discount calculations centralized

**Why it mattered:**
Pricing logic was at risk of being scattered across components. Duplicated pricing would lead to inconsistent calculations and subtle bugs.

**Engineering impact:**
Any pricing change happens in one file. All applications automatically benefit.

**ADR:** ADR-007 (Rule of Three)

---

### v0.4.0 — Centralized Domain Types

**What changed:**
- Created `lib/restaurant/types.ts` with shared domain types
- Mapper (`lib/restaurant/mappers.ts`) transforms database models to UI models
- Pages no longer define their own business types

**Why it mattered:**
Business types were being redefined in multiple places, risking type drift and inconsistent field names.

**Engineering impact:**
One type definition. One mapper. Every application consumes the same business entities.

---

### v0.5.0 — Shared Meal Configuration

**What changed:**
- Created `useMealConfigurator` hook
- Hook owns: quantity, size selection, extras selection, notes, and all price calculations
- Customer and Admin share the same configuration logic

**Why it mattered:**
Meal configuration logic (quantity limits, variant selection rules, price calculation) was embedded in UI components. This made it impossible to reuse and hard to test.

**Engineering impact:**
Stateful behavior extracted from UI. Hook is application-agnostic. Both Customer and Admin use the same hook with different parent behaviors.

---

### v0.6.0 — CSS Variable Theme System

**What changed:**
- Shared components use `var(--color-...)` instead of hardcoded colors
- Customer provides light theme via `:root` defaults
- Admin provides dark theme via inline style overrides
- No duplicated components for different themes

**Why it mattered:**
The shared restaurant components were designed for the customer light theme. When rendered inside the admin dark theme, text was unreadable, requiring either duplicated components or feature flags.

**Engineering impact:**
One component implementation. Multiple themes. Theme belongs to the parent container, not the component.

**ADR:** ADR-005 (CSS Variable Theme)

---

### v0.7.0 — Order Editing V1

**What changed:**
- Enter Edit Mode (Sprint 1)
- Cancel Editing (Sprint 1)
- Formal `OrderEditSession` model (Sprint 2)
- Remove Item (Sprint 3)
- Edit Quantity (Sprint 4)
- Add Item via shared restaurant experience (Sprint 6)
- Persistence via Apply Changes button (Sprint 7)
- Atomic save via `apply_order_edit` SQL function (Sprint 7.1)

**Why it mattered:**
Customer service needed to modify orders before confirmation. Direct database mutation risked data corruption and lacked reversibility.

**Engineering impact:**
Reversible editing with clear before/after state. Local calculations. Clean separation between editing state and persisted data.

**ADR:** ADR-001 (OrderEditSession), ADR-006 (Atomic Save)

---

### v0.8.0 — Data Integrity Improvements

**What changed:**
- `menu_item_id` now preserved through entire edit flow (KB-001)
- `size_name` now preserved through entire edit flow (KB-002)
- Correct pricing for sized items (KB-003)
- `category_name` displayed inline in order cards and modals

**Why it mattered:**
Orders lost their original meal identity after editing. `menu_item_id` became NULL. Required variant information disappeared. Sized items showed price 0. These were data integrity failures.

**Engineering impact:**
Every field is now traced through the complete pipeline: database → query → mapper → session → persistence. No data is silently dropped.

**ADR:** ADR-009 (Data Integrity Preservation)

---

### v0.9.0 — Engineering Documentation

**What changed:**
- Created `docs/` folder with 17 engineering documents
- Architected the Project BRAIN as the permanent engineering reference
- Restructured `README.md`, `AGENTS.md`, `CLAUDE.md` as entry points

**Why it mattered:**
Engineering knowledge existed only in transcripts and memory. New contributors had no canonical reference. AI assistants produced inconsistent results.

**Engineering impact:**
The project now has a permanent, authoritative engineering reference. Every architectural decision, business rule, and lesson learned is documented. AI behavior is standardized.

---

### v0.10.0 — Dark Theme Compliance for Shared Components

**What changed:**
- `MealCard.tsx` hardcoded colors replaced with CSS variables
- `OrderItemAddPanel.tsx` provides dark theme overrides

**Why it mattered:**
The shared `MealCard` was unreadable inside the admin dark theme. Text and borders had insufficient contrast.

**Engineering impact:**
One component, two themes. No duplicates. No feature flags.

**ADR:** ADR-005 (CSS Variable Theme)

---

## How to Version

| Bump | When |
|---|---|
| Major (v1.x → v2.x) | Architectural change, breaking contract |
| Minor (v1.0 → v1.1) | New feature, new behavior |
| Patch (v1.0.0 → v1.0.1) | Bug fix, documentation, refactor |

---

## Checklist

- [ ] Does this change represent a new milestone?
- [ ] Should the version number increase?
- [ ] Have I explained what changed, why, and the impact?
- [ ] Did I reference relevant ADRs?

---

## AI Acknowledgement

✓ I understand this changelog records architectural milestones, not git commits.

✓ I will update it when significant engineering changes occur.

✓ I will reference ADRs and Knowledge Base entries when relevant.
