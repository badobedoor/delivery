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

/* ── POST /api/driver/delivery-requests/[id]/status
     Driver advances an entity request it already owns.
       action "pickup"  → accepted → on_the_way   (sets on_the_way_at)
       action "deliver" → on_the_way → delivered   (sets delivered_at)
     Pickup is the enforcement point: area_id + customer_phone MUST be present
     (either already set by the entity, or completed by the driver now) or the
     API rejects with 400 — even if the client bypasses the UI. delivery_fee is
     re-derived from the effective area. price and notes (تفاصيل الطلب) remain
     OPTIONAL: sent → updated (notes empty → null); omitted → existing value kept.
     Guarded by delivery_id = authenticated driver AND the expected previous
     status — race-safe, no client-supplied identity or timestamps.
     Uses ONLY columns that exist on delivery_requests (no picked_up /
     restaurant_paid / payment fields — they don't exist there). ── */
export async function POST(
  request: Request,
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

  let body: {
    action?:         string;
    area_id?:        string | null;
    customer_phone?: string | null;
    notes?:          string | null;
    price?:          string | number | null;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.action !== "pickup" && body.action !== "deliver") {
    return NextResponse.json(
      { error: "action must be 'pickup' or 'deliver'" },
      { status: 400 },
    );
  }

  const isPickup = body.action === "pickup";

  /* ── Pickup (accepted → on_the_way) is the enforcement point:
        the driver must complete area_id + customer_phone before the request
        can move to on_the_way. Existing entity-provided values are kept unless
        the driver supplies a replacement (so they never re-enter valid data). ── */
  const pickupData: {
    area_id?:        string;
    customer_phone?: string;
    notes?:          string | null;
    delivery_fee?:   number | null;
    price?:          number;
  } = {};

  if (isPickup) {
    /* Read the current row — must exist, be owned by this driver, be accepted */
    const { data: cur, error: curError } = await service()
      .from("delivery_requests")
      .select("area_id, customer_phone")
      .eq("id", id)
      .eq("delivery_id", did)
      .eq("status", "accepted")
      .maybeSingle();

    if (curError) {
      console.error("driver-status read:", curError);
      return NextResponse.json({ error: curError.message }, { status: 500 });
    }
    if (!cur) {
      return NextResponse.json(
        { error: "Cannot update request in current state" },
        { status: 409 },
      );
    }

    /* ── area_id — REQUIRED. Prefer what the driver sent; fall back to the
          existing value the entity may have provided at creation. ── */
    const suppliedArea = typeof body.area_id === "string" ? body.area_id.trim() : "";
    const effectiveAreaId = suppliedArea !== "" ? suppliedArea : (cur.area_id ?? "").trim();

    if (!effectiveAreaId) {
      return NextResponse.json(
        { error: "area_id is required before pickup" },
        { status: 400 },
      );
    }

    /* Area must exist — reject otherwise. delivery_fee is derived from it
       server-side (never client-supplied), same as at creation. */
    const { data: area, error: areaError } = await service()
      .from("areas")
      .select("delivery_fee")
      .eq("id", effectiveAreaId)
      .maybeSingle();

    if (areaError) {
      console.error("driver-status area lookup:", areaError);
      return NextResponse.json({ error: areaError.message }, { status: 500 });
    }
    if (!area) {
      return NextResponse.json(
        { error: "area_id not found" },
        { status: 400 },
      );
    }
    pickupData.area_id      = effectiveAreaId;
    pickupData.delivery_fee = area.delivery_fee ?? null;

    /* ── customer_phone — REQUIRED. Prefer what the driver sent; fall back to
          the existing entity-provided value. Validated with the same Egyptian
          mobile format used across the app. ── */
    const suppliedPhone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
    const effectivePhone = suppliedPhone !== "" ? suppliedPhone : (cur.customer_phone ?? "").trim();

    if (!effectivePhone) {
      return NextResponse.json(
        { error: "customer_phone is required before pickup" },
        { status: 400 },
      );
    }
    if (!/^01[0125][0-9]{8}$/.test(effectivePhone.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { error: "customer_phone must be a valid Egyptian mobile number" },
        { status: 400 },
      );
    }
    pickupData.customer_phone = effectivePhone;

    /* ── notes (تفاصيل الطلب) — OPTIONAL. Never required, never blocks pickup.
          If the driver sends a string, store it trimmed (empty → null).
          If omitted, the existing entity value is kept untouched. ── */
    if (typeof body.notes === "string") {
      pickupData.notes = body.notes.trim() || null;
    }

    /* ── price — OPTIONAL. If provided it must be a non-negative number;
          otherwise the existing entity value is kept. ── */
    if (body.price !== undefined && body.price !== null && body.price !== "") {
      const parsed = typeof body.price === "number" ? body.price : Number(body.price);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "price must be a non-negative number" },
          { status: 400 },
        );
      }
      pickupData.price = parsed;
    }
  }

  const fromStatus = isPickup ? "accepted" : "on_the_way";
  const update     = isPickup
    ? { status: "on_the_way", on_the_way_at: new Date().toISOString(), ...pickupData }
    : { status: "delivered",  delivered_at:   new Date().toISOString() };

  const { data, error } = await service()
    .from("delivery_requests")
    .update(update)
    .eq("id", id)
    .eq("delivery_id", did)
    .eq("status", fromStatus)
    .select("id, status, delivery_id, area_id, customer_phone, delivery_fee, price, notes, on_the_way_at, delivered_at")
    .maybeSingle();

  if (error) {
    console.error("driver-status delivery_request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Cannot update request in current state" },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, request: data }, { status: 200 });
}
