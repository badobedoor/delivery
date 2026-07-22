import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { requireAdmin }  from "@/lib/server/requireAuth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { error: "Driver ID is required" },
      { status: 400 },
    );
  }

  /* ── Parse body ── */
  let body: { operation?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { operation, amount } = body ?? {};

  /* ── Validate ── */
  if (operation !== "set" && operation !== "increment") {
    return NextResponse.json(
      { error: "operation must be 'set' or 'increment'" },
      { status: 400 },
    );
  }

  if (amount === undefined || amount === null || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "amount must be a valid number" },
      { status: 400 },
    );
  }

  const roundedAmount = Math.round(amount);

  /* ── Atomic RPC — runs inside a single PostgreSQL transaction ── */
  const { data, error } = await admin().rpc("adjust_driver_wallet", {
    p_driver_id: id,
    p_operation: operation,
    p_amount:    roundedAmount,
  });

  if (error) {
    const msg = error.message ?? "";

    /* Map RPC exceptions to proper HTTP status codes */
    if (msg.includes("driver not found")) {
      return NextResponse.json(
        { error: "لم يتم العثور على السائق" },
        { status: 404 },
      );
    }

    console.error("wallet-patch rpc:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, wallet_balance: Number(data) });
}