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

/* ── POST /api/admin/delivery-requests/[id]/cancel
     Allowed from: new / pending / accepted / on_the_way → cancelled.
     Sets cancelled_at (now). Rejects delivered / cancelled with 409.
     Mirrors the orders cancel flow, but server-side because browser anon
     clients are RLS-blocked on delivery_requests. ── */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { error: "Delivery request ID is required" },
      { status: 400 },
    );
  }

  /* Read current state — must exist and be "new" */
  const { data: existing, error: readError } = await db()
    .from("delivery_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("cancel-delivery-request read:", readError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: "Delivery request not found" },
      { status: 404 },
    );
  }
  const CANCELLABLE = ["new", "pending", "accepted", "on_the_way"];
  if (!CANCELLABLE.includes(existing.status)) {
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 409 },
    );
  }

  /* Transition cancellable → cancelled, re-check the read status in WHERE
     (race-safe — if another action changed it meanwhile, the update returns
     nothing and the caller gets 409). A cancelled request disappears from the
     driver's available/active lists because those query status pending /
     accepted / on_the_way only. */
  const { data, error } = await db()
    .from("delivery_requests")
    .update({
      status:       "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", existing.status)
    .select("id, status, cancelled_at")
    .single();

  if (error) {
    console.error("cancel-delivery-request update:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: data }, { status: 200 });
}
