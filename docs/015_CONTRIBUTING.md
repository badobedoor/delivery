# Contributing Guide

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document explains how to contribute to the Hala Delivery project.

It covers the mandatory workflow for every change — whether you are a human developer or an AI assistant.

If you have not read the foundational documents, stop and read them first.

---

## Required Reading (in order)

Before writing any code, read these documents:

1. `000_START_HERE_FIRST.md` — Project overview and documentation index
2. `001_PROJECT_ARCHITECTURE.md` — Architecture, layers, ownership, shared component philosophy
3. `002_ENGINEERING_MANUAL.md` — 10 engineering rules, development workflow, sprint rules
4. `003_DOMAIN_REFERENCE.md` — Business entities, identity rules, data integrity

If you are an AI assistant, also read:

5. `007_AI_PROTOCOL.md` — AI operating procedure

---

## How to Start

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run dev`.
4. Read the required documentation above.
5. Read the relevant sections of `docs/` for the area you are working on.

---

## Branch Strategy

- The main branch is `main`.
- Feature branches use the prefix `feature/`.
- Branch names should describe the behavior being implemented, not the implementation details.

**Examples:**
- `feature/order-edit-cancel`
- `feature/admin-add-item`
- `feature/hydration-error-fix`

**Rules:**
- Never commit directly to `main`.
- Always create a branch from `main`.
- Keep branches short-lived (one sprint = one branch).

---

## Sprint Strategy

Every feature must be split into the smallest independently testable behaviors.

Each sprint introduces exactly **one** behavior.

**Example — Order Editing:**
```
Sprint 1: Enter Edit Mode
Sprint 2: Cancel Editing
Sprint 3: Remove Item
Sprint 4: Edit Quantity
Sprint 5: Add Item
Sprint 6: Save (persistence)
```

**Rules:**
- One behavior per sprint.
- One commit per sprint.
- One push per sprint.
- Each sprint must be independently reversible.
- Never combine bug fixes with new features.
- Never refactor while adding features.

---

## Commit Strategy

- Every sprint gets its own commit.
- Commit messages follow conventional commits format:

```
type(scope): description
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, documentation, refactoring
- `docs` — documentation only
- `perf` — performance improvement

**Examples:**
```
feat(order-edit): add enter edit mode
fix(order-edit): preserve menu_item_id through editing
chore(order-edit): polish editing workflow and validation
docs: create engineering documentation
```

**Rules:**
- Commit messages should describe the behavior, not the implementation.
- Do not combine unrelated behaviors in one commit.
- If a commit reverts a previous change, say so in the message.

---

## Implementation Workflow

Follow these steps for every sprint:

### Step 1 — Understand

Understand the requested behavior. What problem is being solved? Who uses it? What business rule is involved?

### Step 2 — Investigate

Search the existing project. Identify existing components, hooks, helpers, business logic, and data flow. Never assume something does not exist.

### Step 3 — Architecture

Determine where the behavior belongs. Identify ownership, data flow, reusable components, and database impact. Do not implement until architecture is clear.

### Step 4 — Implement

Modify only the files required for this sprint. Preserve architecture. Reuse existing code. Avoid unrelated changes.

### Step 5 — Manual Test

Verify existing behavior still works. Verify new behavior works. Check for regressions.

### Step 6 — Architecture Review

Review the implementation:
- Is business logic duplicated?
- Is UI duplicated?
- Was the correct abstraction used?
- Can this be simplified?

### Step 7 — Commit

One commit per sprint. Write a clear commit message.

### Step 8 — Push

Push only after testing and review.

---

## Investigation Before Implementation

If you encounter a bug or unexpected behavior:

1. **Do NOT implement a fix immediately.**
2. Trace the complete data flow from source to destination.
3. Identify the layer where the behavior diverges from expected.
4. Report your findings before writing any code.

This applies to both human developers and AI assistants.

**See:** `007_AI_PROTOCOL.md` (Investigation Reports), `008_KNOWLEDGE_BASE.md` (past investigations)

---

## Manual Testing

Before pushing, verify:

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] New feature works as expected
- [ ] Existing features still work (no regressions)
- [ ] Data integrity is preserved (identifiers, field values)
- [ ] Customer behavior is unchanged (unless customer feature was explicitly requested)

Do not skip manual testing. Do not rely solely on compilation.

---

## Architecture Review

After implementing, review:

- **Duplication:** Is any business logic, UI, or type duplicated?
- **Ownership:** Does the code belong in the layer where it was placed?
- **Abstraction:** Is the abstraction appropriate? Is it premature?
- **Simplicity:** Can this be simplified without losing correctness?
- **Reversibility:** Can this sprint be reverted independently?

If any answer is concerning, discuss before merging.

---

## ADR Updates

A new ADR is required when:

- A significant architectural decision is made.
- An existing decision is reversed or modified.
- A new pattern is introduced that affects multiple applications.

**Do not** create an ADR for:
- Bug fixes.
- Minor implementation details.
- Features that follow existing patterns.

**See:** `004_ADR.md` for existing ADRs and format.

---

## Knowledge Base Updates

A new KB entry is required when:

- A difficult investigation reveals a root cause worth documenting.
- A debugging technique proves valuable for future contributors.
- A mistake was made that others should learn from.

**See:** `008_KNOWLEDGE_BASE.md` for existing entries and format.

---

## Documentation Updates

Update the relevant documentation when:

- A new feature is added (update `010_FEATURE_INDEX.md`, `005_PROJECT_STATUS.md`).
- A term is introduced (update `014_TERMINOLOGY.md`).
- An architectural decision is made (update `004_ADR.md`).
- A lesson is learned (update `008_KNOWLEDGE_BASE.md`).
- A milestone is completed (update `013_CHANGELOG.md`).

Documentation is part of the sprint. Include it in the commit.

---

## What Not to Do

Never:
- Commit directly to `main`.
- Implement before investigating.
- Combine multiple behaviors in one sprint.
- Refactor while adding features.
- Duplicate business logic.
- Add feature flags to shared components.
- Hardcode colors in shared components.
- Assume database schema — verify it.
- Skip manual testing.
- Skip architecture review.

---

## Checklist Before Starting

- [ ] I read the required documentation.
- [ ] I understand the architecture.
- [ ] I investigated existing code.
- [ ] I know which files will change and why.
- [ ] This sprint introduces exactly one behavior.
- [ ] This sprint is reversible.
- [ ] I will update relevant documentation.

---

## AI Acknowledgement

✓ I understand the contributing workflow.

✓ I will follow the branch, sprint, and commit strategy.

✓ I will investigate before implementing.

✓ I will test manually before pushing.

✓ I will update documentation as part of every sprint.

✓ I will not combine unrelated behaviors.
