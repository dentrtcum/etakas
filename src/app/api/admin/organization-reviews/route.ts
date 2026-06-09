import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { reviewOrganizationApplication } from "@/modules/verification/review-service";

export const runtime = "nodejs";

const reviewSchema = z.object({
  organizationId: z.string().uuid(),
  decision: z.enum([
    "START_REVIEW",
    "REQUEST_ADDITIONAL_DOCUMENT",
    "APPROVE",
    "REJECT",
    "SUSPEND",
    "REOPEN_REVIEW",
    "CLOSE"
  ]),
  reason: z.string().min(10)
});

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
    const input = reviewSchema.parse(await request.json());
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
