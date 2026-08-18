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

/* ── Fields a driver card needs. delivery_requests has NO shift_id column —
     available items are shift-scoped by the page (driver must be in an open
     shift) and bound to delivery_shift_id only on accept. ── */
const SELECT = `
  id, restaurant_name, entity_id, customer_phone, area_id, delivery_address, notes,
  price, delivery_fee, status, delivery_id, delivery_shift_id,
  created_at, accepted_at, on_the_way_at, delivered_at, cancelled_at,
  areas(name, delivery_fee)
`;

/* ── GET /api/driver/delivery-requests
     requireDriver(): customers / staff / entity / no-session are rejected.
     Returns { available, active } for the authenticated driver.
       available: status = pending (any driver in an open shift may take them)
       active:    status in (accepted, on_the_way) AND delivery_id = this driver
     Browser anon clients stay RLS-blocked on delivery_requests (kept ON). ── */
export async function GET() {
  const auth = await requireDriver();
  if (!auth.ok) return auth.response;

  const did = auth.user.id;

  const [availRes, activeRes] = await Promise.all([
    service()
      .from("delivery_requests")
      .select(SELECT)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    service()
      .from("delivery_requests")
      .select(SELECT)
      .in("status", ["accepted", "on_the_way"])
      .eq("delivery_id", did)
      .order("created_at", { ascending: false }),
  ]);

  if (availRes.error) {
    console.error("driver-delivery-requests available:", availRes.error);
    return NextResponse.json({ error: availRes.error.message }, { status: 500 });
  }
  if (activeRes.error) {
    console.error("driver-delivery-requests active:", activeRes.error);
    return NextResponse.json({ error: activeRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    available: availRes.data ?? [],
    active:    activeRes.data ?? [],
  });
}
