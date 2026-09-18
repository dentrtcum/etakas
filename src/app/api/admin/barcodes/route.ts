import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import { auditLogs, productCatalog } from "@/lib/db/schema";
import { mutationRoute } from "@/lib/http/mutation";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPSERT"),
    productId: z.string().uuid().optional(),
    gtin: z.string().trim().regex(/^\d{8,14}$/),
    name: z.string().trim().min(3).max(240),
    type: z.enum(["HUMAN", "VETERINARY"]),
    activeIngredient: z.string().trim().max(240).optional(),
    manufacturer: z.string().trim().max(180).optional(),
    strength: z.string().trim().max(120).optional(),
    form: z.string().trim().max(120).optional(),
    isActive: z.preprocess((value) => value === true || value === "true", z.boolean()).default(true)
  }),
  z.object({ action: z.literal("DELETE"), productId: z.string().uuid(), reason: z.string().trim().min(10).max(1000) })
]);

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const db = getDb();
    if (input.action === "DELETE") {
      const [updated] = await db.update(productCatalog).set({ isActive: false, updatedAt: new Date() }).where(eq(productCatalog.id, input.productId)).returning({ id: productCatalog.id });
      if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      await db.insert(auditLogs).values({ actorUserId: actor.id, action: "PRODUCT_CATALOG_DISABLED", targetType: "product_catalog", targetId: input.productId, correlationId: randomUUID(), reason: input.reason });
      return NextResponse.json(updated);
    }
    const values = {
      gtin: input.gtin,
      name: input.name,
      type: input.type,
      activeIngredient: input.activeIngredient || null,
      manufacturer: input.manufacturer || null,
      strength: input.strength || null,
      form: input.form || null,
      isActive: input.isActive,
      updatedAt: new Date()
    };
    const [saved] = input.productId
      ? await db.update(productCatalog).set(values).where(eq(productCatalog.id, input.productId)).returning()
      : await db.insert(productCatalog).values({ ...values, controlCategory: "STANDARD" }).returning();
    if (!saved) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await db.insert(auditLogs).values({ actorUserId: actor.id, action: input.productId ? "PRODUCT_CATALOG_UPDATED" : "PRODUCT_CATALOG_CREATED", targetType: "product_catalog", targetId: saved.id, safeAfter: { gtin: saved.gtin, name: saved.name, type: saved.type, isActive: saved.isActive }, correlationId: randomUUID(), reason: "Super admin managed barcode catalog." });
    return NextResponse.json(saved, { status: input.productId ? 200 : 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_CATALOG_ITEM" }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "BARCODE_ALREADY_EXISTS" }, { status: 409 });
    throw error;
  }
}
export const POST = mutationRoute("src/app/api/admin/barcodes", handlePost);
