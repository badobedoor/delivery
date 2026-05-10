import { NextResponse } from "next/server";
import { AUTH_COOKIE }  from "@/lib/server/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
    maxAge:   0,
    secure:   process.env.NODE_ENV === "production",
  });
  return response;
}
