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

/* ── GET /api/admin/delivery-requests
     Server-side read for Admin/Staff. Browser anon clients are blocked by RLS
     (kept ON as a protection layer). This guarded API is the only reader:
       Admin/Staff  → 200
       Entity/Driver/others → 403 (requireStaff)
       No session   → 401
     Same SELECT the admin page consumes, ordered newest first. ── */
export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { data, error } = await db()
    .from("delivery_requests")
    .select("id, restaurant_name, entity_id, customer_phone, area_id, delivery_address, notes, price, delivery_fee, status, delivery_id, delivery_shift_id, created_at, approved_at, accepted_at, on_the_way_at, delivered_at, cancelled_at, approved_by, areas(name, delivery_fee)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list-delivery-requests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
