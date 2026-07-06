# Hala Delivery

A complete multi-application delivery ecosystem.

This project is **not** a single application. It is a platform where Customer, Admin, Staff, and Driver applications share the same business logic, domain models, database, and reusable UI components.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Applications

- **Customer** — `app/(customer)/` — Restaurant browsing, cart, checkout, orders
- **Admin** — `app/admin/` — Dashboard, orders management, restaurant tools
- **Driver** — `app/driver/` — Assigned orders, delivery workflow
- **Staff** — `app/staff/` — Internal tools, kitchen workflow

---

## Engineering Documentation

All engineering documentation lives in `docs/`.

**Start here:** [`docs/000_START_HERE_FIRST.md`](docs/000_START_HERE_FIRST.md)

| Document | Purpose |
|---|---|
| `000_START_HERE_FIRST.md` | Entry point — read first |
| `001_PROJECT_ARCHITECTURE.md` | System architecture, layers, ownership |
| `002_ENGINEERING_MANUAL.md` | Engineering rules, workflow, philosophy |
| `003_DOMAIN_REFERENCE.md` | Business entities, identity rules |
| `004_ADR.md` | Architecture Decision Records |
| `005_PROJECT_STATUS.md` | Current state, completed features |
| `006_PROJECT_MAP.md` | Folder ownership, code placement |
| `007_AI_PROTOCOL.md` | AI assistant operating procedure |
| `008_KNOWLEDGE_BASE.md` | Investigation lessons, debugging history |
| `009_CODING_STANDARDS.md` | TypeScript, naming, file conventions |
| `010_FEATURE_INDEX.md` | Implemented features by area |
| `011_ROADMAP.md` | Future direction, planned work |
| `012_PROMPT_TEMPLATES.md` | Reusable AI prompts |

---

## Golden Rule

**Never start implementing before understanding the architecture.**

Understanding comes first. Architecture comes second. Implementation comes last.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS custom properties (theming)

---

## AI Assistants

AI contributors should read [`AGENTS.md`](AGENTS.md) first, then the documentation in `docs/`.

This project has strict engineering rules. Read the full engineering manual at [`docs/002_ENGINEERING_MANUAL.md`](docs/002_ENGINEERING_MANUAL.md) before writing any code.
