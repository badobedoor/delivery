import { cookies }      from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE, type JwtPayload } from "@/lib/server/auth";

type AuthResult =
  | { ok: true;  user: JwtPayload }
  | { ok: false; response: NextResponse };

/* ── Read & verify auth_token cookie ── */
async function getAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    const user = verifyToken(token);
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

/* ── Any authenticated internal user (staff or driver) ── */
export async function requireAuth(): Promise<AuthResult> {
  return getAuth();
}

/* ── Admin or super_admin only ── */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await getAuth();
  if (!result.ok) return result;

  const { role } = result.user;
  if (role !== "admin" && role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

/* ── staff, admin, or super_admin ── */
export async function requireStaff(): Promise<AuthResult> {
  const result = await getAuth();
  if (!result.ok) return result;

  const { role } = result.user;
  if (role !== "staff" && role !== "admin" && role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

/* ── Driver only (type="delivery") ── */
export async function requireDriver(): Promise<AuthResult> {
  const result = await getAuth();
  if (!result.ok) return result;

  if (result.user.type !== "delivery") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
