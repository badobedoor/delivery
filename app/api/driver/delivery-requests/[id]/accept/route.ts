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

/* ── POST /api/driver/delivery-requests/[id]/accept
     Server-side ATOMIC claim: pending → accepted.
     Binds (from the authenticated JWT / active shift, never from the client):
       delivery_id       = the authenticated driver id
       delivery_shift_id = the driver's current open financial shift (delivery_shifts.id)
       accepted_at       = now
     The .eq("status","pending") guard makes two drivers racing on the same
     request race-safe: only one UPDATE wins, the loser gets 0 rows → 409.
     Requires an open shift (status="open") — same rule as regular orders. ── */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDriver();
  if (!auth.ok) return auth.response;

  const did = auth.user.id;

  const { id } = await params;
  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { error: "Delivery request ID is required" },
      { status: 400 },
    );
  }

  /* ── 1. Current open financial shift for this driver ── */
  const { data: dsRows, error: dsError } = await service()
    .from("delivery_shifts")
    .select("id, shift_id, status")
    .eq("delivery_id", did)
    .eq("status", "open")
    .order("started_at", { ascending: false })
    .limit(1);

  if (dsError) {
    console.error("driver-accept delivery_shift:", dsError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  const shift = dsRows?.[0];
  if (!shift) {
    return NextResponse.json(
      { error: "You have no active shift" },
      { status: 400 },
    );
  }

  /* ── 2. Atomic accept with status guard ── */
  const { data, error } = await service()
    .from("delivery_requests")
    .update({
      status:            "accepted",
      delivery_id:       did,
      delivery_shift_id: shift.id,
      accepted_at:       new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status, delivery_id, delivery_shift_id, accepted_at")
    .maybeSingle();

  if (error) {
    console.error("driver-accept delivery_request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Request already taken" },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, request: data }, { status: 200 });
}
