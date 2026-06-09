import { NextResponse, type NextRequest } from "next/server";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listMarketplaceListingsForOrganization } from "@/modules/marketplace/marketplace-queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const actor = await getCurrentAppUser();
  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: "ORGANIZATION_ID_REQUIRED" }, { status: 400 });
  }

  const authorization = requireOrganizationAccess(actor, organizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "ORDER_MANAGER",
    "VIEWER"
  ]);

  if (!authorization.allowed) {
    return NextResponse.json({ error: authorization.reason }, { status: 403 });
  }

  try {
    return NextResponse.json(await listMarketplaceListingsForOrganization(organizationId));
  } catch (error) {
    if (error instanceof Error && error.message.includes("approved organizations")) {
      return NextResponse.json({ error: "ORGANIZATION_NOT_APPROVED" }, { status: 403 });
    }

    throw error;
  }
}
