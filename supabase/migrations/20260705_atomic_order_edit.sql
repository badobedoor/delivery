/*
  Sprint 7.1 — Atomic order edit transaction.

  This function wraps the three persistence operations (DELETE old items,
  INSERT new items, UPDATE order totals) inside a single PostgreSQL
  transaction so that either all changes are committed or none are.

  Run this in the Supabase SQL editor or via the Supabase CLI.

  ── Reversal ──
  DROP FUNCTION IF EXISTS apply_order_edit;
*/

CREATE OR REPLACE FUNCTION apply_order_edit(
  p_order_id    UUID,
  p_items       JSONB,
  p_subtotal    NUMERIC,
  p_total       NUMERIC,
  p_notes       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  /* 1. Delete existing order items for this order. */
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  /* 2. Insert the edited items from the JSONB array.
       Note: the frontend JSON payload may include extra keys (e.g. "name")
       that are not columns — JSONB_ARRAY_ELEMENTS ignores unused keys. */
  INSERT INTO public.order_items
    (order_id, menu_item_id, quantity, price_at_order, extras, notes, size_name)
  SELECT
    p_order_id,
    NULLIF(item->>'menu_item_id', '')::UUID,
    (item->>'quantity')::INTEGER,
    (item->>'price_at_order')::NUMERIC,
    CASE
      WHEN item->>'extras' IS NULL THEN NULL
      ELSE item->'extras'::JSONB
    END,
    item->>'notes',
    NULLIF(item->>'size_name', '')
  FROM JSONB_ARRAY_ELEMENTS(p_items) AS item;

  /* 3. Update order totals and notes. */
  UPDATE public.orders
  SET
    subtotal = p_subtotal,
    total    = p_total,
    notes    = p_notes
  WHERE id = p_order_id;
END;
$$;
