import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { requestPasswordReset } from "@/lib/auth/challenges";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { notifications, users } from "@/lib/db/schema";
import { mutationRoute } from "@/lib/http/mutation";
import { requireRateLimit, SecurityError } from "@/lib/security/request-guards";
const schema = z.object({ userId: z.uuid(), reason: z.string().trim().min(10).max(1000) });
export const runtime = "nodejs";
export const POST = mutationRoute(
  "admin-password-reset",
  async (request) => {
    const actor = await getCurrentAppUser();
    if (!actor || !requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new SecurityError("INVALID_REQUEST", 400);
    const [user] = await getDb()
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .limit(1);
    if (!user) throw new SecurityError("USER_NOT_FOUND", 404);
    await requireRateLimit({
      request,
      action: "admin-reset-recipient",
      identifier: user.email,
      limit: 3,
      windowSeconds: 1800
    });
    await requestPasswordReset(request, user.email, { ...actor, reason: parsed.data.reason });
    await getDb().insert(notifications).values({
      userId: parsed.data.userId,
      type: "ADMIN_DECISION",
      title: "Parola yenileme işlemi başlatıldı",
      body: `Yönetici hesabınız için parola yenileme bağlantısı gönderdi.\nGerekçe: ${parsed.data.reason}`
    });
    return NextResponse.json({ ok: true });
  },
  10
);
