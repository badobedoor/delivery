# Claude-Specific Behavior

This file documents behavior that is specific to Claude (Anthropic) when working on this project.

---

## General

- Follow the AI Protocol in [`docs/007_AI_PROTOCOL.md`](docs/007_AI_PROTOCOL.md).
- Always read [`docs/000_START_HERE_FIRST.md`](docs/000_START_HERE_FIRST.md) first.
- Use the Engineering Manual at [`docs/002_ENGINEERING_MANUAL.md`](docs/002_ENGINEERING_MANUAL.md) as the primary workflow guide.

---

## Tools

Claude has access to:
- `Bash` / `PowerShell` — shell commands
- `Edit` — file modification (old_string → new_string replacement)
- `Read` — file reading

Use `Read` to inspect existing code before modifying. Use `Edit` for precise, targeted changes.

---

## Next.js Version

This project uses Next.js 14 with App Router. The version in `node_modules/next/dist/` may differ from Claude's training data. Before writing new pages, API routes, or configuration, check `node_modules/next/dist/docs/` for any breaking changes.

---

## Investigation Mode

When asked to investigate a bug or behavior:

1. Do NOT modify any code.
2. Read the relevant files.
3. Trace the data flow.
4. Provide a report with: current flow, ownership, problem location, evidence, root cause, possible solutions (no code).

See [`docs/008_KNOWLEDGE_BASE.md`](docs/008_KNOWLEDGE_BASE.md) for examples of past investigations.

---

## Sprint Discipline

Every sprint = one behavior = one commit = one push.

Before implementing, confirm the sprint plan.

After implementing, provide a report: files changed, why each changed, runtime impact, reversibility.

---

## Documentation Reference

All project documentation is in `docs/`. The index is in `docs/000_START_HERE_FIRST.md`.

Key files for Claude:
- [`docs/007_AI_PROTOCOL.md`](docs/007_AI_PROTOCOL.md) — Operating procedure
- [`docs/009_CODING_STANDARDS.md`](docs/009_CODING_STANDARDS.md) — TypeScript and naming conventions
