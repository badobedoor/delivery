import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import { requireAdmin }  from "@/lib/server/requireAuth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { assignmentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { assignmentId } = body ?? {};
  if (!assignmentId || typeof assignmentId !== "string" || !assignmentId.trim()) {
    return NextResponse.json(
      { error: "assignmentId is required and must be a valid UUID string" },
      { status: 400 },
    );
  }

  /* 1. Verify the assignment exists */
  const { data: existing, error: fetchError } = await admin()
    .from("delivery_shifts")
    .select("id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (fetchError) {
    console.error("remove-assignment fetch:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "لم يتم العثور على هذا التعيين" },
      { status: 404 },
    );
  }

  /* 2. Delete the row */
  const { error: deleteError } = await admin()
    .from("delivery_shifts")
    .delete()
    .eq("id", assignmentId);

  if (deleteError) {
    console.error("remove-assignment delete:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
