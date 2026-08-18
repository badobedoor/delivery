import { createClient }  from "@supabase/supabase-js";
import { NextResponse }   from "next/server";
import { requireStaff }   from "@/lib/server/requireAuth";

/* ── Service-role client — server-only, bypasses RLS, never sent to browser ── */
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── POST /api/admin/delivery-requests/[id]/approve
     Only transition allowed in this phase: new → pending.
     Sets approved_by (acting user id) and approved_at (now).
     Rejects anything that is not currently "new" with 409. ── */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  /* ── 1. Guard — staff / admin / super_admin only.
        Entity (role="entity"), driver (role="driver") and customers
        are rejected by requireStaff → 401 (no token) or 403. ── */
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  /* ── 2. Validate route id ── */
  const { id } = await params;
  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { error: "Delivery request ID is required" },
      { status: 400 },
    );
  }

  /* ── 3. Read current state — must exist and be "new" ── */
  const { data: existing, error: readError } = await db()
    .from("delivery_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("approve-delivery-request read:", readError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: "Delivery request not found" },
      { status: 404 },
    );
  }
  if (existing.status !== "new") {
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 409 },
    );
  }

  /* ── 4. Transition new → pending, record the approver ──
        Re-check status="new" in the WHERE to stay race-safe:
        if two admins approve simultaneously, only one wins. ── */
  const { data, error } = await db()
    .from("delivery_requests")
    .update({
      status:      "pending",
      approved_by: auth.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "new")
    .select("id, status, approved_by, approved_at")
    .single();

  if (error) {
    console.error("approve-delivery-request update:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: data }, { status: 200 });
}
