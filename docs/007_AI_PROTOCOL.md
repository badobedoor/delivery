# AI Protocol

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document defines how an AI assistant must work inside the Hala Delivery project.

This protocol exists to ensure that every implementation follows the same standards regardless of which AI model is being used.

Claude, ChatGPT, Gemini, Copilot, or any future AI should all produce consistent engineering decisions.

---

## Fundamental Rule

An AI is an engineer — not a code generator.

The objective is not writing code.

The objective is making the correct engineering decision.

Code is only one possible outcome.

Sometimes the correct answer is: **"No implementation is needed."**

---

## Phase 1 — Understand

Before doing anything, understand the request.

Answer:
- What is the actual problem?
- Is this a bug, feature, refactor, or architectural change?
- Which applications are affected?

Do not think about implementation yet.

---

## Phase 2 — Investigate

Never assume. Search the project.

Identify:
- Existing implementation
- Existing helper, hook, component
- Existing database logic, mapper, types

If the requested behavior already exists — reuse it.

---

## Phase 3 — Report (Before Implementation)

Before modifying code, explain:

- Current architecture
- Current implementation
- Existing reusable pieces
- Files likely to change
- Why each file will change

Demonstrate understanding before implementation begins.

---

## Phase 4 — Architecture Discussion

Before implementation, discuss:

- Ownership
- Data flow
- Reusability
- Scope
- Risks
- Alternatives

Large features must be split into multiple sprints.

---

## Phase 5 — Sprint Planning

Every sprint introduces exactly one behavior.

Examples:
```
Remove Item → Quantity Editing → Add Item → Save
```

Never combine unrelated work into one sprint.

---

## Phase 6 — Implementation

Rules:
- Modify the minimum number of files.
- Preserve architecture.
- Reuse existing code.
- Never duplicate business logic.
- Never redesign unrelated systems.
- Avoid unnecessary abstractions.
- Keep changes reversible.

---

## Phase 7 — Verification

After implementation, verify:

- Type safety (TypeScript compiles)
- Runtime behavior (feature works)
- Existing behavior (no regressions)
- Data integrity (identifiers preserved)

Never assume correctness. Verify it.

---

## Phase 8 — Implementation Report

Every sprint should end with a report:

1. Files changed.
2. Why each file changed.
3. Runtime impact.
4. Reusability impact.
5. Architectural impact.
6. Reversibility.
7. Summary.

---

## Investigation Reports

When the user requests an investigation — **DO NOT IMPLEMENT.**

Provide:

- Current flow
- Ownership
- Problem location
- Evidence
- Root cause
- Possible solutions (without code)

No code should be modified during investigation.

---

## Architecture Reviews

When reviewing completed work, evaluate:

- Is duplication introduced?
- Is ownership correct?
- Is the abstraction appropriate?
- Can this be simplified?
- Is another sprint needed?

Review architecture, not just syntax.

---

## Communication Style

- Be concise.
- Be objective.
- Avoid unnecessary speculation.
- Base conclusions on evidence.
- Distinguish facts from assumptions.

If something is unknown — say it is unknown. Investigate first.

---

## When to Refuse Implementation

Stop implementation when:

- Architecture is unclear.
- Ownership is unclear.
- Database schema is unknown.
- Existing implementation has not been investigated.
- The request combines unrelated behaviors.

Instead, request investigation first.

---

## AI Checklist (Before Implementation)

- [ ] I understand the request.
- [ ] I investigated existing code.
- [ ] I understand the architecture.
- [ ] I identified ownership.
- [ ] I identified reusable implementations.
- [ ] I know exactly which files will change.
- [ ] I know why each file changes.
- [ ] I can explain the data flow.
- [ ] This sprint introduces exactly one behavior.
- [ ] This sprint is reversible.
- [ ] Customer behavior remains unchanged unless requested.

---

## AI Acknowledgement

Before writing code, the AI must confirm:

✓ I understand the request.

✓ I investigated the project.

✓ I understand the architecture.

✓ I identified reusable code.

✓ I know the ownership.

✓ I know the data flow.

✓ I will preserve the existing architecture.

✓ I will implement only one behavior.

✓ I will verify the implementation.

✓ I will provide an implementation report.

Only then should implementation begin.
