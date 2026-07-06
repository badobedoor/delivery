# AI Entry Point — Hala Delivery

---

## Before You Write Code

You are about to contribute to the Hala Delivery ecosystem.

This is not a standard project.

Read the following before writing any code.

---

## Required Reading (in order)

1. **[`docs/000_START_HERE_FIRST.md`](docs/000_START_HERE_FIRST.md)** — Project overview and documentation index
2. **[`docs/001_PROJECT_ARCHITECTURE.md`](docs/001_PROJECT_ARCHITECTURE.md)** — Architecture, layers, ownership
3. **[`docs/002_ENGINEERING_MANUAL.md`](docs/002_ENGINEERING_MANUAL.md)** — Engineering rules and workflow
4. **[`docs/007_AI_PROTOCOL.md`](docs/007_AI_PROTOCOL.md)** — AI operating procedure (mandatory)

---

## Golden Rule

**Never start implementing before understanding the architecture.**

---

## Key Facts

- Hala Delivery is a **multi-application ecosystem** (Customer, Admin, Staff, Driver) sharing business logic and UI components.
- **Shared components use composition**, not feature flags.
- **CSS variables** handle theming (light for customer, dark for admin).
- **IDs are identity**, names are presentation.
- **One behavior per sprint** — never combine unrelated work.
- **Atomic persistence** for critical operations via SQL functions.

---

## Next.js Version Notes

This project uses Next.js 14 with App Router. The version in `node_modules` may contain breaking changes from what you expect. Read `node_modules/next/dist/docs/` before writing new pages or API routes.

---

## Also Read

- [`CLAUDE.md`](CLAUDE.md) — Claude-specific behavior (if using Claude)
- [`README.md`](README.md) — Project introduction
