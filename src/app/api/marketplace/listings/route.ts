import { NextResponse, type NextRequest } from "next/server";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listMarketplaceListingsForOrganization } from "@/modules/marketplace/marketplace-queries";
import { z } from "zod";
import { requireRateLimit, securityErrorResponse } from "@/lib/security/request-guards";
import { readPage } from "@/modules/organizations/account-queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const actor = await getCurrentAppUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId");

    if (!actor) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (!z.string().uuid().safeParse(organizationId).success) {
      return NextResponse.json({ error: "ORGANIZATION_ID_REQUIRED" }, { status: 400 });
    }

    const authorization = requireOrganizationAccess(actor, organizationId!, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER",
      "INVENTORY_MANAGER",
      "VIEWER"
    ]);

    if (!authorization.allowed) {
      return NextResponse.json({ error: authorization.reason }, { status: 403 });
    }

    try {
      await requireRateLimit({ request, action: "marketplace-read", limit: 90, windowSeconds: 60 });
      return NextResponse.json(
        await listMarketplaceListingsForOrganization(
          organizationId!,
          { search: request.nextUrl.searchParams.get("search") || "" },
          readPage(request.nextUrl.searchParams.get("page") || undefined)
        ),
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("approved organizations")) {
        return NextResponse.json({ error: "ORGANIZATION_NOT_APPROVED" }, { status: 403 });
      }

      return securityErrorResponse(error);
    }
  } catch (error) {
    return securityErrorResponse(error);
  }
}
