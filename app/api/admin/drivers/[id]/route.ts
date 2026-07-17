import { createClient }  from "@supabase/supabase-js";
import { NextResponse }   from "next/server";
import { requireAdmin }   from "@/lib/server/requireAuth";
import { hashPassword }  from "@/lib/server/auth";

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

  let body: { name?: string; phone?: string; password?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, phone, password, is_active } = body ?? {};

  /* Build update object — only include provided fields */
  const update: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    update.name = name.trim();
  }
  if (phone !== undefined) {
    if (!phone.trim()) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }
    update.phone = phone.trim();
  }
  if (password !== undefined && password.trim()) {
    try {
      update.password = await hashPassword(password);
    } catch {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
  if (is_active !== undefined) {
    update.is_active = is_active;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  /* Update the driver */
  const { data, error } = await admin()
    .from("delivery_staff")
    .update(update)
    .eq("id", id)
    .select("id, name, phone, wallet_balance, is_active")
    .single();

  if (error) {
    /* Handle duplicate phone */
    if (error.code === "23505") {
      const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
      if (text.includes("phone")) {
        return NextResponse.json(
          { error: "رقم الهاتف مستخدم بالفعل" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "هذه البيانات مسجلة بالفعل" },
        { status: 409 },
      );
    }

    console.error("update-driver:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "لم يتم العثور على السائق" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
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

  /* Verify the driver exists */
  const { data: existing, error: fetchError } = await admin()
    .from("delivery_staff")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("delete-driver fetch:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "لم يتم العثور على السائق" },
      { status: 404 },
    );
  }

  /* Delete the driver */
  const { error: deleteError } = await admin()
    .from("delivery_staff")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("delete-driver delete:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
