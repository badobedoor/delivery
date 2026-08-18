import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { requireEntity } from "@/lib/server/requireAuth";

/* ── Service-role client — server-only, never sent to browser ── */
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── Request shape — only the optional fields the entity page sends.
      Admin/driver/approval fields are NEVER accepted from the client. ── */
type Body = {
  customer_phone?: string | null;
  area_id?:        string | null;
  notes?:          string | null;
  price?:          string | number | null;
};

export async function POST(request: Request) {
  /* ── 1. Guard — entity token only; anyone else gets 401/403 ── */
  const auth = await requireEntity();
  if (!auth.ok) return auth.response;

  /* entity identity comes ONLY from the authenticated JWT — never from the client */
  const entityId = auth.user.id;

  /* ── 2. Parse body ── */
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { customer_phone, area_id, notes, price } = body ?? {};

  /* ── 3. Validate optional price (if provided) ── */
  let priceValue: number | null = null;
  if (price !== null && price !== undefined && price !== "") {
    const parsed = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json(
        { error: "price must be a non-negative number" },
        { status: 400 },
      );
    }
    priceValue = parsed;
  }

  /* ── 4. Authoritative entity data — from DB by JWT id, not from client.
        Also re-checks the entity still exists and is active. ── */
  const { data: entity, error: entityError } = await db()
    .from("entities")
    .select("name")
    .eq("id", entityId)
    .eq("is_active", true)
    .maybeSingle();

  if (entityError || !entity?.name) {
    console.error("entity-delivery-request entity lookup:", entityError);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ── 5. Delivery fee — derived from the area, same logic as regular orders
        (the customer's area sets the fee; the driver never supplies it).
        Column already exists on delivery_requests — no schema change. ── */
  const areaId     = area_id?.trim() || null;
  let   deliveryFee: number | null = null;
  if (areaId) {
    const { data: area } = await db()
      .from("areas")
      .select("delivery_fee")
      .eq("id", areaId)
      .maybeSingle();
    if (area) deliveryFee = area.delivery_fee ?? null;
  }

  /* ── 6. Create delivery request — status always "new".
        entity_id & restaurant_name are server-derived, never client-supplied.
        No delivery_id / delivery_shift_id / approved_by / status from client. ── */
  const { data, error } = await db()
    .from("delivery_requests")
    .insert({
      entity_id:       entityId,
      restaurant_name: entity.name,
      customer_phone:  customer_phone?.trim() || null,
      area_id:         areaId,
      notes:           notes?.trim() || null,
      price:           priceValue,
      delivery_fee:    deliveryFee,
      status:          "new",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    console.error("entity-delivery-request create:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, request: data }, { status: 201 });
}
