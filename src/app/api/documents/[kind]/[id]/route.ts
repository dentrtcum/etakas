import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  organizationDocuments,
  listingDocuments,
  listingImages,
  listings,
  organizations,
  productBatches,
  productCatalog,
  auditLogs
} from "@/lib/db/schema";
import { randomUUID } from "node:crypto";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { requireRateLimit, securityErrorResponse } from "@/lib/security/request-guards";
import { serverEnv } from "@/lib/env";
import { z } from "zod";
import { assertMarketplaceVisibility } from "@/modules/marketplace/marketplace-policy";
import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";
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
  let document:
    | {
        storageKey: string;
        organizationId: string;
        scanStatus: string;
        listingStatus?: string;
        productType?: string;
      }
    | undefined;
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
  } else if (kind === "image") {
    [document] = await db
      .select({
        storageKey: listingImages.storageKey,
        organizationId: listings.sellerOrganizationId,
        scanStatus: listingImages.scanStatus,
        listingStatus: listings.status,
        productType: productCatalog.type
      })
      .from(listingImages)
      .innerJoin(listings, eq(listings.id, listingImages.listingId))
      .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
      .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
      .where(eq(listingImages.id, id))
      .limit(1);
  } else if (kind === "listing") {
    [document] = await db
      .select({
        storageKey: listingDocuments.storageKey,
        organizationId: listings.sellerOrganizationId,
        scanStatus: listingDocuments.scanStatus
      })
      .from(listingDocuments)
      .innerJoin(listings, eq(listings.id, listingDocuments.listingId))
      .where(eq(listingDocuments.id, id))
      .limit(1);
  }
  if (!document) return new Response(null, { status: 404 });
  const ownsDocument = requireOrganizationAccess(actor, document.organizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "INVENTORY_MANAGER",
    "ORDER_MANAGER",
    "VIEWER"
  ]).allowed;
  let canViewMarketplaceImage = false;
  if (
    kind === "image" &&
    document.listingStatus &&
    ["ACTIVE", "PARTIALLY_RESERVED", "SOLD_OUT"].includes(document.listingStatus) &&
    document.productType &&
    actor.organizationIds.length
  ) {
    const viewerOrganizations = await db
      .select({ type: organizations.type })
      .from(organizations)
      .where(
        and(inArray(organizations.id, actor.organizationIds), eq(organizations.status, "APPROVED"))
      );
    canViewMarketplaceImage = viewerOrganizations.some((viewer) => {
      try {
        assertMarketplaceVisibility({
          buyerType: viewer.type as OrganizationKind,
          productType: document!.productType as ProductKind
        });
        return true;
      } catch {
        return false;
      }
    });
  }
  if (!requireAdmin(actor).allowed && !ownsDocument && !canViewMarketplaceImage)
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
      "Content-Disposition": `${kind === "image" ? "inline" : "attachment"}; filename="belge-${id}"`,
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
