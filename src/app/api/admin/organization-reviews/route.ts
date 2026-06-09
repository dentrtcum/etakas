import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { organizationReviewInputSchema, parseOrganizationReviewFormData } from "@/modules/verification/review-input";
import { reviewOrganizationApplication } from "@/modules/verification/review-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed) {
    return NextResponse.json({ error: authorization.reason }, { status: authorization.reason === "UNAUTHENTICATED" ? 401 : 403 });
  }

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const input = contentType.includes("multipart/form-data")
      ? parseOrganizationReviewFormData(await request.formData())
      : organizationReviewInputSchema.parse(await request.json());
    const result = await reviewOrganizationApplication({
      actor,
      organizationId: input.organizationId,
      decision: input.decision,
      reason: input.reason
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_ORGANIZATION_REVIEW" }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Invalid organization review transition")) {
      return NextResponse.json({ error: "INVALID_ORGANIZATION_REVIEW_TRANSITION" }, { status: 409 });
    }

    throw error;
  }
}
