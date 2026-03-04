// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { loginSchema } from "@/src/server/modules/auth/auth.schemas";
import { login } from "@/src/server/modules/auth/auth.service";
import { setSessionCookie } from "@/src/server/shared/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const result = await login(data.email, data.password);

    const res = NextResponse.json({ ok: true, user: result.user });
    setSessionCookie(res, result.token);
    return res;
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}
