# Engineering Manual

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document defines the engineering philosophy, development workflow, and mandatory rules for every feature built inside the Hala Delivery ecosystem.

These are not recommendations.

These are engineering rules.

Every implementation must follow these principles.

---

## Core Philosophy

Software engineering is not writing code.

Software engineering is understanding a system well enough to make the smallest correct change.

Understanding is always more valuable than coding.

The quality of a feature is determined long before the first line of code is written.

---

## The 10 Engineering Rules

### Rule 1 — Diagnose Before Modifying

Never begin implementation immediately. Investigate first.

Understand:
- Existing architecture
- Existing business logic
- Existing shared components
- Existing helpers, hooks, and data flow
- Existing database design

Never assume. Always verify.

### Rule 2 — Architecture Before Code

Every implementation must be the result of an architectural decision.

First determine where the feature belongs. Identify ownership, responsibilities, existing abstractions, and data flow. Only then begin implementation.

### Rule 3 — Reuse Before Rewrite

Always search for existing implementations before creating new ones.

Prefer reuse instead of rewrite.

Never duplicate:
- Business logic
- Pricing logic
- Database logic
- Validation logic
- Search logic
- UI behavior

### Rule 4 — One Behavior Per Sprint

Never implement multiple behaviors together.

Split every feature into the smallest independently testable behavior.

Example — Order Editing:
```
Enter Edit Mode → Remove Item → Edit Quantity → Add Item → Save
```
Each sprint introduces exactly one new behavior.

### Rule 5 — Small, Reversible Changes

Every sprint must be:
- Small
- Testable
- Reviewable
- Reversible
- Independently deployable

If a sprint cannot be reverted independently, it is too large.

### Rule 6 — Preserve Existing Architecture

New code must respect existing architectural decisions.

Do not:
- Create parallel implementations
- Bypass existing layers
- Move business logic into UI
- Duplicate data flow

Preserve the architecture.

### Rule 7 — Single Source of Truth

Every business rule must exist in exactly one place.

Examples:
- Pricing → `lib/pricing.ts`
- Restaurant mapping → `lib/restaurant/mappers.ts`
- Restaurant types → `lib/restaurant/types.ts`

Never implement the same rule twice.

### Rule 8 — Rule of Three

Do not create abstractions too early.

Extract shared code only after it has demonstrated real reuse across multiple consumers.

Avoid premature abstraction. Prefer simple code over unnecessary architecture.

### Rule 9 — UX Before Code

Before implementing complex functionality, design the workflow first. Understand the user experience. Then design the architecture. Only after both are complete should implementation begin.

### Rule 10 — Preserve Data Integrity

Data is more important than UI.

- Never lose identifiers.
- Prefer IDs over names.
- Persist stable identifiers.
- Display names.
- Identity must always be based on immutable values.

---

## Development Workflow

Every feature follows exactly the same 10-step sequence:

```
1. Understand  →  2. Investigate  →  3. Discuss  →  4. Architecture
5. Sprint Planning  →  6. Implementation  →  7. Manual Testing
8. Architecture Review  →  9. Commit  →  10. Push
```

**Never change this order.**

### Step 1 — Understand

Determine:
- What problem is being solved?
- Who will use this feature?
- What business rule is involved?
- What data is required?
- Which applications are affected?

### Step 2 — Investigate

Search the existing project for:
- Existing components, hooks, helpers, business logic
- Existing data flow and database structures
- Existing implementations that can be reused

Never assume the project is missing something.

### Step 3 — Discuss

Before implementation, discuss the architecture:
- Where should this behavior live?
- Who owns this responsibility?
- Can existing code be reused?
- Is this really a new behavior?
- Does this affect other applications?

### Step 4 — Architecture

Design the implementation:
- Ownership
- Data flow
- Reusable components
- Shared business logic
- Database impact
- UI impact

### Step 5 — Sprint Planning

Split the work into the smallest possible behaviors.

Each sprint = one capability = one commit.

### Step 6 — Implementation

Rules:
- Modify only the files required for that sprint.
- Preserve architecture.
- Reuse existing code.
- Avoid unrelated modifications.
- Keep changes small and reversible.

### Step 7 — Manual Testing

Verify:
- Existing behavior still works.
- New behavior works.
- No regressions exist.

Never skip manual testing.

### Step 8 — Architecture Review

After testing, review:
- Is business logic duplicated?
- Is UI duplicated?
- Was the correct abstraction used?
- Was the smallest possible change made?
- Is another sprint required?

### Step 9 — Commit

Every sprint receives its own commit. Never combine unrelated behaviors into one commit. Commit history should describe the evolution of the architecture.

### Step 10 — Push

Push only after manual testing, architecture review, and a clean commit.

---

## Sprint Rules

Every sprint must satisfy all of the following:

- ✓ One behavior
- ✓ One review
- ✓ One commit
- ✓ One push
- ✓ Independently reversible

---

## Anti-Patterns

Never:
- Implement first, investigate later.
- Refactor while adding features.
- Mix bug fixes with new functionality.
- Combine multiple behaviors into one sprint.
- Rewrite unrelated files.
- Skip investigation, manual testing, or architecture review.
- Create feature-specific hacks when composition solves the problem.

---

## Common Mistakes

Do not:
- Assume database schema.
- Assume business rules.
- Assume existing code is wrong.
- Duplicate helpers, components, or queries.
- Add flags when composition solves the problem.
- Extract abstractions prematurely.

---

## Engineering Checklist

Before implementing anything, verify:

- [ ] I investigated first.
- [ ] I understand the architecture.
- [ ] I found reusable code.
- [ ] I understand the data flow.
- [ ] I know who owns this behavior.
- [ ] I am changing the minimum number of files.
- [ ] My implementation is reversible.
- [ ] I am not duplicating business logic.
- [ ] Customer behavior remains unchanged unless explicitly requested.

If any answer is NO — Stop. Investigate first.

---

## AI Acknowledgement

✓ I understand the purpose of these rules.

✓ I understand why they exist.

✓ I will follow these engineering principles.

✓ I will investigate before implementing.

✓ I will preserve the architecture.

✓ I will reuse existing implementations whenever possible.
