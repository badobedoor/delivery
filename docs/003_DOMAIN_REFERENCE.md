# Domain Reference

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document defines the business entities used throughout the Hala Delivery ecosystem.

These entities represent the business itself.

They are NOT UI models, page models, or API responses.

Every feature should be built around these domain models.

---

## Core Domain

```
Restaurant
    ↓
Category
    ↓
Menu Item (MenuItem)
    ↓
Extra Group (ExtraGroup)
    ↓
Extra (ItemExtra)
    ↓
Order
    ↓
Order Item (OrderItem)
    ↓
Cart Item (CartItem)
    ↓
Order Edit Session (OrderEditSession / OrderEditItem)
```

Everything else is derived from these concepts.

---

## Restaurant

Represents a restaurant in the system.

**Responsibilities:**
- Identity
- Basic information (name, location, etc.)
- Availability
- Categories of menu items

**Rules:**
- A Restaurant should never contain page-specific state.
- Identity is based on `id` — never on `name`.

---

## Category

Represents a logical grouping of menu items.

Examples: Sandwiches, Pizza, Drinks, Desserts.

**Identity:** `category.id`

**Rules:**
- Never use `category.name` as an identifier. Names may change; IDs should not.

---

## Menu Item

Represents a product that customers can order. Defined as `MenuItem` in `lib/restaurant/types.ts`.

**Owns:**
- `id` (stable identifier)
- `name` (display only)
- `description`
- `price` (base price)
- `image_url`
- `is_active`, `is_best_seller`
- `sort_order`
- `offer_price`, `offer_starts_at`, `offer_ends_at`, `offer_image_url`
- `category_id`
- `extra_groups` (array of ExtraGroup)

**Rules:**
- A Menu Item does NOT own UI state.
- Identity is always `menu_item_id`.

---

## Extra Group

Represents a selectable group of options. Defined as `ExtraGroup` in `lib/restaurant/types.ts`.

Examples: Bread type, Size, Sauce, Cheese.

**Properties:**
- `type` — indicates variant group (e.g. "size" or "extras")
- `required` — whether a selection is mandatory
- `max_select` — maximum number of selections allowed
- `item_extras` — available extras in this group

**Rules:**
- Groups with `type === "size"` represent required variant selection.
- Groups with `type === "extras"` represent optional add-ons.

---

## Extra

Represents one selectable option. Defined as `ItemExtra` in `lib/restaurant/types.ts`.

Examples: Large, Small, Balady Bread, Extra Cheese.

**Properties:**
- `id` (stable identifier)
- `name` (display)
- `price` (additional cost)

**Identity:** Always use `extra.id`.

---

## Cart Item

Represents a configured meal ready for checkout. Defined as `CartItem` in `lib/cart.ts`.

**A Cart Item is not the same as a Menu Item.**

- A Menu Item describes a product.
- A Cart Item describes a customer's configured selection.

**Contains:**
- `id` (menu_item_id)
- `name`
- `price`
- `qty`
- `image_url`
- `description`
- `size` — `{ name: string; price: number }` | undefined
- `extras` — `{ name: string; price: number }[]`
- `notes` — string | undefined

**Rules:**
- `size.price` is flattened into `price_at_order` during checkout persistence.
- `size.name` is persisted as `size_name` in the database.

---

## Order

Represents a completed purchase.

**Properties (from database):**
- `id` (UUID)
- `restaurant_id`
- `user_id`
- `subtotal`
- `total`
- `status`
- `notes`
- `created_at`

**Rules:**
- Orders should be immutable whenever possible.
- Editing creates an OrderEditSession rather than mutating the UI directly.

---

## Order Item

Represents one purchased meal in an order. Persisted in the `order_items` table.

**Database schema:**
```sql
order_items (
    id            UUID PRIMARY KEY,
    order_id      UUID REFERENCES orders(id),
    menu_item_id  UUID,
    quantity      INTEGER,
    price_at_order NUMERIC,
    extras        JSONB,
    notes         TEXT,
    size_name     TEXT
)
```

**Rules:**
- Identity is based on `menu_item_id`.
- Display uses `name` (fetched via join to `menu_items`).
- `size_name` preserves the variant name at time of order.
- `menu_item_id` must be preserved through editing sessions.

---

## Order Edit Session

Represents temporary editing state during admin order modification. Defined locally in `app/admin/orders/page.tsx`.

**Characteristics:**
- Local state (not persisted until Apply is executed)
- Reversible (can be cancelled entirely)
- Calculates totals locally (edited subtotal and edited total)
- Single source of truth while editing

**Contains:**
```ts
interface OrderEditSession {
    originalItems: OrderEditItem[];
    items: OrderEditItem[];
    editedSubtotal: number;
    editedTotal: number;
}

interface OrderEditItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    extras: { name: string; price: number }[];
    notes: string | null;
    size_name: string | null;
}
```

**Rules:**
- Never mutate persisted order data directly while editing.
- Persist only when the user clicks Apply.
- Atomic save via `apply_order_edit` SQL function.

---

## Identity Rules

Always prefer IDs over names.

| Concept | Use ID | Do NOT use |
|---|---|---|
| Restaurant | `restaurantId` | `restaurantName` |
| Category | `categoryId` | `categoryName` |
| Menu Item | `menuItemId` / `menu_item_id` | `mealName` |
| Extra | `extraId` | `extraName` |

Names are presentation. IDs are identity.

---

## Business Rules Location

| Rule | Owner |
|---|---|
| Pricing, offers, discounts | `lib/pricing.ts` |
| Meal selection, variant/extras config | `hooks/useMealConfigurator.ts` |
| Editing totals calculation | Local in `app/admin/orders/page.tsx` |
| Database-to-UI transformation | `lib/restaurant/mappers.ts` |
| Order persistence | `supabase/migrations/20260705_atomic_order_edit.sql` |

---

## Anti-Patterns

Never:
- Use names as identifiers.
- Store UI state inside business models.
- Duplicate domain models.
- Create page-specific business entities.
- Mutate persisted orders directly while editing.

---

## Checklist

- [ ] Does this represent a real business concept?
- [ ] Does a similar model already exist?
- [ ] Is this model UI-specific?
- [ ] Should this be a page model instead?
- [ ] Is identity based on IDs?
- [ ] Is the responsibility clear?

If any answer is unclear — Stop. Investigate first.

---

## AI Acknowledgement

✓ I understand the domain model.

✓ I understand the difference between business models and UI models.

✓ I will preserve stable identities.

✓ I will avoid creating duplicate business entities.

✓ I will build future features around these domain models.
