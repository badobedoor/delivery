import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { requireDriver } from "@/lib/server/requireAuth";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const auth = await requireDriver();
  if (!auth.ok) return auth.response;

  const { id } = auth.user;

  const { data, error } = await service()
    .from("delivery_staff")
    .select("wallet_balance")
    .eq("id", id)
    .single();

  if (error) {
    console.error("driver-wallet fetch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet_balance: data?.wallet_balance ?? 0 });
}