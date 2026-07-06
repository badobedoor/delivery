# Coding Standards

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document defines the coding standards and conventions used throughout the Hala Delivery project.

Consistency is more important than personal preference.

Every contributor — human or AI — should produce code that looks like it was written by the same person.

---

## TypeScript

### Use TypeScript Strict Mode

The project uses TypeScript. Leverage the type system.

- Prefer `interface` over `type` for object shapes.
- Use `type` for unions, intersections, and primitive aliases.
- Avoid `any`. Use `unknown` when the type is truly unknown.
- Use `as const` for literal types.
- Use `satisfies` for structural type validation.

### Naming Conventions

| Concept | Convention | Example |
|---|---|---|
| Interfaces | PascalCase | `OrderEditSession` |
| Types | PascalCase | `SheetMeal` |
| Functions | camelCase | `handleApplyEdit` |
| Variables | camelCase | `editingSession` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUANTITY` |
| React components | PascalCase | `MealCard` |
| Files | camelCase | `useMealConfigurator.ts` |
| Database columns | snake_case | `menu_item_id` |

### Type Imports

Use `import type` for type-only imports:

```ts
import type { MenuItem, Category } from "@/lib/restaurant/types";
```

---

## React

### Component Structure

```tsx
"use client";

import { useState } from "react";

/* ── Props ── */

interface Props {
  name: string;
  onClick?: () => void;
}

/* ── Component ── */

export default function MyComponent({ name, onClick }: Props) {
  return (
    // JSX here
  );
}
```

### Rules

- Use `"use client"` at the top of client components.
- Define `Props` interface above the component.
- Use default exports for components.
- Destructure props in the function signature.
- Keep components focused — one responsibility per component.

### Hooks

- Custom hooks start with `use`.
- Hooks should not know which application consumes them.
- Hooks own state, not rendering.

```ts
// Good
export function useMealConfigurator(meal: SheetMeal) {
  // state and logic, no rendering
}

// Bad — hook should not return JSX
export function useMealConfigurator(meal: SheetMeal) {
  return <div>...</div>;
}
```

### Event Handlers

Prefix with `handle`:

```ts
function handleAddItem() { ... }
function handleApplyEdit() { ... }
function handleClose() { ... }
```

---

## CSS and Theming

### Use CSS Variables

Shared components must use CSS variables for colors:

```tsx
/* Good */
<p style={{ color: "var(--color-secondary)" }}>{name}</p>
<p style={{ color: "var(--color-muted)" }}>{description}</p>

/* Avoid hardcoded colors in shared components */
<p style={{ color: "#1A1A1A" }}>{name}</p>  /* Bad */
```

### Theme Variables

| Variable | Purpose | Light (Customer) | Dark (Admin) |
|---|---|---|---|
| `--color-primary` | Primary accent (price, actions) | `#F97316` | `#F97316` |
| `--color-secondary` | Text, headings | `#1E293B` | `#F1F5F9` |
| `--color-surface` | Background | `#F8FAFC` | `#0F172A` |
| `--color-border` | Borders, dividers | `#E2E8F0` | `#334155` |
| `--color-muted` | Secondary text, metadata | `#94A3B8` | `#94A3B8` |

Light theme defaults are set in `app/globals.css`. Dark theme overrides are applied via inline styles on the admin container.

### Utility Classes

Prefer Tailwind utility classes for layout (flex, grid, spacing).

Use inline `style` for dynamic values or CSS variable references.

---

## File Organization

### File Naming

| Pattern | Example |
|---|---|
| React components | PascalCase filenames: `MealCard.tsx` |
| Hooks | camelCase with `use` prefix: `useMealConfigurator.ts` |
| Business logic | camelCase: `pricing.ts`, `mappers.ts` |
| Pages | Next.js file-based routing: `page.tsx` |

### Max Line Length

Prefer 80-100 characters per line for readability.

### Exports

Use default exports for components and page-level functions.

Use named exports for utilities, types, and helpers.

---

## Imports Order

Group imports in this order:

1. React / Next.js
2. Third-party libraries
3. Internal modules (`@/lib`, `@/components`, `@/hooks`)
4. Relative imports

```ts
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toSheetMeal } from "@/lib/restaurant/mappers";
import MealCard from "@/components/shared/restaurant/MealCard";
```

---

## TypeScript Patterns

### Import Renaming for Disambiguation

When a local name conflicts with a shared type name, rename the import:

```ts
import { ItemExtra as Extra } from "@/lib/restaurant/types";
```

### Null Handling

- Use `??` (nullish coalescing) for default values.
- Use `?.` (optional chaining) for safe property access.
- Be explicit: distinguish between `null`, `undefined`, and empty string.

---

## Database Interaction

### SQL Functions

Critical operations should use SQL functions for atomicity:

```ts
const { error } = await supabase.rpc("apply_order_edit", {
  p_order_id: orderId,
  p_items: itemsPayload,
  p_subtotal: editedSubtotal,
  p_total: editedTotal,
  p_notes: notes,
});
```

### Queries

- Use Supabase JS SDK for standard queries.
- Never place raw SQL inside React components.
- Keep queries close to the component that needs them (co-location).

---

## Project-Specific Conventions

### Import Aliases

Use `@/` to reference the project root:

```ts
import { supabase } from "@/lib/supabase";
import { useMealConfigurator } from "@/hooks/useMealConfigurator";
```

### Type Extraction

Use existing types rather than creating new ones. If a type already exists in `lib/restaurant/types.ts`, import it. Don't redefine.

---

## Anti-Patterns

Never:
- Use `any` when the type is known.
- Duplicate type definitions.
- Hardcode colors in shared components.
- Place business logic inside components.
- Use feature flags (`isAdmin`, `isCustomer`) in shared components.
- Create parallel implementations when reuse is possible.

---

## Checklist

- [ ] Does this code follow the naming conventions?
- [ ] Are types properly defined (no `any`)?
- [ ] Are CSS variables used instead of hardcoded colors?
- [ ] Is business logic separated from UI?
- [ ] Are existing types imported rather than redefined?
- [ ] Is the component using composition over feature flags?

---

## AI Acknowledgement

✓ I understand the coding standards.

✓ I will follow naming conventions.

✓ I will use CSS variables for theming.

✓ I will separate business logic from UI.

✓ I will preserve consistency across the codebase.
