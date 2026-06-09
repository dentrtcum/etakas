import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { listingReviewInputSchema, parseListingReviewFormData } from "@/modules/listings/listing-review-input";
import { reviewListing } from "@/modules/listings/listing-review-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.reason },
      { status: authorization.reason === "UNAUTHENTICATED" ? 401 : 403 }
    );
  }

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const input = contentType.includes("multipart/form-data")
      ? parseListingReviewFormData(await request.formData())
      : listingReviewInputSchema.parse(await request.json());
    const result = await reviewListing({
      actor,
      listingId: input.listingId,
      decision: input.decision,
      reason: input.reason
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_LISTING_REVIEW" }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Invalid listing review transition")) {
      return NextResponse.json({ error: "INVALID_LISTING_REVIEW_TRANSITION" }, { status: 409 });
    }

    throw error;
  }
}
