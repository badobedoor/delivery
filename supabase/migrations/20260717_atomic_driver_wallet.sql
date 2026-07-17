/*
  Sprint 7.2 — Atomic driver wallet adjustment.

  This function atomically adjusts a driver's wallet_balance inside a
  single PostgreSQL transaction so that concurrent "increment" operations
  (e.g. multiple shift-close approvals firing at the same time) cannot
  race and produce an incorrect balance.

  Usage:
    SELECT adjust_driver_wallet(42, 'increment', 50);  -- wallet += 50
    SELECT adjust_driver_wallet(42, 'set', 0);          -- wallet = 0

  ── Reversal ──
  DROP FUNCTION IF EXISTS adjust_driver_wallet;
*/

CREATE OR REPLACE FUNCTION adjust_driver_wallet(
  p_driver_id INTEGER,
  p_operation TEXT,
  p_amount    NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_operation = 'set' THEN
    UPDATE delivery_staff
    SET wallet_balance = p_amount
    WHERE id = p_driver_id
    RETURNING wallet_balance INTO v_new_balance;
  ELSIF p_operation = 'increment' THEN
    UPDATE delivery_staff
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
    WHERE id = p_driver_id
    RETURNING wallet_balance INTO v_new_balance;
  ELSE
    RAISE EXCEPTION 'invalid operation: %', p_operation;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver not found';
  END IF;

  RETURN v_new_balance;
END;
$$;
