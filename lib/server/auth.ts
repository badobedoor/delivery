import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  path:     string;
  secure:   boolean;
  maxAge:   number;
};

/* ── Environment guard ── */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set in environment variables");
  return secret;
}

/* ─────────────────────────────────────────────
   JWT payload shapes
───────────────────────────────────────────── */
export type StaffPayload = {
  id:   string;
  role: string;
  type: "staff";
  name: string;
};

export type DriverPayload = {
  id:   string;
  role: "driver";
  type: "delivery";
  name: string;
};

export type JwtPayload = StaffPayload | DriverPayload;

/* ─────────────────────────────────────────────
   Password helpers
───────────────────────────────────────────── */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/* ─────────────────────────────────────────────
   JWT helpers
───────────────────────────────────────────── */
const TOKEN_TTL = "30d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

/* ─────────────────────────────────────────────
   Cookie config
───────────────────────────────────────────── */
export const AUTH_COOKIE = "auth_token";

export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 30, // 30 days in seconds
  };
}
