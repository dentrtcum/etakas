import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { productCatalog } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const barcode = (await params).barcode.replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(barcode)) return NextResponse.json({ error: "INVALID_BARCODE" }, { status: 400 });
  const [product] = await getDb()
    .select({ id: productCatalog.id, name: productCatalog.name, gtin: productCatalog.gtin, type: productCatalog.type })
    .from(productCatalog)
    .where(eq(productCatalog.gtin, barcode))
    .limit(1);
  if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(product);
}
