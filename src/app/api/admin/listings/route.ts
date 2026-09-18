import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  listingImages,
  listings,
  notifications,
  organizationMembers,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { mutationRoute } from "@/lib/http/mutation";
import { cleanupUploads, isProvidedFile, uploadPrivateFiles } from "@/lib/storage/blob-storage";
import { lockAccounting } from "@/modules/ledger/accounting-lock";

const schema = z.object({
  listingId: z.string().uuid(),
  productName: z.string().trim().min(3).max(240),
  barcode: z.string().trim().regex(/^\d{8,14}$/),
  productType: z.enum(["HUMAN", "VETERINARY"]),
  activeIngredient: z.string().trim().max(240).optional(),
  manufacturer: z.string().trim().max(180).optional(),
  strength: z.string().trim().max(120).optional(),
  form: z.string().trim().max(120).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantityAvailable: z.coerce.number().int().min(0).max(100000),
  unitReferenceValue: z.coerce.number().positive().max(1000000),
  storageConditions: z.string().trim().max(500).optional(),
  replaceImages: z.coerce.boolean().default(false),
  reason: z.string().trim().min(10).max(2000)
});

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const form = await request.formData();
  try {
    const input = schema.parse(Object.fromEntries(form));
    const evidence = [["medicineImage", "image"], ["packageImage", "package"]] as const;
    const provided = evidence.flatMap(([key, kind]) => {
      const file = form.get(key);
      return isProvidedFile(file) ? [{ kind, file }] : [];
    });
    const uploaded = await uploadPrivateFiles(provided, "listing-evidence");
    const oldFiles: { storageKey: string }[] = [];
    try {
      const result = await getDb().transaction(async (tx) => {
        await lockAccounting(tx);
        const [row] = await tx.select({ id: listings.id, batchId: listings.batchId, quantityReserved: listings.quantityReserved, productId: productBatches.productId, transferredQuantity: productBatches.transferredQuantity, sellerOrganizationId: listings.sellerOrganizationId }).from(listings).innerJoin(productBatches, eq(productBatches.id, listings.batchId)).where(eq(listings.id, input.listingId)).for("update").limit(1);
        if (!row) throw new Error("LISTING_NOT_FOUND");
        if (input.replaceImages) {
          oldFiles.push(...await tx.select({ storageKey: listingImages.storageKey }).from(listingImages).where(eq(listingImages.listingId, row.id)));
          await tx.delete(listingImages).where(eq(listingImages.listingId, row.id));
        }
        await tx.update(productCatalog).set({ name: input.productName, gtin: input.barcode, type: input.productType, activeIngredient: input.activeIngredient || null, manufacturer: input.manufacturer || null, strength: input.strength || null, form: input.form || null, updatedAt: new Date() }).where(eq(productCatalog.id, row.productId));
        await tx.update(productBatches).set({ submittedName: null, expiryDate: input.expiryDate, storageConditions: input.storageConditions || null, unitReferenceValueKurus: Math.round(input.unitReferenceValue * 100), availableQuantity: input.quantityAvailable, totalQuantity: sql`${input.quantityAvailable} + ${productBatches.reservedQuantity} + ${productBatches.transferredQuantity}`, updatedAt: new Date() }).where(eq(productBatches.id, row.batchId));
        await tx.update(listings).set({ quantityAvailable: input.quantityAvailable, unitReferenceValueKurus: Math.round(input.unitReferenceValue * 100), minExpiryDate: input.expiryDate, updatedAt: new Date() }).where(eq(listings.id, row.id));
        if (uploaded.length) await tx.insert(listingImages).values(uploaded.map((file) => ({ listingId: row.id, storageKey: file.storageKey, scanStatus: "UPLOADED" as const })));
        await tx.insert(auditLogs).values({ actorUserId: actor.id, organizationId: row.sellerOrganizationId, action: "LISTING_ADMIN_UPDATED", targetType: "listing", targetId: row.id, safeAfter: { productName: input.productName, barcode: input.barcode, expiryDate: input.expiryDate, quantityAvailable: input.quantityAvailable, unitReferenceValueKurus: Math.round(input.unitReferenceValue * 100), replacedImages: input.replaceImages }, correlationId: randomUUID(), reason: input.reason });
        const members = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.organizationId, row.sellerOrganizationId));
        if (members.length) await tx.insert(notifications).values(members.map(({ userId }) => ({ userId, organizationId: row.sellerOrganizationId, type: "ADMIN_DECISION", title: "İlanınız yönetici tarafından güncellendi", body: `İlan: ${input.productName}\nGerekçe: ${input.reason}` })));
        return { id: row.id };
      });
      await cleanupUploads(oldFiles);
      return NextResponse.json(result);
    } catch (error) {
      await cleanupUploads(uploaded);
      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_LISTING_UPDATE" }, { status: 400 });
    if (error instanceof Error && error.message === "LISTING_NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "BARCODE_ALREADY_EXISTS" }, { status: 409 });
    throw error;
  }
}
export const POST = mutationRoute("src/app/api/admin/listings", handlePost);
