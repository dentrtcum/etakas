import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { organizationDocuments, listingDocuments, listingImages, listings } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { kind, id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const db = getDb();
  let document: { storageKey: string; organizationId: string; scanStatus: string } | undefined;
  if (kind === "organization") {
    [document] = await db
      .select({
        storageKey: organizationDocuments.storageKey,
        organizationId: organizationDocuments.organizationId,
        scanStatus: organizationDocuments.scanStatus
      })
      .from(organizationDocuments)
      .where(eq(organizationDocuments.id, id))
      .limit(1);
  } else if (kind === "image" || kind === "listing") {
    const table = kind === "image" ? listingImages : listingDocuments;
    [document] = await db
      .select({
        storageKey: table.storageKey,
        organizationId: listings.sellerOrganizationId,
        scanStatus: table.scanStatus
      })
      .from(table)
      .innerJoin(listings, eq(listings.id, table.listingId))
      .where(eq(table.id, id))
      .limit(1);
  }
  if (!document) return new Response(null, { status: 404 });
  if (!requireAdmin(actor).allowed && !actor.organizationIds.includes(document.organizationId))
    return new Response(null, { status: 403 });
  if (["INFECTED", "REJECTED", "DELETED", "QUARANTINED"].includes(document.scanStatus))
    return new Response(null, { status: 403 });
  if (!serverEnv.BLOB_READ_WRITE_TOKEN)
    return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
  const result = await get(document.storageKey, {
    access: "private",
    token: serverEnv.BLOB_READ_WRITE_TOKEN
  });
  if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `attachment; filename="belge-${id}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
