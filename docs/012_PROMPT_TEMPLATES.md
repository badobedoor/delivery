# Prompt Templates

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This document provides reusable prompt templates for common engineering tasks inside the Hala Delivery project.

These templates ensure consistency across AI interactions and reduce the overhead of writing detailed prompts from scratch.

---

## How to Use

Copy the relevant template and fill in the placeholders (`[like this]`).

Each template includes the mandatory workflow phases from `007_AI_PROTOCOL.md`.

---

## Template 1 — Feature Implementation

Use this when requesting a new feature.

```
We are implementing a new feature for Hala Delivery.

## Feature Description
[Describe the feature in one paragraph. What problem does it solve? Who uses it?]

## Affected Applications
[Customer / Admin / Driver / Staff / Multiple]

## Business Rules
[If any specific business rules apply, describe them here.]

## Data Requirements
[What data does this feature need? Any new database fields?]

## Engineering Process
Follow the Hala Delivery engineering workflow:
1. Understand — Confirm the feature.
2. Investigate — Search existing code for reusable pieces.
3. Report — Explain current architecture and planned changes before coding.
4. Architecture — Discuss ownership and data flow.
5. Sprint Planning — Split into one-behavior sprints.
6. Implement — One behavior per sprint.
7. Verify — Type safety, runtime, no regressions.
8. Report — Files changed, impact, reversibility.

## Constraints
- No feature flags in shared components.
- No duplication of business logic.
- Use composition over flags.
- CSS variables for theming.
- IDs over names for identity.
- Atomic persistence for critical operations.
```

---

## Template 2 — Bug Investigation

Use this when a bug needs investigation without implementation.

```
We need to investigate a bug in Hala Delivery.

Do NOT implement any fixes. Only investigate and report.

## Bug Description
[Describe the bug. What is happening? What should happen?]

## Affected Applications
[Customer / Admin / Driver / Staff]

## Investigation Scope
[What should be traced? Data flow? Database? UI?]

## Investigation Method
1. Trace data flow from start to finish.
2. Identify each transformation layer.
3. Find where the behavior diverges from expected.
4. Report: current flow, ownership, problem location, evidence, root cause, possible solutions (no code).
```

---

## Template 3 — Architecture Review

Use this when reviewing completed work.

```
Please perform an architecture review of the following work in Hala Delivery.

## Work Description
[Describe what was implemented.]

## Files Changed
[List the files.]

## Review Criteria
1. Is business logic duplicated?
2. Is UI duplicated?
3. Is ownership correct?
4. Is the abstraction appropriate?
5. Can this be simplified?
6. Is another sprint needed?
7. Is the change reversible?
8. Does it preserve existing architecture?

## Report
Provide findings, risks, and recommendations.
```

---

## Template 4 — Sprint Planning

Use this when planning a multi-sprint feature.

```
We need to plan sprints for a new feature in Hala Delivery.

## Feature
[Describe the feature.]

## Rule
Each sprint introduces exactly ONE behavior. One sprint = one commit = one push.

## Current Architecture
[Summarize relevant architecture.]

## Request
Split this feature into the smallest independently testable behaviors.

For each sprint provide:
- Sprint number
- Single behavior
- Files likely to change
- Why each file changes
- Reversibility check
```

---

## Template 5 — Code Review

Use this for code review requests.

```
Please review this code change for Hala Delivery.

## Context
[What does this change do?]

## Files
[List files and diff summary.]

## Review Focus
- Type safety
- Architecture preservation
- Business logic duplication
- Data integrity
- Theme compliance (CSS variables)
- Naming conventions
- Reusability

## Standards Reference
See docs/009_CODING_STANDARDS.md
```

---

## Template 6 — ADR Proposal

Use this when proposing a new architectural decision.

```
We need to make an architectural decision for Hala Delivery.

## Proposal
[What is being proposed?]

## Context
[Why is this being considered? What problem does it solve?]

## Alternatives Considered
[List alternatives.]

## Recommendation
[Which option is recommended and why.]

## Impact
[How does this affect existing code, data, architecture?]

Please format the response as a proper ADR entry following docs/004_ADR.md format.
```

---

## Template 7 — Knowledge Base Entry

Use this when documenting a lesson learned.

```
We need to document a lesson learned in the Hala Delivery Knowledge Base.

## What Happened
[Describe the issue or discovery.]

## How It Was Diagnosed
[Describe the investigation process.]

## Root Cause
[What was the actual cause?]

## Lesson
[What should future contributors learn from this?]

Format as a KB entry following the pattern in docs/008_KNOWLEDGE_BASE.md.
```

---

## Checklist (All Templates)

- [ ] I specified which applications are affected.
- [ ] I referenced relevant docs files.
- [ ] I split the work into single-behavior sprints.
- [ ] I asked for investigation before implementation.
- [ ] I requested a final report.

---

## AI Acknowledgement

✓ I understand these templates exist for consistency.

✓ I will use them for common engineering tasks.

✓ I understand they enforce the Hala Delivery engineering workflow.

✓ I will adapt them as needed while preserving the core structure.
