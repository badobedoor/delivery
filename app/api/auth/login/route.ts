import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import {
  verifyPassword,
  hashPassword,
  signToken,
  AUTH_COOKIE,
  cookieOptions,
  type StaffPayload,
  type DriverPayload,
} from "@/lib/server/auth";

/* ── Service-role client — server-only, never sent to browser ── */
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── Request shape ── */
type LoginBody = {
  phone:    string;
  password: string;
  type:     "staff" | "driver";
};

/* ── 401 factory — never reuse a Response object across requests;
      Fetch API body is a ReadableStream and can only be consumed once ── */
function unauthorized() {
  return NextResponse.json(
    { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
    { status: 401 },
  );
}

export async function POST(request: Request) {

  /* ── 1. Parse body ── */
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phone, password, type } = body ?? {};

  /* ── 2. Validate required fields ── */
  if (!phone?.trim()) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }
  if (!password?.trim()) {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }
  if (type !== "staff" && type !== "driver") {
    return NextResponse.json(
      { error: "type must be 'staff' or 'driver'" },
      { status: 400 },
    );
  }

  /* ── 3. Resolve table ── */
  const table = type === "staff" ? "staff" : "delivery_staff";

  /* ── 4. Query — delivery_staff has no role column ── */
  console.log(`[login] before query table="${table}" phone="${phone.trim()}"`);

  type UserRow = { id: unknown; name: string; role?: string; phone?: string | null; password: string; is_active: boolean };

  let user:        UserRow | null = null;
  let dbErrorMsg:  string  | null = null;

  if (type === "staff") {
    const result = await db()
      .from("staff")
      .select("id, name, role, phone, password, is_active")
      .eq("phone", phone.trim())
      .eq("is_active", true)
      .maybeSingle();
    user        = result.data as UserRow | null;
    dbErrorMsg  = result.error?.message ?? null;
  } else {
    const result = await db()
      .from("delivery_staff")
      .select("id, name, password, is_active")
      .eq("phone", phone.trim())
      .eq("is_active", true)
      .maybeSingle();
    user        = result.data as UserRow | null;
    dbErrorMsg  = result.error?.message ?? null;
  }

  /* ── after query ── */
  console.log(`[login] after query found=${!!user} dbError=${!!dbErrorMsg}`);

  if (dbErrorMsg) {
    console.error("[login] DB error:", dbErrorMsg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!user) {
    console.log("[login] no active user → 401");
    return unauthorized();
  }

  /* ── 5. Verify password ── */
  const isHashed = user.password?.startsWith("$2");
  console.log(`[login] before password verify id="${user.id}" isHashed=${isHashed}`);

  let valid = false;
  try {
    if (isHashed) {
      valid = await verifyPassword(password, user.password);
    } else {
      valid = user.password === password;
    }
  } catch (err) {
    console.error("[login] password verify error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!valid) {
    console.log("[login] password mismatch → 401");
    return unauthorized();
  }

  /* ── 5b. bcrypt auto-migration — hash plaintext passwords on first successful login ── */
  if (!isHashed) {
    try {
      const hashed = await hashPassword(password);
      const updateTable = type === "staff" ? "staff" : "delivery_staff";
      await db().from(updateTable).update({ password: hashed }).eq("id", user.id as string);
      console.log(`[login] password auto-migrated to bcrypt id="${user.id}"`);
    } catch (err) {
      console.error("[login] bcrypt migration error (non-fatal):", err);
    }
  }

  /* ── 6. Build JWT payload ── */
  const payload: StaffPayload | DriverPayload =
    type === "staff"
      ? {
          id:   String(user.id),
          role: user.role ?? "staff",
          type: "staff",
          name: user.name ?? "",
        } satisfies StaffPayload
      : {
          id:   String(user.id),
          role: "driver",
          type: "delivery",
          name: user.name ?? "",
        } satisfies DriverPayload;

  /* ── 7. Sign JWT ── */
  console.log(`[login] before signToken id="${payload.id}" role="${payload.role}" type="${payload.type}"`);

  let token: string;
  try {
    token = signToken(payload);
  } catch (err) {
    console.error("[login] JWT sign error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  /* ── 8. Build response ── */
  const response = NextResponse.json({
    success: true,
    user: {
      id:    payload.id,
      name:  payload.name,
      role:  payload.role,
      type:  payload.type,
      phone: type === "staff" ? (user.phone ?? null) : null,
    },
  });

  /* ── 9. Set cookie ── */
  console.log(`[login] before cookie set name="${AUTH_COOKIE}" maxAge=${cookieOptions().maxAge}`);
  response.cookies.set(AUTH_COOKIE, token, cookieOptions());

  console.log(`[login] success 200 id="${payload.id}"`);
  return response;
}
