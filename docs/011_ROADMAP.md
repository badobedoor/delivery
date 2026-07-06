# Roadmap

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document describes the future direction of the Hala Delivery project.

It is not a commitment.

It is a living document that reflects current thinking about what comes next.

Priorities may change as the project evolves.

---

## Guiding Principles

1. **Architecture before features.** New features must fit within the existing architecture. If they don't, discuss an ADR first.
2. **One behavior per sprint.** No multi-behavior sprints.
3. **Reuse before build.** Always check if the feature can be composed from existing pieces.
4. **Data integrity.** Data quality is more important than UI convenience.

---

## Completed Milestones

### V1 — Order Editing (Complete)

- ✅ Enter Edit Mode
- ✅ Cancel Editing
- ✅ Remove Item
- ✅ Edit Quantity
- ✅ Add Item (shared restaurant experience)
- ✅ Atomic Save
- ✅ Data integrity (menu_item_id, size_name preservation)
- ✅ Category display
- ✅ Dark theme support
- ✅ Sized item price fix

### Foundation Systems (Complete)

- ✅ Shared restaurant experience (Customer + Admin)
- ✅ `useMealConfigurator` hook
- ✅ CSS variable theming
- ✅ Atomic database functions
- ✅ Shared domain types and mappers

---

## Near-Term (No Specific Order)

These are features that have been discussed or are naturally next steps.

### 1. Staff Dashboard — Order Viewing

**Goal:** Allow staff to view incoming orders.

**Why:** Currently only Admin can see orders. Staff needs read-only access.

**Considerations:**
- Reuse existing `OrderEditSession` or order display components.
- Staff should not be able to edit — only view.
- Read-only mode for shared components may need a new pattern.

### 2. Driver Dashboard — Assigned Orders

**Goal:** Allow drivers to see their assigned orders and update delivery status.

**Why:** Driver app exists but order assignment flow is not complete.

**Considerations:**
- Should reuse order display components.
- Status update should be simple and atomic.
- May need real-time updates (WebSocket/Supabase Realtime).

### 3. Order Status Management

**Goal:** Allow Admin to update order status (confirmed, preparing, ready, delivered, cancelled).

**Why:** Currently status is set at creation but not managed afterward.

**Considerations:**
- Simple status transitions with validation.
- No complex state machine needed initially.
- Atomic status update function.

### 4. Menu Management (Admin)

**Goal:** Allow Admin to manage restaurant menus (add/edit/remove items, categories, prices).

**Why:** Currently menu changes require direct database access.

**Considerations:**
- Reuse existing restaurant types and mappers.
- Separate from order management — different ownership.
- Consider whether this is Admin or Staff responsibility.

### 5. Multi-Restaurant Support

**Goal:** Allow customers to browse multiple restaurants.

**Why:** Currently the customer app appears to work with one restaurant context.

**Considerations:**
- Would affect restaurant browsing, cart, and checkout.
- Cart conflict detection already exists.
- May require cart redesign for multi-restaurant orders.

---

## Medium-Term

### 6. Real-Time Order Updates

**Goal:** Live order status updates via WebSocket/Supabase Realtime for all applications.

**Why:** Reduces polling, improves UX.

### 7. Order History and Search

**Goal:** Allow Admin to search and filter orders by date, status, restaurant, customer.

### 8. Analytics Dashboard

**Goal:** Basic business metrics (orders per day, revenue, popular items).

---

## Long-Term

### 9. Full Multi-Application Polish

**Goal:** All four applications (Customer, Admin, Staff, Driver) fully functional and polished.

### 10. Notification System

**Goal:** Push notifications for order status changes across all applications.

### 11. Internationalization (i18n)

**Goal:** Full Arabic/English support.

---

## What Will NOT Be Built

These are intentionally excluded:

- **Separate Admin restaurant menu.** Already rejected (ADR-003). Admin reuses the shared restaurant experience.
- **Direct database mutations for editing.** Already rejected (ADR-001). Editing uses OrderEditSession.
- **Feature flags in shared components.** Already rejected (ADR-004). Composition is the solution.
- **Duplicate themed components.** Already rejected (ADR-005). CSS variables handle theming.

---

## Roadmap Process

1. Each new feature should be proposed as a sprint plan.
2. Review the architecture and existing code first.
3. If the feature conflicts with an ADR, discuss before implementing.
4. Each sprint = one behavior = one commit = one push.
5. Update this roadmap when priorities change.

---

## Checklist

- [ ] Does this feature fit the existing architecture?
- [ ] Have I checked the ADRs for relevant decisions?
- [ ] Can this feature be built from existing pieces?
- [ ] Have I split it into one-behavior sprints?
- [ ] Is this something we actually want to build?

---

## AI Acknowledgement

✓ I understand this roadmap is a living document.

✓ I understand that priorities may change.

✓ I will not build features without discussing them first.

✓ I will respect the existing architecture when planning new work.

✓ I will update this document as the project evolves.
