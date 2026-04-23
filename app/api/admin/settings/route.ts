import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const { data, error } = await admin()
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();

  const { data: row } = await admin()
    .from("settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "settings row not found" }, { status: 404 });

  const { data, error } = await admin()
    .from("settings")
    .update(body)
    .eq("id", row.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
