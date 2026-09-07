import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
  listings,
  productBatches,
  productCatalog,
  listingDocuments,
  auditLogs
} from "@/lib/db/schema";
import { assertListingExpiry } from "@/modules/listings/listing-service";
import { isProvidedFile, uploadPrivateFile } from "@/lib/storage/blob-storage";
const schema = z.object({
  productName: z.string().trim().min(3).max(240),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitReferenceValue: z.coerce.number().positive().max(1000000)
});
export async function POST(
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
  if (!existing || !actor.organizationIds.includes(existing.sellerOrganizationId))
    return new Response(null, { status: 403 });
  if (existing.status !== "CHANGES_REQUESTED" || existing.quantityReserved > 0)
    return new Response(null, { status: 409 });
  const file = form.get("otherDocument");
  if (isProvidedFile(file) && file.size > 4_000_000) return new Response(null, { status: 413 });
  const upload = isProvidedFile(file)
    ? await uploadPrivateFile({ file, folder: "listing-evidence", kind: "other" })
    : null;
  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .for("update")
      .limit(1);
    if (!current || current.status !== "CHANGES_REQUESTED" || current.quantityReserved > 0)
      return false;
    const value = Math.round(input.data.unitReferenceValue * 100);
    await tx
      .update(productBatches)
      .set({
        expiryDate: input.data.expiryDate,
        totalQuantity: input.data.quantity,
        availableQuantity: input.data.quantity,
        unitReferenceValueKurus: value,
        notes: `İşletmenin ürün açıklaması: ${input.data.productName}`,
        updatedAt: new Date()
      })
      .where(eq(productBatches.id, current.batchId));
    const [batch] = await tx
      .select({ productId: productBatches.productId })
      .from(productBatches)
      .where(eq(productBatches.id, current.batchId))
      .limit(1);
    if (batch) {
      await tx
        .update(productCatalog)
        .set({ name: input.data.productName, updatedAt: new Date() })
        .where(eq(productCatalog.id, batch.productId));
    }
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
  });
  return NextResponse.json({ ok: result }, { status: result ? 200 : 409 });
}
