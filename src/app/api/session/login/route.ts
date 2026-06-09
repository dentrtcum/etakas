import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { setAppSessionCookie } from "@/lib/auth/app-session";
import { verifyPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/panel");

  const [user] = await getDb()
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(new URL("/giris?error=invalid", request.url), { status: 303 });
  }

  await setAppSessionCookie(user.id);
  redirect(next.startsWith("/") ? next : "/panel");
}
