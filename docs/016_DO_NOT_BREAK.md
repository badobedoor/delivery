# Do Not Break

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document lists every architectural invariant that must be preserved.

These are not suggestions.

These are rules that should almost never be changed.

If you believe an invariant must change, you must:

1. Read the relevant ADR first.
2. Understand why the decision was made.
3. Provide evidence that the original reason is no longer valid.
4. Create a new ADR proposing the change.
5. Discuss before implementing.

Modifying any invariant without following this process risks breaking the entire architecture.

---

## Invariants

---

### 1. Shared Restaurant Experience

**Invariant:** Customer and Admin share the same restaurant browsing components.

**Why it exists:**
Admin originally planned a separate mini-menu. This would have duplicated categories, meal cards, configuration UI, and pricing logic across two codebases. The shared experience prevents this duplication.

**What would break if changed:**
- Two parallel menu implementations to maintain.
- Categories, meal cards, configuration, and pricing would diverge over time.
- Bug fixes would need to be applied twice.

**ADR:** ADR-003

**Risk if broken:** HIGH — Duplication would compound with every feature added.

---

### 2. Single Source of Truth for Pricing

**Invariant:** All pricing logic lives in `lib/pricing.ts`.

**Why it exists:**
Pricing is complex (base prices, offers, effective prices, discounts). If pricing logic is scattered across components, calculations become inconsistent and bugs become hard to find.

**What would break if changed:**
- Different components would compute prices differently.
- Offer logic would be duplicated and drift apart.
- A pricing bug would need to be fixed in multiple places.

**ADR:** Not explicitly documented in a single ADR, but rooted in Rule 7 (Single Source of Truth) of the Engineering Manual.

**Risk if broken:** HIGH — Financial inconsistencies.

---

### 3. IDs over Names for Identity

**Invariant:** Business identity is always based on immutable IDs, not names.

**Why it exists:**
Names change. Translations change. Display formatting changes. IDs do not. Using names as identifiers creates fragile relationships that break when a name is updated.

**What would break if changed:**
- Database relationships would become unreliable.
- Historical orders would lose their meal identity when a menu item is renamed.
- Cross-referencing between systems would fail.

**ADR:** ADR-002

**Risk if broken:** CRITICAL — Data integrity failure.

---

### 4. OrderEditSession for Editing

**Invariant:** Order editing uses a temporary editing session, not direct database mutation.

**Why it exists:**
Direct database mutation during editing risks partial updates, inconsistent state, and unrecoverable changes. The editing session provides reversibility and a clear before/after comparison.

**What would break if changed:**
- Orders could be left in inconsistent states if editing is interrupted.
- No way to cancel and revert to the original order.
- No clear source of truth during editing.

**ADR:** ADR-001

**Risk if broken:** HIGH — Data corruption risk.

---

### 5. Atomic Save for Order Editing

**Invariant:** Order editing persistence uses a single SQL function wrapping delete, insert, and update in one transaction.

**Why it exists:**
Three separate REST requests (delete old items, insert new items, update totals) risk partial failure. If one request fails after another succeeds, the order is corrupted.

**What would break if changed:**
- Orders could lose all items if delete succeeds but insert fails.
- Order totals could become inconsistent with items.
- Manual recovery would be required for every partial failure.

**ADR:** ADR-006

**Risk if broken:** CRITICAL — Unrecoverable data loss.

---

### 6. Composition over Feature Flags

**Invariant:** Shared components use composition (props, callbacks, slots) instead of boolean feature flags (`isAdmin`, `isCustomer`, `editable`).

**Why it exists:**
Feature flags couple shared components to specific applications. Every new application or variant requires a new flag. The component's API grows indefinitely, and the component becomes harder to reason about.

**What would break if changed:**
- Components would need modification for every new consumer.
- A shared component with 5 flags would have 32 possible states — impossible to test.
- The component would need to know about all applications, violating separation of concerns.

**ADR:** ADR-004

**Risk if broken:** MEDIUM — Maintainability degradation.

---

### 7. CSS Variable Theming

**Invariant:** Shared components use CSS variables (`var(--color-...)`) for colors. Theme is provided by the parent container, not the component.

**Why it exists:**
Customer applications use a light theme; admin applications use a dark theme. Without CSS variables, shared components would need to be duplicated or feature-flagged for each theme.

**What would break if changed:**
- Duplicated components for each theme (maintenance burden).
- Feature flags on components to switch themes (coupling).
- Hardcoded colors would need to be updated in every component when a color changes.

**ADR:** ADR-005

**Risk if broken:** MEDIUM — Visual inconsistency, maintenance burden.

---

### 8. Business Logic outside UI

**Invariant:** Business rules (pricing, validation, calculations) live in `lib/`. Components and hooks consume but do not own business logic.

**Why it exists:**
When business logic is embedded in UI components, it cannot be reused. It becomes coupled to a specific rendering context and is hard to test independently.

**What would break if changed:**
- Business rules would be scattered across components.
- The same calculation would be implemented differently in different places.
- Unit testing business logic would require rendering components.

**ADR:** Rooted in Rule 7 (Single Source of Truth) and the architectural layers in `001_PROJECT_ARCHITECTURE.md`.

**Risk if broken:** HIGH — Duplication and inconsistency.

---

### 9. Investigation before Implementation

**Invariant:** Before writing code, investigate the existing codebase. Never assume something does not exist.

**Why it exists:**
The fastest way to introduce bugs is to build something that already exists, or to change something without understanding what it does. Investigation prevents duplicated effort and unintended consequences.

**What would break if changed:**
- Features would be rebuilt unnecessarily.
- Existing code would be broken by uninformed changes.
- The architecture would degrade as parallel implementations accumulate.

**ADR:** Rooted in the Golden Rule and the Development Workflow in `002_ENGINEERING_MANUAL.md`.

**Risk if broken:** HIGH — Architectural degradation.

---

### 10. One Behavior Per Sprint

**Invariant:** Every sprint introduces exactly one behavior. One sprint = one commit = one push.

**Why it exists:**
Multiple behaviors in one sprint make changes hard to review, hard to test, hard to revert, and hard to understand. Single-behavior sprints keep the project's evolution clean and reversible.

**What would break if changed:**
- Sprints would become hard to review.
- Reverting one behavior would require reverting others.
- Commit history would lose its narrative clarity.

**ADR:** Rooted in Rule 4 and Rule 5 in `002_ENGINEERING_MANUAL.md`.

**Risk if broken:** MEDIUM — Workflow degradation.

---

## Summary

| # | Invariant | Risk if Broken | ADR |
|---|---|---|---|
| 1 | Shared Restaurant Experience | HIGH | ADR-003 |
| 2 | Single Source of Truth for Pricing | HIGH | Rule 7 |
| 3 | IDs over Names | CRITICAL | ADR-002 |
| 4 | OrderEditSession | HIGH | ADR-001 |
| 5 | Atomic Save | CRITICAL | ADR-006 |
| 6 | Composition over Feature Flags | MEDIUM | ADR-004 |
| 7 | CSS Variable Theming | MEDIUM | ADR-005 |
| 8 | Business Logic outside UI | HIGH | Rule 7 |
| 9 | Investigation before Implementation | HIGH | Golden Rule |
| 10 | One Behavior Per Sprint | MEDIUM | Rule 4, Rule 5 |

---

## Process for Changing an Invariant

If you believe an invariant must change:

1. **Read** the relevant ADR and related documentation.
2. **Understand** why the decision was made.
3. **Gather evidence** that the original reason is no longer valid.
4. **Create a new ADR** proposing the change with:
   - The current invariant
   - The proposed change
   - Why the original reasoning no longer holds
   - What will break
   - Mitigation plan
5. **Discuss** before implementing.
6. Only after discussion and agreement should any code change begin.

---

## Checklist Before Making Any Change

- [ ] Does this change affect any invariant listed above?
- [ ] Have I read the relevant ADR?
- [ ] Do I understand why the invariant exists?
- [ ] Is there a valid reason to change it?
- [ ] Have I discussed this with the team?
- [ ] Is there a new ADR documenting the change?

If you cannot answer YES to all questions — do not make the change.

---

## AI Acknowledgement

✓ I understand that these invariants preserve the project's architecture.

✓ I will not change any invariant without reading the relevant ADR first.

✓ I understand that changing an invariant without discussion risks breaking the entire system.

✓ I will follow the process for proposing invariant changes.

✓ I will treat CRITICAL-risk invariants with the highest care.
