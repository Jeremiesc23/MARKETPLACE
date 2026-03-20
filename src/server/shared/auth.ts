//src/server/shared/auth.ts
import jwt from "jsonwebtoken";
import type { NextResponse } from "next/server";
import { AppError } from "./errors";

export type SessionUser = {
  id: number;
  role?: string;
  email?: string;
  name?: string;
};


function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");
  return secret;
}

export function signSession(payload: SessionUser) {
  return jwt.sign(payload, getSecret(), { expiresIn: "3h" });
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const p = part.trim();
    if (!p) continue;
    const idx = p.indexOf("=");
    if (idx === -1) continue;

    const key = p.slice(0, idx).trim();
    const val = p.slice(idx + 1);
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function requireAuth(req: Request): SessionUser {
  const session = getSessionFromRequest(req);
  if (!session) throw new AppError("Unauthorized", 401);
  return session;
}

export function getSessionFromRequest(req: Request): SessionUser | null {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);

  const cookieName = process.env.COOKIE_NAME || "session";
  const token = cookies[cookieName];
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getSecret()) as any;

    const id = Number(payload.id ?? payload.userId ?? payload.user_id);
    if (!Number.isFinite(id)) return null;

    return {
      id,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }


}



export function setSessionCookie(res: NextResponse, token: string) {
  const cookieName = process.env.COOKIE_NAME || "session";

  const cookieDomain =
    process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined;

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

export function clearSessionCookie(res: NextResponse) {
  const cookieName = process.env.COOKIE_NAME || "session";

  const cookieDomain =
    process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined;

  res.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}


