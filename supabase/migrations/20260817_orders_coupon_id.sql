/*
  ربط الطلب بالكوبون — خصومات التوصيل في تقفيل وردية الدليفري.

  orders.coupon_id → coupons.id (nullable, on delete set null).
  الطلبات القديمة تبقى coupon_id = NULL — لا Backfill ولا تخمين نوع الخصم.
  التمييز يتم من coupons.applies_to = "توصيل" فقط.

  ── Reversal ──
  DROP INDEX IF EXISTS idx_orders_coupon_id;
  ALTER TABLE public.orders DROP COLUMN IF EXISTS coupon_id;
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
  ON public.orders (coupon_id);
