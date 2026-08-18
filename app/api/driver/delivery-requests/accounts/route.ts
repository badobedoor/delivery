import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireDriver } from "@/lib/server/requireAuth";

/* ── Service-role client — server-only, bypasses RLS, never sent to browser ── */
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── GET /api/driver/delivery-requests/accounts
     Feeds the driver's "حساباتي" pages (current-shift + financial archive).
     The browser supabase client CANNOT read delivery_requests (RLS ON), so
     these pages must go through a guarded server API — same as the orders page.

     Returns:
       current:  the driver's delivery_requests in its CURRENT delivery_shift
                 (the most recent delivery_shifts with status open / pending_close;
                 closed shifts are excluded) — status accepted / on_the_way / delivered.
                 Only delivery_fee is settled.
       archive:  delivered requests mapped from delivery_shifts.id → the operational
                 shift_id, so the archive can sum their delivery_fee into the same
                 per-shift settlement figures. Each row carries BOTH delivery_shift_id
                 (the real financial scope of the entity request) and shift_id (the
                 operational shift), so the archive can aggregate per financial shift
                 without ambiguity when two financial shifts share a shift_id.

     Only the authenticated driver's own rows are ever returned; no client-supplied
     identity, no delivery_shift_id, no price — identity comes from the JWT. ── */
export async function GET() {
  const auth = await requireDriver();
  if (!auth.ok) return auth.response;

  const did = auth.user.id;

  /* ── 1. All the driver's financial shifts (id → operational shift_id) ── */
  const { data: shifts, error: shiftErr } = await service()
    .from("delivery_shifts")
    .select("id, shift_id, status")
    .eq("delivery_id", did)
    .order("started_at", { ascending: false });

  if (shiftErr) {
    console.error("delivery-requests/accounts shifts:", shiftErr);
    return NextResponse.json({ error: shiftErr.message }, { status: 500 });
  }

  const shiftByDsId = new Map<string, string>();
  (shifts ?? []).forEach((ds: { id: string; shift_id: string | null }) => {
    if (ds.id && ds.shift_id) shiftByDsId.set(ds.id, ds.shift_id);
  });

  /* الوردية المالية الحالية = أحدث delivery_shifts بحالة open أو pending_close فقط.
     الورديات closed (قديمة) لا تدخل في الحساب الحالي أبدًا.
     خريطة shiftByDsId (المستخدمة لأرشيف صفحة الأرشيف) تبقى كاملة لكل الورديات. */
  const currentShift = (shifts ?? []).find((s) => s.status === "open" || s.status === "pending_close") ?? null;
  const currentShiftId = currentShift?.id ?? null;

  /* ── 2. Current-shift requests (accepted / on_the_way / delivered) ── */
  let current: unknown[] = [];
  if (currentShiftId) {
    const { data: rows, error } = await service()
      .from("delivery_requests")
      .select("id, restaurant_name, delivery_fee, price, status, areas(name)")
      .eq("delivery_id", did)
      .eq("delivery_shift_id", currentShiftId)
      .in("status", ["accepted", "on_the_way", "delivered"])
      .order("created_at", { ascending: true });
    if (error) {
      console.error("delivery-requests/accounts current:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    current = rows ?? [];
  }

  /* ── 3. Delivered requests mapped to the operational shift_id (for the archive) ── */
  const dsIds = Array.from(shiftByDsId.keys());
  let archive: { shift_id: string; delivery_fee: number }[] = [];
  if (dsIds.length > 0) {
    const { data: rows, error } = await service()
      .from("delivery_requests")
      .select("delivery_shift_id, delivery_fee")
      .eq("delivery_id", did)
      .eq("status", "delivered")
      .in("delivery_shift_id", dsIds);
    if (error) {
      console.error("delivery-requests/accounts archive:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    archive = (rows ?? [])
      .map((r: { delivery_shift_id: string; delivery_fee: number | null }) => ({
        delivery_shift_id: r.delivery_shift_id,
        shift_id:          shiftByDsId.get(r.delivery_shift_id) ?? "",
        delivery_fee:      r.delivery_fee ?? 0,
      }))
      .filter((r) => r.shift_id !== "");
  }

  return NextResponse.json({ current, archive }, { status: 200 });
}
