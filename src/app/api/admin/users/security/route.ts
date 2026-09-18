import { NextResponse } from "next/server";
import { z } from "zod";
import { administerUserSecurity } from "@/lib/auth/admin-security";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { mutationRoute } from "@/lib/http/mutation";
import { SecurityError } from "@/lib/security/request-guards";
import { getDb } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
const schema = z.object({
  userId: z.uuid(),
  action: z.enum(["LOCK", "UNLOCK", "REVOKE_SESSIONS"]),
  reason: z.string().trim().min(10).max(1000)
});
export const runtime = "nodejs";
export const POST = mutationRoute(
  "admin-user-security",
  async (request) => {
    const actor = await getCurrentAppUser();
    if (!actor) throw new SecurityError("UNAUTHENTICATED", 401);
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new SecurityError("INVALID_REQUEST", 400);
    await administerUserSecurity(actor, request, parsed.data);
    await getDb().insert(notifications).values({
      userId: parsed.data.userId,
      type: "ADMIN_DECISION",
      title: "Hesap güvenliği işlemi",
      body: `İşlem: ${parsed.data.action}\nGerekçe: ${parsed.data.reason}`
    });
    return NextResponse.json({ ok: true });
  },
  10
);
