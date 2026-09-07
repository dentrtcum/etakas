import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { organizationDocuments, organizations, auditLogs } from "@/lib/db/schema";
import { isProvidedFile, uploadPrivateFile } from "@/lib/storage/blob-storage";
export const runtime = "nodejs";
const inputSchema = z.object({
  organizationId: z.string().uuid(),
  kind: z.enum([
    "license_document",
    "tax_plate",
    "owner_identity",
    "diploma",
    "chamber_registration",
    "signature_circular"
  ])
});
export async function POST(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const form = await request.formData();
  const parsed = inputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_DOCUMENT" }, { status: 400 });
  if (!actor.organizationIds.includes(parsed.data.organizationId))
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const file = form.get("document");
  if (!isProvidedFile(file))
    return NextResponse.json({ error: "DOCUMENT_REQUIRED" }, { status: 400 });
  if (file.size > 4_000_000) return new Response(null, { status: 413 });
  const upload = await uploadPrivateFile({
    file,
    folder: "organization-applications",
    kind: parsed.data.kind
  });
  await getDb().transaction(async (tx) => {
    await tx
      .insert(organizationDocuments)
      .values({ ...upload, ...parsed.data, scanStatus: "UPLOADED" });
    const [organization] = await tx
      .select({ status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, parsed.data.organizationId))
      .for("update")
      .limit(1);
    if (organization?.status === "ADDITIONAL_DOCUMENT_REQUIRED")
      await tx
        .update(organizations)
        .set({ status: "UNDER_REVIEW", updatedAt: new Date() })
        .where(eq(organizations.id, parsed.data.organizationId));
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: parsed.data.organizationId,
      action: "ORGANIZATION_DOCUMENT_ADDED",
      targetType: "organization",
      targetId: parsed.data.organizationId,
      correlationId: randomUUID(),
      safeAfter: { kind: parsed.data.kind }
    });
  });
  return NextResponse.json({ ok: true });
}
