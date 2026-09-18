import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import { auditLogs, notifications, organizationMembers, organizations } from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import { mutationRoute } from "@/lib/http/mutation";
import { SecurityError } from "@/lib/security/request-guards";

const schema = z.object({
  organizationId: z.string().uuid(),
  pharmacyName: z.string().trim().min(3).max(160),
  gln: z.string().trim().regex(/^\d{13}$/),
  reason: z.string().trim().min(10).max(2000)
});

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!serverEnv.ENCRYPTION_KEY) throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  try {
    const input = schema.parse(await request.json());
    const result = await getDb().transaction(async (tx) => {
      const [organization] = await tx.select({ id: organizations.id, publicAlias: organizations.publicAlias }).from(organizations).where(eq(organizations.id, input.organizationId)).for("update").limit(1);
      if (!organization) throw new SecurityError("ORGANIZATION_NOT_FOUND", 404);
      await tx.update(organizations).set({ publicAlias: input.pharmacyName, legalNameEncrypted: encryptField(input.pharmacyName, serverEnv.ENCRYPTION_KEY!), glnEncrypted: encryptField(input.gln, serverEnv.ENCRYPTION_KEY!), updatedAt: new Date() }).where(eq(organizations.id, input.organizationId));
      await tx.insert(auditLogs).values({ actorUserId: actor.id, organizationId: input.organizationId, action: "ORGANIZATION_IDENTITY_UPDATED", targetType: "organization", targetId: input.organizationId, safeBefore: { publicAlias: organization.publicAlias }, safeAfter: { publicAlias: input.pharmacyName, hasGln: true }, correlationId: randomUUID(), reason: input.reason });
      const members = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.organizationId, input.organizationId));
      if (members.length) await tx.insert(notifications).values(members.map(({ userId }) => ({ userId, organizationId: input.organizationId, type: "ADMIN_DECISION", title: "İşletme bilgileriniz güncellendi", body: `İşletme adı: ${input.pharmacyName}\nGerekçe: ${input.reason}` })));
      return { id: input.organizationId };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_ORGANIZATION_UPDATE" }, { status: 400 });
    throw error;
  }
}

export const POST = mutationRoute("src/app/api/admin/organizations", handlePost);
