import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { productCatalog, titckSkrsProducts } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const barcode = (await params).barcode.replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(barcode)) {
    return NextResponse.json({ error: "INVALID_BARCODE" }, { status: 400 });
  }

  const db = getDb();
  const [titckProduct] = await db
    .select({
      name: titckSkrsProducts.name,
      gtin: titckSkrsProducts.gtin,
      activeIngredient: titckSkrsProducts.atcName,
      atcCode: titckSkrsProducts.atcCode,
      manufacturer: titckSkrsProducts.manufacturer,
      prescriptionType: titckSkrsProducts.prescriptionType,
      publishedAt: titckSkrsProducts.sourcePublishedAt
    })
    .from(titckSkrsProducts)
    .where(and(eq(titckSkrsProducts.gtin, barcode), eq(titckSkrsProducts.status, "Aktif")))
    .limit(1);

  if (titckProduct) {
    return NextResponse.json(
      { ...titckProduct, type: "HUMAN" as const, source: "TITCK" as const },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  }

  const [manualProduct] = await db
    .select({
      name: productCatalog.name,
      gtin: productCatalog.gtin,
      type: productCatalog.type,
      activeIngredient: productCatalog.activeIngredient,
      manufacturer: productCatalog.manufacturer,
      strength: productCatalog.strength,
      form: productCatalog.form
    })
    .from(productCatalog)
    .where(
      and(
        eq(productCatalog.gtin, barcode),
        eq(productCatalog.source, "MANUAL"),
        eq(productCatalog.isActive, true)
      )
    )
    .limit(1);

  if (!manualProduct) {
    return NextResponse.json(
      { found: false, manualEntryRequired: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json(
    { ...manualProduct, source: "MANUAL" as const },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
