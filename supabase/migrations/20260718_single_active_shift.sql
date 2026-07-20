/*
  Sprint 7.3 — Enforce at most one active operational shift.

  This partial unique index guarantees that no more than one row in the
  "shifts" table can have is_active = true at any given time.

  Previously the application relied on a client-side guard in
  admin/shifts/page.tsx (handleToggle → DB count check before write).
  That guard is kept for UX (early feedback before the round-trip), but it
  has a TOCTOU race condition — two concurrent activation requests can
  both pass the check before either write commits.

  A partial unique index is the only way to enforce this invariant
  atomically at the database level, regardless of race conditions,
  concurrent requests, multiple tabs, or direct DB writes.

  ── Reversal ──
  DROP INDEX IF EXISTS idx_shifts_single_active;
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_single_active
  ON shifts (is_active)
  WHERE is_active = true;
