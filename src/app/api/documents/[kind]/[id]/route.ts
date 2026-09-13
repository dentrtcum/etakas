import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  organizationDocuments,
  listingDocuments,
  listingImages,
  listings,
  auditLogs
} from "@/lib/db/schema";
import { randomUUID } from "node:crypto";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { requireRateLimit, securityErrorResponse } from "@/lib/security/request-guards";
import { serverEnv } from "@/lib/env";
import { z } from "zod";
export const runtime = "nodejs";
async function downloadDocument(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const actor = await getCurrentAppUser();
  if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  await requireRateLimit({
    request,
    action: "private-documents",
    identifier: actor.id,
    limit: 90,
    windowSeconds: 60
  });
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
  if (
    !requireAdmin(actor).allowed &&
    !requireOrganizationAccess(actor, document.organizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "INVENTORY_MANAGER",
      "ORDER_MANAGER",
      "VIEWER"
    ]).allowed
  )
    return new Response(null, { status: 404 });
  if (!["UPLOADED", "CLEAN"].includes(document.scanStatus))
    return new Response(null, { status: 403 });
  if (!serverEnv.BLOB_READ_WRITE_TOKEN)
    return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
  const result = await get(document.storageKey, {
    access: "private",
    token: serverEnv.BLOB_READ_WRITE_TOKEN
  });
  if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });
  await db.insert(auditLogs).values({
    actorUserId: actor.id,
    organizationId: document.organizationId,
    action: "PRIVATE_DOCUMENT_DOWNLOADED",
    targetType: kind,
    targetId: id,
    correlationId: randomUUID()
  });
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `attachment; filename="belge-${id}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox"
    }
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    return await downloadDocument(request, context);
  } catch (error) {
    return securityErrorResponse(error);
  }
}
