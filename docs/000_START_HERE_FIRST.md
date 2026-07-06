# Hala Delivery — Start Here

**Version:** 1.0
**Last Updated:** 2026-07-05

---

## Purpose

This is the entry point for the Hala Delivery engineering documentation.

Read this file first.

Then follow the links.

---

## What Is Hala Delivery?

Hala Delivery is a complete delivery ecosystem.

It is **not** a single application.

It is a multi-application platform where Customer, Admin, Staff, and Driver applications share the same business logic, domain models, database, and reusable UI components.

---

## Golden Rule

> **Never start implementing before understanding the architecture.**

Understanding comes first.

Architecture comes second.

Implementation comes last.

---

## Quick Start

| If you want to ... | Start here |
|---|---|
| Understand the project structure | `001_PROJECT_ARCHITECTURE.md` |
| Learn the engineering rules | `002_ENGINEERING_MANUAL.md` |
| See business domain definitions | `003_DOMAIN_REFERENCE.md` |
| Review architectural decisions | `004_ADR.md` |
| Check what exists and what is planned | `005_PROJECT_STATUS.md` |
| Find where code belongs | `006_PROJECT_MAP.md` |
| Understand AI operating protocol | `007_AI_PROTOCOL.md` |
| Learn from past investigations | `008_KNOWLEDGE_BASE.md` |
| Review coding standards | `009_CODING_STANDARDS.md` |
| Browse implemented features | `010_FEATURE_INDEX.md` |
| See the roadmap | `011_ROADMAP.md` |
| Use prompt templates | `012_PROMPT_TEMPLATES.md` |
| View milestone history | `013_CHANGELOG.md` |
| Look up a term or concept | `014_TERMINOLOGY.md` |
| Learn how to contribute | `015_CONTRIBUTING.md` |
| Review architectural invariants | `016_DO_NOT_BREAK.md` |

---

## Documentation Index

| # | File | Purpose |
|---|---|---|
| 000 | `000_START_HERE_FIRST.md` | Entry point |
| 001 | `001_PROJECT_ARCHITECTURE.md` | System architecture, layers, ownership |
| 002 | `002_ENGINEERING_MANUAL.md` | Development philosophy, workflow, rules |
| 003 | `003_DOMAIN_REFERENCE.md` | Business entities, identity rules |
| 004 | `004_ADR.md` | Architecture Decision Records |
| 005 | `005_PROJECT_STATUS.md` | Current state, completed features |
| 006 | `006_PROJECT_MAP.md` | Folder ownership, code placement |
| 007 | `007_AI_PROTOCOL.md` | AI assistant operating procedure |
| 008 | `008_KNOWLEDGE_BASE.md` | Investigation lessons, debugging history |
| 009 | `009_CODING_STANDARDS.md` | TypeScript, naming, file conventions |
| 010 | `010_FEATURE_INDEX.md` | Implemented features by area |
| 011 | `011_ROADMAP.md` | Future direction, planned work |
| 012 | `012_PROMPT_TEMPLATES.md` | Reusable AI prompts for common tasks |
| 013 | `013_CHANGELOG.md` | Engineering milestone history |
| 014 | `014_TERMINOLOGY.md` | Project glossary |
| 015 | `015_CONTRIBUTING.md` | Contributor guide |
| 016 | `016_DO_NOT_BREAK.md` | Architectural invariants (do not break) |

---

## How to Read This Documentation

For a quick overview, read in this order:

1. `000_START_HERE_FIRST.md` — Entry point
2. `001_PROJECT_ARCHITECTURE.md` — System organization
3. `002_ENGINEERING_MANUAL.md` — Engineering rules
4. `003_DOMAIN_REFERENCE.md` — Business domain
5. `006_PROJECT_MAP.md` — Code navigation
6. Others as needed during implementation

---

## Engineering Mindset

Before writing any code, ask:

- Do I fully understand the current architecture?
- Does this already exist somewhere?
- Can I reuse an existing implementation?
- Am I preserving the project's architecture?
- Am I introducing unnecessary complexity?
- Is this implementation reversible?

Implementation should be the last step — not the first.

---

## Related Files

- `README.md` — Project introduction
- `AGENTS.md` — Quick AI entry point
- `CLAUDE.md` — Claude-specific behavior

---

## AI Acknowledgement

✓ I understand that this is a multi-application delivery ecosystem.

✓ I will read the relevant documentation before implementing.

✓ I will follow the Golden Rule: understand first, then implement.

✓ I will preserve the architecture and reuse existing code.

---

## Engineering Reading Order

For a comprehensive understanding of the entire project, read the documentation in this exact order:

```
000_START_HERE_FIRST.md          — Project overview and index
        ↓
001_PROJECT_ARCHITECTURE.md      — System architecture, layers, ownership
        ↓
002_ENGINEERING_MANUAL.md        — Engineering rules and development workflow
        ↓
003_DOMAIN_REFERENCE.md          — Business entities and identity rules
        ↓
004_ADR.md                       — Architecture Decision Records (why decisions were made)
        ↓
005_PROJECT_STATUS.md            — Current implementation state (what already exists)
        ↓
006_PROJECT_MAP.md               — Folder navigation and code placement
        ↓
007_AI_PROTOCOL.md               — AI operating procedure (if you are an AI)
        ↓
008_KNOWLEDGE_BASE.md            — Past investigations and lessons learned
        ↓
009_CODING_STANDARDS.md          — TypeScript, naming, and file conventions
        ↓
010_FEATURE_INDEX.md             — Feature-to-file mapping
        ↓
011_ROADMAP.md                   — Future direction and planned work
        ↓
012_PROMPT_TEMPLATES.md          — Reusable AI prompts
        ↓
013_CHANGELOG.md                 — Engineering milestone history
        ↓
014_TERMINOLOGY.md               — Project glossary
        ↓
015_CONTRIBUTING.md              — How to contribute
        ↓
016_DO_NOT_BREAK.md              — Architectural invariants to preserve
```

**Rules:**
- Do not skip documents.
- Do not read out of order.
- The reading order is designed so that each document builds on the previous one.
- Once you have read them all, use individual documents as reference during implementation.
