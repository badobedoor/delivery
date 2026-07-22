/*
  Sprint 7.3 — Atomic motorcycle wallet adjustment.

  This function atomically adjusts a motorcycle's wallet_balance inside a
  single PostgreSQL transaction so that concurrent "increment" operations
  (e.g. multiple shift-close approvals firing at the same time) cannot
  race and produce an incorrect balance.

  Usage:
    SELECT adjust_motorcycle_wallet(1, 'increment', 50);  -- wallet += 50
    SELECT adjust_motorcycle_wallet(1, 'set', 0);          -- wallet = 0

  ── Reversal ──
  DROP FUNCTION IF EXISTS adjust_motorcycle_wallet;
*/

CREATE OR REPLACE FUNCTION adjust_motorcycle_wallet(
  p_motorcycle_id UUID,
  p_operation     TEXT,
  p_amount        NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_operation = 'set' THEN
    UPDATE motorcycles
    SET wallet_balance = p_amount
    WHERE id = p_motorcycle_id
    RETURNING wallet_balance INTO v_new_balance;
  ELSIF p_operation = 'increment' THEN
    UPDATE motorcycles
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
    WHERE id = p_motorcycle_id
    RETURNING wallet_balance INTO v_new_balance;
  ELSE
    RAISE EXCEPTION 'invalid operation: %', p_operation;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'motorcycle not found';
  END IF;

  RETURN v_new_balance;
END;
$$;
