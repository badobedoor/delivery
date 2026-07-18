import { createClient }  from "@supabase/supabase-js";
import { NextResponse }   from "next/server";
import { requireAdmin, requireStaff }   from "@/lib/server/requireAuth";
import { hashPassword }  from "@/lib/server/auth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { data, error } = await admin()
    .from("delivery_staff")
    .select("id, name, phone, wallet_balance, is_active")
    .order("name", { ascending: true });

  if (error) {
    console.error("list-drivers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { name?: string; phone?: string; password?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, phone, password, is_active } = body ?? {};

  /* ── Validate ── */
  if (!name?.trim()) {
    return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
  }
  if (!password?.trim()) {
    return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
  }

  /* ── Hash password — never store plaintext ── */
  let hashed: string;
  try {
    hashed = await hashPassword(password);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  /* ── Insert ── */
  const { data, error } = await admin()
    .from("delivery_staff")
    .insert({
      name:       name.trim(),
      phone:      phone.trim(),
      password:   hashed,
      is_active:  is_active ?? true,
    })
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

    console.error("create-driver:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
