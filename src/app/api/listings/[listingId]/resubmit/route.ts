import { mutationRoute } from "@/lib/http/mutation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
  listings,
  productBatches,
  organizations,
  listingDocuments,
  auditLogs
} from "@/lib/db/schema";
import { assertListingExpiry } from "@/modules/listings/listing-service";
import { cleanupUploads, isProvidedFile, uploadPrivateFile } from "@/lib/storage/blob-storage";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
const schema = z.object({
  productName: z.string().trim().min(3).max(240),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitReferenceValue: z.coerce.number().positive().max(1000000)
});
async function handlePost(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const actor = await getCurrentAppUser();
  if (!actor) return new Response(null, { status: 401 });
  const { listingId } = await params;
  if (!z.string().uuid().safeParse(listingId).success) return new Response(null, { status: 404 });
  const form = await request.formData();
  const input = schema.safeParse(Object.fromEntries(form));
  if (!input.success) return new Response(null, { status: 400 });
  try {
    assertListingExpiry(input.data.expiryDate);
  } catch {
    return new Response(null, { status: 400 });
  }
  const db = getDb();
  const [existing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (
    !existing ||
    !requireOrganizationAccess(actor, existing.sellerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "INVENTORY_MANAGER"
    ]).allowed
  )
    return new Response(null, { status: 403 });
  if (existing.status !== "CHANGES_REQUESTED" || existing.quantityReserved > 0)
    return new Response(null, { status: 409 });
  const file = form.get("otherDocument");
  if (isProvidedFile(file) && file.size > 4_000_000) return new Response(null, { status: 413 });
  const upload = isProvidedFile(file)
    ? await uploadPrivateFile({ file, folder: "listing-evidence", kind: "other" })
    : null;
  const result = await db
    .transaction(async (tx) => {
      await lockAccounting(tx);
      const [organization] = await tx
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, existing.sellerOrganizationId))
        .for("share")
        .limit(1);
      if (organization?.status !== "APPROVED") return false;
      const [current] = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .for("update")
        .limit(1);
      if (!current || current.status !== "CHANGES_REQUESTED" || current.quantityReserved > 0)
        return false;
      const [batch] = await tx
        .select()
        .from(productBatches)
        .where(eq(productBatches.id, current.batchId))
        .for("update")
        .limit(1);
      if (!batch || batch.transferredQuantity > 0 || batch.reservedQuantity > 0) return false;
      const value = Math.round(input.data.unitReferenceValue * 100);
      await tx
        .update(productBatches)
        .set({
          expiryDate: input.data.expiryDate,
          totalQuantity: input.data.quantity,
          availableQuantity: input.data.quantity,
          unitReferenceValueKurus: value,
          submittedName: input.data.productName,
          notes: `İşletmenin ürün açıklaması: ${input.data.productName}`,
          updatedAt: new Date()
        })
        .where(eq(productBatches.id, current.batchId));
      await tx
        .update(listings)
        .set({
          status: "PENDING_REVIEW",
          quantityAvailable: input.data.quantity,
          unitReferenceValueKurus: value,
          minExpiryDate: input.data.expiryDate,
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(listings.id, listingId));
      if (upload)
        await tx.insert(listingDocuments).values({
          listingId,
          kind: "other",
          storageKey: upload.storageKey,
          scanStatus: "UPLOADED"
        });
      await tx.insert(auditLogs).values({
        actorUserId: actor.id,
        organizationId: current.sellerOrganizationId,
        action: "LISTING_RESUBMITTED",
        targetType: "listing",
        targetId: listingId,
        correlationId: randomUUID()
      });
      return true;
    })
    .catch(async (error: unknown) => {
      if (upload) await cleanupUploads([upload]);
      throw error;
    });
  if (!result && upload) await cleanupUploads([upload]);
  return NextResponse.json({ ok: result }, { status: result ? 200 : 409 });
}

export const POST = mutationRoute("src/app/api/listings/[listingId]/resubmit", handlePost);
