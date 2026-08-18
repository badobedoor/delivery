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

export async function GET() {
  /* Guard — entity token only */
  const auth = await requireEntity();
  if (!auth.ok) return auth.response;

  /* entity id comes from the JWT — never from the client */
  const entityId = auth.user.id;

  const { data, error } = await db()
    .from("entities")
    .select("id, name, address")
    .eq("id", entityId)
    .maybeSingle();

  if (error || !data) {
    console.error("entity-me lookup:", error);
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
