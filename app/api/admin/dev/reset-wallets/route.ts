import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { requireAdmin }  from "@/lib/server/requireAuth";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase
    .from("delivery_staff")
    .update({ wallet_balance: 0 })
    .gt("wallet_balance", 0);

  if (error) {
    console.error("reset-wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
