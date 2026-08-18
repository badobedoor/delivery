import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/requireAuth";

/* ── Service-role client — server-only, bypasses RLS, never sent to browser ── */
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── GET /api/admin/delivery-requests/accounts
     Staff-only. Returns the sum of delivery_fee (never price) for DELIVERED
     delivery_requests, grouped by delivery_shift_id, for ONE driver.

     delivery_requests has RLS ON, so the browser admin client cannot read it;
     this guarded server API (service role) is the only source the admin
     accounts page can use to include entity delivery fees in a driver's
     close request — the exact same pattern as the driver's accounts API.

     Query params:
       delivery_id        (required) the driver id
       delivery_shift_id  (optional) restrict to one financial shift

     Returns { shifts: [{ delivery_shift_id, delivery_fee }] }

     Only delivery_fee is ever summed — price never enters the driver's
     financial settlement. Identity comes from requireStaff, never the client. ── */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const deliveryId = url.searchParams.get("delivery_id")?.trim();
  const deliveryShiftId = url.searchParams.get("delivery_shift_id")?.trim();

  if (!deliveryId) {
    return NextResponse.json({ error: "delivery_id is required" }, { status: 400 });
  }

  let q = service()
    .from("delivery_requests")
    .select("delivery_shift_id, delivery_fee")
    .eq("delivery_id", deliveryId)
    .eq("status", "delivered");

  if (deliveryShiftId) q = q.eq("delivery_shift_id", deliveryShiftId);

  const { data, error } = await q;
  if (error) {
    console.error("admin delivery-requests/accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byShift = new Map<string, number>();
  (data ?? []).forEach((r: { delivery_shift_id: string | null; delivery_fee: number | null }) => {
    if (!r.delivery_shift_id) return;
    byShift.set(r.delivery_shift_id, (byShift.get(r.delivery_shift_id) ?? 0) + (r.delivery_fee ?? 0));
  });

  return NextResponse.json({
    shifts: Array.from(byShift.entries()).map(([delivery_shift_id, delivery_fee]) => ({
      delivery_shift_id,
      delivery_fee: Math.round(delivery_fee),
    })),
  }, { status: 200 });
}
